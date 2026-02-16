import json
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()


async def generate_code(prompt: str) -> dict:
    """Call Claude API to generate the feature code.

    Returns dict with keys: name, icon, description, code
    """
    client = anthropic.AsyncAnthropic(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
    )

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    # Extract the text response
    response_text = message.content[0].text.strip()

    # Try to parse as JSON — handle markdown fences if present
    if response_text.startswith("```"):
        # Remove markdown code fences
        lines = response_text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        response_text = "\n".join(lines)

    result = json.loads(response_text)

    # Validate required fields
    required = ["name", "icon", "description", "code"]
    for field in required:
        if field not in result:
            raise ValueError(f"Missing required field: {field}")

    return result


async def fix_code(code: str, error: str, original_prompt: str) -> str:
    """Ask Claude to fix code that failed validation."""
    client = anthropic.AsyncAnthropic(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
    )

    fix_prompt = f"""The following React component code has an error. Fix it and return ONLY the corrected code.

## Original User Request
"{original_prompt}"

## Current Code
```javascript
{code}
```

## Error
{error}

## Rules
- Use React.createElement() instead of JSX
- Use exports.default = ComponentName at the end
- Do not use fetch, localStorage, eval, or dynamic imports
- The component must be self-contained with mock data
- Only import from: 'react', 'recharts'
- Card, Badge, Button are available via UIComponents parameter

Return ONLY the corrected JavaScript code, no markdown fences, no explanation."""

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": fix_prompt}],
    )

    fixed_code = message.content[0].text.strip()

    # Remove markdown fences if present
    if fixed_code.startswith("```"):
        lines = fixed_code.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        fixed_code = "\n".join(lines)

    return fixed_code
