import asyncio
from fastapi import WebSocket

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from ai_pipeline.prompt_builder import build_prompt
from ai_pipeline.code_generator import generate_code, fix_code
from ai_pipeline.sandbox import validate_code
from database import insert_feature, update_feature, get_all_features, get_features_count

MAX_ATTEMPTS = 5


async def send_step(ws: WebSocket, step: str):
    """Send a progress step update via WebSocket."""
    try:
        await ws.send_json({"type": "step", "step": step})
    except Exception:
        pass


async def run_pipeline(feature_id: str, user_prompt: str, created_at: str, ws: WebSocket):
    """Execute the full AI feature generation pipeline.

    Steps:
    1. Analyze the request
    2. Design the architecture
    3. Generate code via LLM
    4. Test in sandbox
    5. Auto-fix loop if needed
    6. Deploy (save to DB)
    """
    try:
        # Step 1: Analyzing
        await send_step(ws, "analyzing")
        await asyncio.sleep(1.5)

        # Get existing feature names for context
        existing = await get_all_features()
        existing_names = [f["name"] for f in existing]

        # Step 2: Designing
        await send_step(ws, "designing")
        prompt = build_prompt(user_prompt, existing_names)
        await asyncio.sleep(1)

        # Step 3: Generating
        await send_step(ws, "generating")
        result = await generate_code(prompt)

        name = result["name"]
        icon = result["icon"]
        description = result["description"]
        code = result["code"]

        # Step 4: Testing
        attempts = 0
        while attempts < MAX_ATTEMPTS:
            attempts += 1
            await send_step(ws, "testing")

            validation = await validate_code(code)

            if validation["success"]:
                break

            # Step 4b: Fixing
            if attempts < MAX_ATTEMPTS:
                await send_step(ws, "fixing")
                code = await fix_code(code, validation["error"], user_prompt)
            else:
                # Max attempts reached
                await update_feature(feature_id, {
                    "status": "failed",
                    "attempts": attempts,
                })
                await ws.send_json({
                    "type": "error",
                    "message": "Could not create this feature after multiple attempts. Try rephrasing your request.",
                })
                return

        # Step 5: Deploy
        await send_step(ws, "ready")
        sidebar_order = await get_features_count()

        await update_feature(feature_id, {
            "name": name,
            "icon": icon,
            "description": description,
            "code": code,
            "status": "ready",
            "attempts": attempts,
            "sidebar_order": sidebar_order,
        })

        # Send complete message with full feature data
        feature = {
            "id": feature_id,
            "name": name,
            "icon": icon,
            "description": description,
            "userPrompt": user_prompt,
            "code": code,
            "status": "ready",
            "attempts": attempts,
            "createdAt": created_at,
            "sidebarOrder": sidebar_order,
        }

        await ws.send_json({"type": "complete", "feature": feature})

    except Exception as e:
        await update_feature(feature_id, {"status": "failed"})
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
