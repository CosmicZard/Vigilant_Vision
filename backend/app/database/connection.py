import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
from app.database.models import Base, Camera

logger = logging.getLogger("ibvap.database")

# Handle SQLite vs PostgreSQL arguments
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_cameras(db: Session):
    """Seed standard road & border surveillance cameras if none exist."""
    existing = db.query(Camera).first()
    if existing:
        return
    
    cameras = [
        Camera(
            camera_id="CAM-01",
            name="North Corridor Mile 14",
            location="National Highway NH-44 Sector 2",
            latitude=28.6139,
            longitude=77.2090,
            stream_url="rtsp://demo-cam-01/live",
            status="ACTIVE",
            zone_type="HIGHWAY"
        ),
        Camera(
            camera_id="CAM-02",
            name="West Border Gate 4B",
            location="Border Security Sector Alpha",
            latitude=28.6280,
            longitude=77.2180,
            stream_url="rtsp://demo-cam-02/live",
            status="ACTIVE",
            zone_type="BORDER_CHECKPOINT"
        ),
        Camera(
            camera_id="CAM-03",
            name="Ring Road Expressway J3",
            location="Central Expressway Junction 3",
            latitude=28.5921,
            longitude=77.2295,
            stream_url="rtsp://demo-cam-03/live",
            status="ACTIVE",
            zone_type="URBAN_INTERSECTION"
        ),
        Camera(
            camera_id="CAM-04",
            name="Coastal Tollway Segment A",
            location="Coastal Expressway Toll Plaza 1",
            latitude=28.5700,
            longitude=77.2400,
            stream_url="rtsp://demo-cam-04/live",
            status="ACTIVE",
            zone_type="TOLL_GATE"
        ),
        Camera(
            camera_id="CAM-05",
            name="Eastern Freight Corridor Post 8",
            location="Heavy Vehicle Transit Bypass 8",
            latitude=28.6400,
            longitude=77.1950,
            stream_url="rtsp://demo-cam-05/live",
            status="ACTIVE",
            zone_type="HIGHWAY"
        )
    ]
    db.add_all(cameras)
    db.commit()
    logger.info("Successfully seeded default road & border surveillance cameras.")


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_cameras(db)
    finally:
        db.close()
