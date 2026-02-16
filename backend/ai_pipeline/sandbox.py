"""
Sandbox — Runs real unit + integration tests on AI-generated features.

Writes component and manifest to a temp sandbox workspace, runs the
test_runner.js via Node.js subprocess, returns structured results.
"""
import subprocess
import os
import json
import shutil
from pathlib import Path

TEST_RUNNER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sandbox", "test_runner.js")
SANDBOX_DIR = Path(__file__).parent.parent / "sandbox_workspace"


def _ensure_sandbox():
    SANDBOX_DIR.mkdir(exist_ok=True)


def _get_existing_routes() -> list[str]:
    """Get routes already used by installed features."""
    from feature_gateway import get_all_manifests
    return [m.get("route", "") for m in get_all_manifests()]


async def run_sandbox_tests(component_code: str, manifest: dict) -> dict:
    """Run unit + integration tests on a feature in the sandbox.

    Returns:
    {
        "success": bool,
        "unitTests": { "passed": [...], "failed": [...] },
        "integrationTests": { "passed": [...], "failed": [...] },
        "errors": [...],
        "summary": str  # human-readable summary
    }
    """
    _ensure_sandbox()

    # Create sandbox workspace for this run
    sandbox_id = manifest.get("slug", "unknown")
    workspace = SANDBOX_DIR / sandbox_id
    if workspace.exists():
        shutil.rmtree(workspace)
    workspace.mkdir(parents=True)

    component_path = workspace / "component.jsx"
    manifest_path = workspace / "manifest.json"

    try:
        # Write files to sandbox
        with open(component_path, "w", encoding="utf-8") as f:
            f.write(component_code)
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False)

        existing_routes = json.dumps(_get_existing_routes())

        # Run test runner
        result = subprocess.run(
            ["node", TEST_RUNNER, str(component_path), str(manifest_path), existing_routes],
            capture_output=True,
            text=True,
            timeout=15,
            encoding="utf-8",
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip() or "Test runner crashed"
            return {
                "success": False,
                "unitTests": {"passed": [], "failed": []},
                "integrationTests": {"passed": [], "failed": []},
                "errors": [error_msg],
                "summary": f"Test runner error: {error_msg}",
            }

        try:
            output = json.loads(result.stdout.strip())
        except json.JSONDecodeError:
            return {
                "success": False,
                "unitTests": {"passed": [], "failed": []},
                "integrationTests": {"passed": [], "failed": []},
                "errors": [f"Invalid test output: {result.stdout[:200]}"],
                "summary": "Test runner returned invalid output",
            }

        # Build summary
        ut_pass = len(output.get("unitTests", {}).get("passed", []))
        ut_fail = len(output.get("unitTests", {}).get("failed", []))
        it_pass = len(output.get("integrationTests", {}).get("passed", []))
        it_fail = len(output.get("integrationTests", {}).get("failed", []))

        if output.get("success"):
            output["summary"] = (
                f"All tests passed: {ut_pass} unit, {it_pass} integration"
            )
        else:
            failures = []
            for t in output.get("unitTests", {}).get("failed", []):
                failures.append(f"[UNIT] {t['test']}: {t['reason']}")
            for t in output.get("integrationTests", {}).get("failed", []):
                failures.append(f"[INTEGRATION] {t['test']}: {t['reason']}")
            output["summary"] = (
                f"Failed: {ut_fail} unit, {it_fail} integration. "
                + "; ".join(failures)
            )

        return output

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "unitTests": {"passed": [], "failed": []},
            "integrationTests": {"passed": [], "failed": []},
            "errors": ["Test execution timed out (possible infinite loop)"],
            "summary": "Tests timed out",
        }
    except FileNotFoundError:
        return {
            "success": False,
            "unitTests": {"passed": [], "failed": []},
            "integrationTests": {"passed": [], "failed": []},
            "errors": ["Node.js not found — cannot run sandbox tests"],
            "summary": "Node.js not available",
        }
    except Exception as e:
        return {
            "success": False,
            "unitTests": {"passed": [], "failed": []},
            "integrationTests": {"passed": [], "failed": []},
            "errors": [str(e)],
            "summary": f"Sandbox error: {str(e)}",
        }
    finally:
        # Cleanup sandbox workspace
        if workspace.exists():
            shutil.rmtree(workspace, ignore_errors=True)
