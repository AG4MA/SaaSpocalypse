import json
import re
import anthropic
import os
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


def _get_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set. Create a .env file in the backend/ directory.")
    return anthropic.AsyncAnthropic(api_key=api_key)


def _extract_json(text: str) -> dict:
    """Extract JSON from a response that might have markdown fences or extra text."""
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block in markdown fences
    fence_match = re.search(r"```(?:json)?\s*\n([\s\S]*?)\n```", text)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find the first { ... } block
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from response:\n{text[:500]}")


async def generate_code(prompt: str) -> dict:
    """Call Claude API to generate the feature code.

    Returns dict with keys: name, icon, description, code
    """
    client = _get_client()

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()
    result = _extract_json(response_text)

    # Validate required fields
    required = ["name", "icon", "description", "code"]
    for field in required:
        if field not in result:
            raise ValueError(f"Missing required field: {field}")

    return result


async def fix_code(code: str, test_results: dict, original_prompt: str) -> str:
    """Ask Claude to fix code that failed sandbox tests.

    Args:
        code: The current (failing) component code
        test_results: Structured test results from sandbox runner
        original_prompt: The user's original feature request
    """
    client = _get_client()

    # Format test failures for Claude
    failures = []
    for t in test_results.get("unitTests", {}).get("failed", []):
        failures.append(f"- [UNIT TEST FAILED] {t['test']}: {t['reason']}")
    for t in test_results.get("integrationTests", {}).get("failed", []):
        failures.append(f"- [INTEGRATION TEST FAILED] {t['test']}: {t['reason']}")
    for e in test_results.get("errors", []):
        failures.append(f"- [ERROR] {e}")

    error_detail = "\n".join(failures) if failures else test_results.get("summary", "Unknown error")

    fix_prompt = f"""The following React component code failed sandbox testing. Fix it and return ONLY the corrected code.

## Original User Request
"{original_prompt}"

## Current Code
```javascript
{code}
```

## Test Failures
{error_detail}

## Rules
- Use React.createElement() instead of JSX
- Use exports.default = ComponentName at the end
- Do not use fetch, localStorage, eval, or dynamic imports
- Do not access document or window directly
- The component must be self-contained with mock data
- Only use require() for: 'react', 'recharts'
- Card, Badge, Button, Input, Modal, Table are available via UIComponents parameter

Return ONLY the corrected JavaScript code, no markdown fences, no explanation."""

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        messages=[{"role": "user", "content": fix_prompt}],
    )

    fixed_code = message.content[0].text.strip()

    # Remove markdown fences if present
    fence_match = re.search(r"```(?:javascript|js)?\s*\n([\s\S]*?)\n```", fixed_code)
    if fence_match:
        return fence_match.group(1).strip()

    # If it starts with ```, strip all fences
    if fixed_code.startswith("```"):
        lines = fixed_code.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        return "\n".join(lines).strip()

    return fixed_code
