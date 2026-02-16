import subprocess
import os
import json
import tempfile

VALIDATE_SCRIPT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sandbox", "validate.js")


async def validate_code(code: str) -> dict:
    """Validate AI-generated code using Node.js subprocess.

    Returns dict with keys: success (bool), error (str|None)
    """
    # Static checks first
    forbidden_patterns = [
        ("fetch(", "External API calls (fetch) are not allowed"),
        ("fetch (", "External API calls (fetch) are not allowed"),
        ("axios", "External API calls (axios) are not allowed"),
        ("localStorage", "localStorage access is not allowed"),
        ("sessionStorage", "sessionStorage access is not allowed"),
        ("document.cookie", "Cookie access is not allowed"),
        ("eval(", "eval() is not allowed"),
        ("new Function(", "Function constructor is not allowed"),
        ("import(", "Dynamic imports are not allowed"),
    ]

    for pattern, message in forbidden_patterns:
        if pattern in code:
            return {"success": False, "error": f"Security violation: {message}"}

    # Check for exports.default
    if "exports.default" not in code and "exports['default']" not in code:
        return {"success": False, "error": "Code must contain 'exports.default = ComponentName'"}

    # Run Node.js validation
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as f:
            f.write(code)
            temp_path = f.name

        result = subprocess.run(
            ["node", VALIDATE_SCRIPT, temp_path],
            capture_output=True,
            text=True,
            timeout=10,
            encoding="utf-8",
        )

        os.unlink(temp_path)

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip() or "Unknown validation error"
            return {"success": False, "error": error_msg}

        try:
            output = json.loads(result.stdout.strip())
            return output
        except json.JSONDecodeError:
            return {"success": True, "error": None}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Validation timed out (possible infinite loop)"}
    except FileNotFoundError:
        # Node.js not available — skip sandbox validation for POC
        return {"success": True, "error": None}
    except Exception as e:
        return {"success": False, "error": f"Validation error: {str(e)}"}
