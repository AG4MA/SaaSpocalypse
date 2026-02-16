import json
import re
import sys
import os

# Add parent directory to path to import api_key_manager
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api_key_manager import get_api_key, has_api_key, get_provider, get_model


async def _call_anthropic(api_key: str, model: str, prompt: str, max_tokens: int = 8192) -> str:
    """Call Anthropic Claude API."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


async def _call_openai(api_key: str, model: str, prompt: str, max_tokens: int = 8192) -> str:
    """Call OpenAI API."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()


async def _call_google(api_key: str, model: str, prompt: str, max_tokens: int = 8192) -> str:
    """Call Google Gemini API."""
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    gen_model = genai.GenerativeModel(model)
    response = await gen_model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(max_output_tokens=max_tokens),
    )
    return response.text.strip()


async def _call_llm(prompt: str, max_tokens: int = 8192) -> str:
    """Call the configured LLM provider."""
    if not has_api_key():
        raise ValueError("API key not configured. Please set your API key first.")
    
    api_key = get_api_key()
    provider = get_provider()
    model = get_model()
    
    if not api_key:
        raise ValueError("Failed to retrieve API key.")
    if not provider:
        raise ValueError("No provider configured.")
    if not model:
        raise ValueError("No model configured.")
    
    print(f"[LLM] Calling {provider} model: {model}")
    
    if provider == "anthropic":
        return await _call_anthropic(api_key, model, prompt, max_tokens)
    elif provider == "openai":
        return await _call_openai(api_key, model, prompt, max_tokens)
    elif provider == "google":
        return await _call_google(api_key, model, prompt, max_tokens)
    else:
        raise ValueError(f"Unknown provider: {provider}")


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


def _sanitize_code(code: str) -> str:
    """Remove problematic patterns that LLMs often generate incorrectly.
    
    This fixes common issues:
    - Removes React declarations (React is passed as a parameter)
    - Removes ES6 import statements
    - Ensures exports.default is present
    """
    lines = code.split('\n')
    sanitized_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip React declarations - React is already provided as parameter
        if re.match(r"^(const|let|var)\s+React\s*=", stripped):
            continue
        if re.match(r"^import\s+React", stripped):
            continue
        if stripped == "import React from 'react';":
            continue
        if stripped == 'import React from "react";':
            continue
        if re.match(r"^const\s*\{\s*.*\}\s*=\s*require\s*\(\s*['\"]react['\"]\s*\)", stripped):
            # This is destructuring from require('react'), which is also wrong
            # The hooks should be destructured from React parameter: const { useState } = React;
            continue
        
        # Skip require('react') assignments
        if re.match(r"^(const|let|var)\s+\w+\s*=\s*require\s*\(\s*['\"]react['\"]\s*\)", stripped):
            continue
            
        sanitized_lines.append(line)
    
    code = '\n'.join(sanitized_lines)
    
    # Ensure exports.default exists - if not, try to add it
    if 'exports.default' not in code and 'exports[' not in code:
        # Try to find the main function declaration
        func_match = re.search(r'function\s+([A-Z][a-zA-Z0-9]*)\s*\(', code)
        if func_match:
            func_name = func_match.group(1)
            code = code.rstrip() + f'\n\nexports.default = {func_name};\n'
        else:
            # Try to find const ComponentName = ... pattern
            const_match = re.search(r'const\s+([A-Z][a-zA-Z0-9]*)\s*=', code)
            if const_match:
                func_name = const_match.group(1)
                code = code.rstrip() + f'\n\nexports.default = {func_name};\n'
    
    return code


async def generate_code(prompt: str) -> dict:
    """Call LLM API to generate the feature code.

    Returns dict with keys: name, icon, description, code
    """
    response_text = await _call_llm(prompt)
    result = _extract_json(response_text)

    # Validate required fields
    required = ["name", "icon", "description", "code"]
    for field in required:
        if field not in result:
            raise ValueError(f"Missing required field: {field}")

    # Sanitize the generated code
    result["code"] = _sanitize_code(result["code"])

    return result


async def fix_code(code: str, test_results: dict, original_prompt: str) -> str:
    """Ask LLM to fix code that failed sandbox tests.

    Args:
        code: The current (failing) component code
        test_results: Structured test results from sandbox runner
        original_prompt: The user's original feature request
    """
    # Format test failures
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

## CRITICAL RULES
1. DO NOT declare React! It's already available as a parameter. NO `const React = ...`, NO `import React`.
2. Destructure hooks directly from React: `const {{ useState, useEffect }} = React;`
3. Use React.createElement() instead of JSX
4. End with: `exports.default = ComponentName;`
5. UI components (Card, Badge, Button, Input, Modal, Table) are already global variables
6. Only use require() for 'recharts', NOT for 'react'
7. Do not use fetch, localStorage, eval, or dynamic imports
8. Do not access document or window directly

## Example of CORRECT code structure:
```javascript
const {{ useState, useMemo }} = React;
const {{ BarChart, Bar, XAxis, YAxis }} = require('recharts');

function MyComponent() {{
  const [data] = useState([...]);
  return React.createElement('div', null, ...);
}}

exports.default = MyComponent;
```

Return ONLY the corrected JavaScript code, no markdown fences, no explanation."""

    fixed_code = await _call_llm(fix_prompt)

    # Remove markdown fences if present
    fence_match = re.search(r"```(?:javascript|js)?\s*\n([\s\S]*?)\n```", fixed_code)
    if fence_match:
        fixed_code = fence_match.group(1).strip()
    elif fixed_code.startswith("```"):
        # If it starts with ```, strip all fences
        lines = fixed_code.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        fixed_code = "\n".join(lines).strip()

    # Sanitize the fixed code
    return _sanitize_code(fixed_code)
