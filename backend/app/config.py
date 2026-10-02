import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicSignal Intelligence Agent"
    TAGLINE: str = "From Complaints to Collective Intelligence"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civicsignal.db")
    
    # AI & Embeddings
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Similarity Thresholds (Configurable, as per specs)
    SIMILARITY_HIGH_THRESHOLD: float = float(os.getenv("SIMILARITY_HIGH_THRESHOLD", "0.90"))
    SIMILARITY_RELATED_THRESHOLD: float = float(os.getenv("SIMILARITY_RELATED_THRESHOLD", "0.75"))
    
    # Clustering Parameters (DBSCAN prototype)
    DBSCAN_EPS: float = float(os.getenv("DBSCAN_EPS", "0.32")) # 1 - cosine similarity
    DBSCAN_MIN_SAMPLES: int = int(os.getenv("DBSCAN_MIN_SAMPLES", "3"))
    
    # Pattern Thresholds
    MIN_COMPLAINTS_FOR_PATTERN: int = int(os.getenv("MIN_COMPLAINTS_FOR_PATTERN", "4"))
    SPIKE_RATIO_THRESHOLD: float = float(os.getenv("SPIKE_RATIO_THRESHOLD", "1.5"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicsignal-secret-key-change-in-production-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
