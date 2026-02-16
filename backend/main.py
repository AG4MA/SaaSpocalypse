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
)


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
