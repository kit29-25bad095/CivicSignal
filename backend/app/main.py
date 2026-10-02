from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import Base, engine
from app.routers import complaints, patterns, investigations, actions, outcomes, dashboard, audit
from app.seed_data import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("civicsignal")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    logger.info("Initializing CivicSignal schema...")
    Base.metadata.create_all(bind=engine)
    # Check seed data
    try:
        seed_database()
    except Exception as e:
        logger.error(f"Error during database startup seed: {e}")
    yield
    logger.info("CivicSignal backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="From Complaints to Collective Intelligence — Evidence-Backed Civic Pattern Discovery System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under API prefix
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(patterns.router, prefix=settings.API_V1_STR)
app.include_router(investigations.router, prefix=settings.API_V1_STR)
app.include_router(actions.router, prefix=settings.API_V1_STR)
app.include_router(outcomes.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "status": "operational",
        "api_docs": "/docs",
        "human_in_the_loop": True
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "civicsignal-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
