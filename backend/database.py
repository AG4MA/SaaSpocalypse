"""
Database — Tracks generation jobs only.
The source of truth for installed features is the filesystem (features/ directory).
The DB tracks: generation job ID, user prompt, status, and the resulting slug.
"""
import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "morphcrm.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    user_prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generating',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    sidebar_order INTEGER NOT NULL DEFAULT 0,
    slug TEXT NOT NULL DEFAULT ''
);
"""

# Migration: rename old table if it exists
MIGRATION = """
CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    user_prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generating',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    sidebar_order INTEGER NOT NULL DEFAULT 0,
    slug TEXT NOT NULL DEFAULT ''
);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        # Drop old features table if exists (clean slate for new architecture)
        await db.execute("DROP TABLE IF EXISTS features")
        await db.executescript(SCHEMA)
        await db.commit()


async def insert_feature(feature: dict):
    """Insert a new generation job."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO generation_jobs
               (id, name, icon, description, user_prompt, status, attempts, created_at, sidebar_order, slug)
               VALUES (:id, :name, :icon, :description, :user_prompt, :status, :attempts, :created_at, :sidebar_order, :slug)""",
            feature,
        )
        await db.commit()


async def update_feature(feature_id: str, updates: dict):
    """Update a generation job."""
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = feature_id
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE generation_jobs SET {set_clause} WHERE id = :id", updates)
        await db.commit()


async def get_feature(feature_id: str) -> dict | None:
    """Get a generation job by ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM generation_jobs WHERE id = ?", (feature_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_features_count() -> int:
    """Count generation jobs (for sidebar ordering)."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM generation_jobs")
        row = await cursor.fetchone()
        return row[0] if row else 0
