"""
Feature Gateway — Scans features/ directory, reads manifests,
provides the registry of installed plugin features.
"""
import json
import os
import re
from pathlib import Path
from typing import Optional

# Features directory at project root
FEATURES_DIR = Path(__file__).parent.parent / "features"
SANDBOX_DIR = Path(__file__).parent / "sandbox_workspace"

# Reserved routes that features cannot use
RESERVED_ROUTES = {"/", "/contacts", "/pipeline", "/settings"}


def ensure_dirs():
    """Create features/ and sandbox workspace if they don't exist."""
    FEATURES_DIR.mkdir(exist_ok=True)
    SANDBOX_DIR.mkdir(exist_ok=True)


def slugify(name: str) -> str:
    """Convert a feature name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def get_all_manifests() -> list[dict]:
    """Scan features/ directory and return all valid manifests."""
    ensure_dirs()
    manifests = []

    for entry in sorted(FEATURES_DIR.iterdir()):
        if not entry.is_dir():
            continue
        manifest_path = entry / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            manifest["_slug"] = entry.name
            manifests.append(manifest)
        except (json.JSONDecodeError, IOError):
            continue

    manifests.sort(key=lambda m: m.get("sidebarEntry", {}).get("order", 999))
    return manifests


def get_manifest(slug: str) -> Optional[dict]:
    """Get a single feature manifest by slug."""
    manifest_path = FEATURES_DIR / slug / "manifest.json"
    if not manifest_path.exists():
        return None
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        manifest["_slug"] = slug
        return manifest
    except (json.JSONDecodeError, IOError):
        return None


def get_component_code(slug: str) -> Optional[str]:
    """Read the component source code for a feature."""
    manifest = get_manifest(slug)
    if not manifest:
        return None
    feature_dir = FEATURES_DIR / slug
    component_file = feature_dir / manifest.get("component", "component.jsx")
    if not component_file.exists():
        return None
    with open(component_file, "r", encoding="utf-8") as f:
        return f.read()


def get_metadata(slug: str) -> Optional[dict]:
    """Read metadata for a feature."""
    metadata_path = FEATURES_DIR / slug / "metadata.json"
    if not metadata_path.exists():
        return None
    try:
        with open(metadata_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def check_route_conflict(route: str) -> Optional[str]:
    """Check if a route conflicts with existing routes. Returns error message or None."""
    if route in RESERVED_ROUTES:
        return f"Route '{route}' conflicts with a built-in page"
    for manifest in get_all_manifests():
        if manifest.get("route") == route:
            return f"Route '{route}' already used by feature '{manifest.get('name')}'"
    return None


def build_manifest(name: str, icon: str, description: str,
                   user_prompt: str, sidebar_order: int) -> dict:
    """Build a complete manifest.json from AI-generated metadata."""
    slug = slugify(name)
    return {
        "name": name,
        "slug": slug,
        "icon": icon,
        "description": description,
        "version": "1.0.0",
        "route": f"/feature/{slug}",
        "sidebarEntry": {
            "label": name,
            "icon": icon,
            "order": sidebar_order,
        },
        "component": "component.jsx",
        "apiEndpoints": [],
        "dataAccess": [],
    }


def build_metadata(feature_id: str, user_prompt: str, name: str,
                   created_at: str, attempts: int) -> dict:
    """Build metadata.json for a feature."""
    return {
        "id": feature_id,
        "userPrompt": user_prompt,
        "name": name,
        "createdAt": created_at,
        "attempts": attempts,
    }


def deploy_feature(slug: str, manifest: dict, component_code: str,
                   metadata: dict, test_results: dict = None):
    """Deploy a validated feature from sandbox to features/ directory."""
    ensure_dirs()
    feature_dir = FEATURES_DIR / slug
    feature_dir.mkdir(exist_ok=True)

    # Write manifest
    with open(feature_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    # Write component
    component_filename = manifest.get("component", "component.jsx")
    with open(feature_dir / component_filename, "w", encoding="utf-8") as f:
        f.write(component_code)

    # Write metadata
    with open(feature_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    # Write test results
    if test_results:
        tests_dir = feature_dir / "tests"
        tests_dir.mkdir(exist_ok=True)
        with open(tests_dir / "results.json", "w", encoding="utf-8") as f:
            json.dump(test_results, f, indent=2, ensure_ascii=False)
