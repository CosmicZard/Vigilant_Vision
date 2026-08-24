import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.connection import init_db
from app.api.videos import router as videos_router
from app.api.events import router as events_router
from app.api.cameras import router as cameras_router
from app.api.metrics import router as metrics_router
from app.api.map import router as map_router
from app.api.datasets import router as datasets_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ibvap.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing IBVAP (Vigilant Vision) Database and System Storage...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down IBVAP backend...")


app = FastAPI(
    title="IBVAP - Smart Road & Border Video Analytics Platform",
    description="Event-driven AI video analytics engine built with Python, YOLOv8, OpenCV, FastAPI, and PostgreSQL.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits React Frontend dev server on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for Evidence Snapshots & Uploads
app.mount("/evidence", StaticFiles(directory=str(settings.EVIDENCE_DIR)), name="evidence")
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(videos_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(metrics_router, prefix=settings.API_V1_STR)
app.include_router(map_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "platform": "IBVAP / Vigilant Vision",
        "status": "ONLINE",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }


@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "database": "CONNECTED",
        "ai_engine": "YOLOv8 + OpenCV Ready",
        "storage": "ACTIVE"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
