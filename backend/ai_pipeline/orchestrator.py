"""
Pipeline Orchestrator — Coordinates the full AI feature generation lifecycle.

Flow:
1. Analyze request (get context from installed features)
2. Design (build prompt with plugin contract)
3. Generate code via Claude API
4. Test in sandbox (real unit + integration tests)
5. Auto-fix loop if tests fail (max 5 attempts)
6. Deploy — write feature to features/ directory as a real plugin
"""
import asyncio
import os
import sys

from fastapi import WebSocket

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from ai_pipeline.prompt_builder import build_prompt
from ai_pipeline.code_generator import generate_code, fix_code
from ai_pipeline.sandbox import run_sandbox_tests
from feature_gateway import (
    get_all_manifests, build_manifest, build_metadata,
    deploy_feature, slugify, save_failed_generation,
)
from database import update_feature, get_features_count

MAX_ATTEMPTS = 5


async def send_step(ws: WebSocket, step: str, detail: dict = None):
    """Send a progress step update via WebSocket."""
    try:
        msg = {"type": "step", "step": step}
        if detail:
            msg["detail"] = detail
        await ws.send_json(msg)
    except Exception:
        pass


async def run_pipeline(feature_id: str, user_prompt: str, created_at: str, ws: WebSocket):
    """Execute the full AI feature generation pipeline."""
    try:
        # ─── Step 1: Analyzing ──────────────────────────────────
        await send_step(ws, "analyzing")
        print(f"[Pipeline] Starting generation for feature {feature_id}: '{user_prompt}'")

        # Get existing installed features from the gateway (filesystem)
        existing_manifests = get_all_manifests()
        print(f"[Pipeline] Context: {len(existing_manifests)} installed features")

        # ─── Step 2: Designing ──────────────────────────────────
        await send_step(ws, "designing")
        prompt = build_prompt(user_prompt, existing_manifests)

        # ─── Step 3: Generating ─────────────────────────────────
        await send_step(ws, "generating")
        print(f"[Pipeline] Calling Claude API...")
        result = await generate_code(prompt)

        name = result["name"]
        icon = result["icon"]
        description = result["description"]
        code = result["code"]
        slug = slugify(name)
        print(f"[Pipeline] Generated: '{name}' (slug: {slug}, {len(code)} chars)")

        # Build manifest for sandbox testing
        sidebar_order = await get_features_count() + len(existing_manifests)
        manifest = build_manifest(name, icon, description, user_prompt, sidebar_order)

        # ─── Step 4: Testing + Auto-fix loop ────────────────────
        attempt_count = 0
        last_test_results = None
        attempt_history = []  # Track all attempts for logging

        while attempt_count < MAX_ATTEMPTS:
            attempt_count += 1
            await send_step(ws, "testing", {"attempt": attempt_count})
            print(f"[Pipeline] Running sandbox tests (attempt {attempt_count}/{MAX_ATTEMPTS})...")

            test_results = await run_sandbox_tests(code, manifest)
            last_test_results = test_results
            
            # Track this attempt
            attempt_history.append({
                "attempt": attempt_count,
                "code": code,
                "test_results": test_results,
            })

            ut_passed = len(test_results.get("unitTests", {}).get("passed", []))
            ut_failed = len(test_results.get("unitTests", {}).get("failed", []))
            it_passed = len(test_results.get("integrationTests", {}).get("passed", []))
            it_failed = len(test_results.get("integrationTests", {}).get("failed", []))

            print(f"[Pipeline] Tests: {ut_passed} unit passed, {ut_failed} unit failed, "
                  f"{it_passed} integration passed, {it_failed} integration failed")

            if test_results["success"]:
                print(f"[Pipeline] All tests passed!")
                break

            print(f"[Pipeline] Tests failed: {test_results.get('summary', '')}")

            # Auto-fix
            if attempt_count < MAX_ATTEMPTS:
                await send_step(ws, "fixing", {"attempt": attempt_count})
                print(f"[Pipeline] Asking Claude to fix...")
                code = await fix_code(code, test_results, user_prompt)
            else:
                # Max attempts reached — save logs and fail
                save_failed_generation(slug, user_prompt, attempt_history)
                
                await update_feature(feature_id, {
                    "status": "failed",
                    "attempts": attempt_count,
                })
                await ws.send_json({
                    "type": "error",
                    "message": f"Could not create this feature after {MAX_ATTEMPTS} attempts. "
                               f"Last failure: {test_results.get('summary', 'Unknown')}",
                })
                print(f"[Pipeline] FAILED after {MAX_ATTEMPTS} attempts")
                return

        # ─── Step 5: Deploy ─────────────────────────────────────
        await send_step(ws, "ready")
        print(f"[Pipeline] Deploying '{name}' to features/{slug}/")

        # Build metadata
        metadata = build_metadata(feature_id, user_prompt, name, created_at, attempt_count)
        
        # Build generation log for debugging
        generation_log = [
            f"Feature: {name}",
            f"Slug: {slug}",
            f"User Prompt: {user_prompt}",
            f"Total Attempts: {attempt_count}",
            f"Final Code Length: {len(code)} chars",
        ]

        # Deploy to features/ directory (real files on disk)
        deploy_feature(slug, manifest, code, metadata, last_test_results, generation_log)

        # Update DB generation job as complete
        await update_feature(feature_id, {
            "name": name,
            "icon": icon,
            "description": description,
            "status": "ready",
            "attempts": attempt_count,
            "slug": slug,
        })

        print(f"[Pipeline] Deployed '{name}' -> features/{slug}/")
        print(f"[Pipeline]   - component.jsx ({len(code)} chars)")
        print(f"[Pipeline]   - manifest.json")
        print(f"[Pipeline]   - metadata.json")
        print(f"[Pipeline]   - tests/results.json")
        print(f"[Pipeline]   - generation.log")

        # Send complete message with manifest data (not code)
        feature_data = {
            "slug": slug,
            "name": name,
            "icon": icon,
            "description": description,
            "route": manifest["route"],
            "sidebarEntry": manifest["sidebarEntry"],
        }

        await ws.send_json({
            "type": "complete",
            "feature": feature_data,
            "testResults": last_test_results,
        })

    except Exception as e:
        print(f"[Pipeline] ERROR: {e}")
        import traceback
        traceback.print_exc()
        try:
            await update_feature(feature_id, {"status": "failed"})
        except Exception:
            pass
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
