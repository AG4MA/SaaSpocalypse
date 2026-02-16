import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import init_db, insert_feature, get_all_features, get_feature
from ai_pipeline.orchestrator import run_pipeline

app = FastAPI(title="MorphCRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ─── REST API ────────────────────────────────────────────────


class CreateFeatureRequest(BaseModel):
    prompt: str


@app.post("/api/features")
async def create_feature(req: CreateFeatureRequest):
    feature_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    await insert_feature({
        "id": feature_id,
        "name": "Generating...",
        "icon": "⏳",
        "description": "",
        "user_prompt": req.prompt,
        "code": "",
        "status": "generating",
        "attempts": 0,
        "created_at": created_at,
        "sidebar_order": 0,
    })

    return {"id": feature_id}


@app.get("/api/features")
async def list_features():
    features = await get_all_features()
    # Convert snake_case DB fields to camelCase for frontend
    return [
        {
            "id": f["id"],
            "name": f["name"],
            "icon": f["icon"],
            "description": f["description"],
            "userPrompt": f["user_prompt"],
            "code": f["code"],
            "status": f["status"],
            "attempts": f["attempts"],
            "createdAt": f["created_at"],
            "sidebarOrder": f["sidebar_order"],
        }
        for f in features
    ]


@app.get("/api/features/{feature_id}")
async def get_feature_detail(feature_id: str):
    feature = await get_feature(feature_id)
    if not feature:
        return {"error": "Feature not found"}, 404
    return {
        "id": feature["id"],
        "name": feature["name"],
        "icon": feature["icon"],
        "description": feature["description"],
        "userPrompt": feature["user_prompt"],
        "code": feature["code"],
        "status": feature["status"],
        "attempts": feature["attempts"],
        "createdAt": feature["created_at"],
        "sidebarOrder": feature["sidebar_order"],
    }


@app.get("/api/features/{feature_id}/code")
async def get_feature_code(feature_id: str):
    feature = await get_feature(feature_id)
    if not feature:
        return {"error": "Feature not found"}, 404
    return {"code": feature["code"]}


# ─── WebSocket ───────────────────────────────────────────────


@app.websocket("/ws/features/{feature_id}")
async def websocket_endpoint(websocket: WebSocket, feature_id: str):
    await websocket.accept()

    try:
        feature = await get_feature(feature_id)
        if not feature:
            await websocket.send_json({"type": "error", "message": "Feature not found"})
            await websocket.close()
            return

        # Run the AI pipeline with real-time progress updates
        await run_pipeline(
            feature_id=feature_id,
            user_prompt=feature["user_prompt"],
            created_at=feature["created_at"],
            ws=websocket,
        )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
