import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import init_db, insert_feature, get_feature
from ai_pipeline.orchestrator import run_pipeline
from ai_pipeline.ux_agent import evaluate_ux
from feature_gateway import (
    get_all_manifests, get_manifest, get_component_code, get_metadata, ensure_dirs,
    delete_feature,
)
from api_key_manager import set_api_key, has_api_key, clear_api_key, get_provider, get_model, SUPPORTED_PROVIDERS, AVAILABLE_MODELS


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    ensure_dirs()
    yield


app = FastAPI(title="MorphCRM Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Feature Gateway API ──────────────────────────────────────


@app.get("/api/features")
async def list_features():
    """List all installed features from the features/ directory (gateway).

    Source of truth is the filesystem, not the database.
    """
    manifests = get_all_manifests()
    return [
        {
            "slug": m.get("slug", m.get("_slug", "")),
            "name": m.get("name", ""),
            "icon": m.get("icon", ""),
            "description": m.get("description", ""),
            "route": m.get("route", ""),
            "sidebarEntry": m.get("sidebarEntry", {}),
            "version": m.get("version", "1.0.0"),
        }
        for m in manifests
    ]


@app.get("/api/features/{slug}/manifest")
async def get_feature_manifest(slug: str):
    """Get the full manifest for a specific installed feature."""
    manifest = get_manifest(slug)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Feature '{slug}' not found")
    return manifest


@app.get("/api/features/{slug}/code")
async def get_feature_code(slug: str):
    """Get the component source code for a feature."""
    code = get_component_code(slug)
    if code is None:
        raise HTTPException(status_code=404, detail=f"Feature '{slug}' not found")
    return {"code": code}


@app.get("/api/features/{slug}/metadata")
async def get_feature_metadata(slug: str):
    """Get metadata (provenance info) for a feature."""
    meta = get_metadata(slug)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Feature '{slug}' not found")
    return meta


@app.delete("/api/features/{slug}")
async def remove_feature(slug: str):
    """Delete a feature from the system."""
    success = delete_feature(slug)
    if not success:
        raise HTTPException(status_code=404, detail=f"Feature '{slug}' not found")
    print(f"[API] Deleted feature: {slug}")
    return {"status": "deleted", "slug": slug}


# ─── Feature Generation API ───────────────────────────────────


class CreateFeatureRequest(BaseModel):
    prompt: str


@app.post("/api/features")
async def create_feature(req: CreateFeatureRequest):
    """Start generating a new AI feature.

    Creates a generation job in the DB and returns the job ID.
    The actual generation happens via the WebSocket endpoint.
    """
    feature_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    await insert_feature({
        "id": feature_id,
        "name": "Generating...",
        "icon": "",
        "description": "",
        "user_prompt": req.prompt,
        "status": "generating",
        "attempts": 0,
        "created_at": created_at,
        "sidebar_order": 0,
        "slug": "",
    })

    print(f"[API] Created generation job {feature_id} for prompt: '{req.prompt}'")
    return {"id": feature_id}


# ─── UX Agent ─────────────────────────────────────────────────


@app.get("/api/ux-evaluation")
async def ux_evaluation():
    """Evaluate the overall UI/UX quality of all installed AI features."""
    manifests = get_all_manifests()
    # Convert manifests to the format the UX agent expects
    features_for_eval = []
    for m in manifests:
        code = get_component_code(m.get("slug", m.get("_slug", "")))
        features_for_eval.append({
            "name": m.get("name", ""),
            "icon": m.get("icon", ""),
            "description": m.get("description", ""),
            "code": code or "",
        })
    result = await evaluate_ux(features_for_eval)
    return result


# ─── API Key Configuration ─────────────────────────────────────


class SetApiKeyRequest(BaseModel):
    api_key: str
    provider: str = "anthropic"  # anthropic, openai, google
    model: str = None  # Model ID, uses default if not specified


@app.get("/api/config/providers")
async def get_providers():
    """Get list of supported LLM providers and their available models."""
    return {
        "providers": [
            {
                "id": "anthropic",
                "name": "Anthropic",
                "keyPrefix": "sk-ant-",
                "models": AVAILABLE_MODELS["anthropic"],
            },
            {
                "id": "openai",
                "name": "OpenAI",
                "keyPrefix": "sk-",
                "models": AVAILABLE_MODELS["openai"],
            },
            {
                "id": "google",
                "name": "Google",
                "keyPrefix": "AI",
                "models": AVAILABLE_MODELS["google"],
            },
        ]
    }


@app.post("/api/config/api-key")
async def configure_api_key(req: SetApiKeyRequest):
    """Set the API key for the current session.
    
    The key is encrypted in memory and never persisted to disk.
    It will be automatically cleared when the server stops.
    """
    if not req.api_key or not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API key cannot be empty")
    
    if req.provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Supported: {', '.join(SUPPORTED_PROVIDERS)}")
    
    # Basic format validation per provider
    key = req.api_key.strip()
    if req.provider == "anthropic" and not key.startswith("sk-ant-"):
        raise HTTPException(status_code=400, detail="Anthropic API keys should start with 'sk-ant-'")
    if req.provider == "openai" and not key.startswith("sk-"):
        raise HTTPException(status_code=400, detail="OpenAI API keys should start with 'sk-'")
    if req.provider == "google" and not key.startswith("AI"):
        raise HTTPException(status_code=400, detail="Google API keys should start with 'AI'")
    
    # Validate model if specified
    model_id = req.model
    if model_id:
        valid_models = [m["id"] for m in AVAILABLE_MODELS.get(req.provider, [])]
        if model_id not in valid_models:
            raise HTTPException(status_code=400, detail=f"Invalid model for {req.provider}. Available: {', '.join(valid_models)}")
    
    success = set_api_key(req.api_key, req.provider, model_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to store API key")
    
    print(f"[CONFIG] API key configured for provider: {req.provider}, model: {get_model()}")
    return {"status": "configured", "provider": req.provider, "model": get_model(), "message": f"API key configured for {req.provider}"}


@app.get("/api/config/api-key/status")
async def get_api_key_status():
    """Check if an API key has been configured for this session.
    
    Never returns the actual key, only whether one is set and which provider/model.
    """
    return {"configured": has_api_key(), "provider": get_provider(), "model": get_model()}



@app.delete("/api/config/api-key")
async def remove_api_key():
    """Clear the API key from memory."""
    clear_api_key()
    print("[CONFIG] API key cleared from session")
    return {"status": "cleared", "message": "API key has been removed from this session"}


# ─── WebSocket ─────────────────────────────────────────────────


@app.websocket("/ws/features/{feature_id}")
async def websocket_endpoint(websocket: WebSocket, feature_id: str):
    await websocket.accept()

    try:
        feature = await get_feature(feature_id)
        if not feature:
            await websocket.send_json({"type": "error", "message": "Feature not found"})
            await websocket.close()
            return

        await run_pipeline(
            feature_id=feature_id,
            user_prompt=feature["user_prompt"],
            created_at=feature["created_at"],
            ws=websocket,
        )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
