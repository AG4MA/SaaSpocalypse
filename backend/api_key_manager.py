"""Secure API Key Manager - Session-based, encrypted storage.

The API key is:
- Never stored on disk
- Encrypted in memory using Fernet (AES-128)
- Automatically deleted when the process terminates
- Never sent back to the frontend
- A new encryption key is generated on each app start

Supported providers: anthropic, openai, google
"""

import atexit
from cryptography.fernet import Fernet
from typing import Optional, Literal
import threading

# Supported LLM providers
LLMProvider = Literal["anthropic", "openai", "google"]
SUPPORTED_PROVIDERS = ["anthropic", "openai", "google"]

# Available models per provider
AVAILABLE_MODELS = {
    "anthropic": [
        {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4 (Latest)", "default": True},
        {"id": "claude-opus-4-20250514", "name": "Claude Opus 4"},
        {"id": "claude-3-7-sonnet-20250219", "name": "Claude 3.7 Sonnet"},
        {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet"},
        {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku (Fast)"},
        {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
        {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
        {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
    ],
    "openai": [
        {"id": "gpt-4.1", "name": "GPT-4.1 (Latest)", "default": True},
        {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini"},
        {"id": "gpt-4.1-nano", "name": "GPT-4.1 Nano (Fastest)"},
        {"id": "gpt-4o", "name": "GPT-4o"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
        {"id": "o3", "name": "o3 (Reasoning)"},
        {"id": "o3-mini", "name": "o3 Mini"},
        {"id": "o1", "name": "o1 (Reasoning)"},
        {"id": "o1-mini", "name": "o1 Mini"},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
        {"id": "gpt-4", "name": "GPT-4"},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo (Legacy)"},
    ],
    "google": [
        {"id": "gemini-2.5-pro-preview-06-05", "name": "Gemini 2.5 Pro (Latest)", "default": True},
        {"id": "gemini-2.5-flash-preview-05-20", "name": "Gemini 2.5 Flash"},
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
        {"id": "gemini-2.0-flash-lite", "name": "Gemini 2.0 Flash Lite (Fast)"},
        {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
        {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash"},
        {"id": "gemini-1.5-flash-8b", "name": "Gemini 1.5 Flash 8B"},
    ],
}

# Thread-safe lock for API key operations
_lock = threading.Lock()

# Generate a new encryption key on each app start
# This key lives only in memory and is lost when the process ends
_encryption_key: bytes = Fernet.generate_key()
_fernet: Fernet = Fernet(_encryption_key)

# Encrypted API key storage (in memory only)
_encrypted_api_key: Optional[bytes] = None
_current_provider: Optional[LLMProvider] = None
_current_model: Optional[str] = None


def set_api_key(api_key: str, provider: LLMProvider = "anthropic", model: Optional[str] = None) -> bool:
    """Encrypt and store the API key in memory.
    
    Args:
        api_key: The plaintext API key to store
        provider: The LLM provider (anthropic, openai, google)
        model: The model ID to use (optional, uses default if not specified)
        
    Returns:
        True if successful
    """
    global _encrypted_api_key, _current_provider, _current_model
    
    if not api_key or not api_key.strip():
        return False
    
    if provider not in SUPPORTED_PROVIDERS:
        return False
    
    # If no model specified, use the default for this provider
    if not model:
        for m in AVAILABLE_MODELS.get(provider, []):
            if m.get("default"):
                model = m["id"]
                break
    
    with _lock:
        # Encrypt the API key
        _encrypted_api_key = _fernet.encrypt(api_key.encode('utf-8'))
        _current_provider = provider
        _current_model = model
    
    return True


def get_api_key() -> Optional[str]:
    """Retrieve and decrypt the API key.
    
    Returns:
        The decrypted API key, or None if not set
    """
    global _encrypted_api_key
    
    with _lock:
        if _encrypted_api_key is None:
            return None
        
        # Decrypt and return
        return _fernet.decrypt(_encrypted_api_key).decode('utf-8')


def get_provider() -> Optional[LLMProvider]:
    """Get the current LLM provider.
    
    Returns:
        The provider name, or None if not set
    """
    with _lock:
        return _current_provider


def get_model() -> Optional[str]:
    """Get the current model ID.
    
    Returns:
        The model ID, or None if not set
    """
    with _lock:
        return _current_model


def has_api_key() -> bool:
    """Check if an API key has been set.
    
    Returns:
        True if an API key is stored
    """
    with _lock:
        return _encrypted_api_key is not None


def clear_api_key() -> None:
    """Securely clear the API key from memory."""
    global _encrypted_api_key, _fernet, _encryption_key, _current_provider, _current_model
    
    with _lock:
        # Overwrite the encrypted key before clearing
        if _encrypted_api_key is not None:
            _encrypted_api_key = None
        _current_provider = None
        _current_model = None
        
        # Generate new encryption key (invalidates any old encrypted data)
        _encryption_key = Fernet.generate_key()
        _fernet = Fernet(_encryption_key)


def _cleanup_on_exit():
    """Called automatically when the process exits."""
    clear_api_key()


# Register cleanup handler
atexit.register(_cleanup_on_exit)
