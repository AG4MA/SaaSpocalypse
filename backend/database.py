import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "morphcrm.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '⚡',
    description TEXT NOT NULL DEFAULT '',
    user_prompt TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'generating',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    sidebar_order INTEGER NOT NULL DEFAULT 0
);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def insert_feature(feature: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO features (id, name, icon, description, user_prompt, code, status, attempts, created_at, sidebar_order)
               VALUES (:id, :name, :icon, :description, :user_prompt, :code, :status, :attempts, :created_at, :sidebar_order)""",
            feature,
        )
        await db.commit()


async def update_feature(feature_id: str, updates: dict):
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = feature_id
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE features SET {set_clause} WHERE id = :id", updates)
        await db.commit()


async def get_feature(feature_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM features WHERE id = ?", (feature_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_all_features() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM features WHERE status = 'ready' ORDER BY sidebar_order"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_features_count() -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM features")
        row = await cursor.fetchone()
        return row[0] if row else 0
