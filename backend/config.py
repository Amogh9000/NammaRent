import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    APP_NAME: str = "Namma Tenant Navigator"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # LLM Settings
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # High capacity Llama-3 model for strict schema & reasoning
    GROQ_FALLBACK_MODEL: str = "llama-3.1-8b-instant"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]
    
    # Storage & Paths
    DATA_DIR: Path = BASE_DIR / "data"
    KB_DIR: Path = PROJECT_ROOT / "legal-knowledge-base"
    CHROMA_DIR: Path = BASE_DIR / "chroma_db"
    EXAMPLES_DIR: Path = PROJECT_ROOT / "examples"
    
    # Retrieval Confidence Threshold
    RELEVANCE_THRESHOLD: float = 0.35  # Cosine distance / similarity threshold

    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.KB_DIR.mkdir(parents=True, exist_ok=True)
settings.EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)
