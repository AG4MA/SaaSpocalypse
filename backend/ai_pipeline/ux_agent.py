import anthropic
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


async def evaluate_ux(features: list[dict]) -> dict:
    """Evaluate the overall UI/UX quality of installed AI features.

    Returns a structured evaluation with:
    - score (0-100)
    - summary
    - issues (list)
    - suggestions (list)
    """
    if not features:
        return {
            "score": 100,
            "summary": "No AI features installed yet. The base CRM is clean and consistent.",
            "issues": [],
            "suggestions": ["Try building your first feature to see the AI in action!"],
        }

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "score": -1,
            "summary": "Cannot evaluate — API key not configured.",
            "issues": [],
            "suggestions": [],
        }

    client = anthropic.AsyncAnthropic(api_key=api_key)

    features_description = "\n".join([
        f"- **{f['name']}** ({f['icon']}): {f['description']}\n  Prompt: \"{f['user_prompt']}\"\n  Code size: {len(f['code'])} chars, Attempts: {f['attempts']}"
        for f in features
    ])

    prompt = f"""You are a UI/UX evaluator for MorphCRM, a CRM application with a dark theme (bg: #0f0f17, surface: #1a1a2e, primary: #6366f1 indigo).

The CRM has 4 base pages: Dashboard, Contacts, Pipeline, Settings.
The user has installed {len(features)} AI-generated features:

{features_description}

Evaluate the overall UI/UX coherence considering:
1. Do the features overlap in functionality? (redundancy)
2. Is the sidebar getting cluttered?
3. Do the feature names and icons make sense together?
4. Is there a logical organization?
5. Could any features be merged or reorganized?

Respond with a JSON object:
{{
  "score": <0-100 integer>,
  "summary": "<1-2 sentence overall assessment>",
  "issues": ["<issue 1>", "<issue 2>", ...],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", ...]
}}

Respond ONLY with the JSON, no markdown fences."""

    try:
        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        import re
        text = message.content[0].text.strip()

        # Parse JSON from response
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
            return {
                "score": 50,
                "summary": "Could not parse evaluation. The AI response was unclear.",
                "issues": [],
                "suggestions": [],
            }

    except Exception as e:
        return {
            "score": -1,
            "summary": f"Evaluation failed: {str(e)}",
            "issues": [],
            "suggestions": [],
        }
