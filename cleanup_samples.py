import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database.connection import SessionLocal
from app.database.models import Video, Event, Detection, TrafficMetric
from app.config import settings

def clean_sample_videos():
    db = SessionLocal()
    print("=== Cleaning Up Sample / Synthetic Test Videos ===")

    # Query all synthetic / test videos
    sample_videos = db.query(Video).filter(
        (Video.source == "synthetic") | 
        (Video.video_id.like("SYN-%")) | 
        (Video.video_id.like("TEST-%")) |
        (Video.video_id.like("VID-TEST%"))
    ).all()

    print(f"Found {len(sample_videos)} sample test videos to remove.")

    for v in sample_videos:
        print(f"Deleting {v.video_id}: {v.filename}...")
        # Delete detections
        db.query(Detection).filter(Detection.video_id == v.video_id).delete()
        # Delete events
        db.query(Event).filter(Event.video_id == v.video_id).delete()
        # Delete traffic metrics
        db.query(TrafficMetric).filter(TrafficMetric.video_id == v.video_id).delete()
        # Delete video record
        db.delete(v)

        # Remove video file from datasets directory if present
        f_path = settings.DATASETS_DIR / v.filename
        if f_path.exists():
            try:
                f_path.unlink()
            except Exception as e:
                print(f"  Warning: could not delete file {f_path}: {e}")

    db.commit()
    db.close()

    # Also clean up generated dataset mp4 files that start with SYN- or test_
    for mp4 in settings.DATASETS_DIR.glob("*.mp4"):
        if mp4.name.startswith("SYN-") or mp4.name.startswith("test_"):
            try:
                mp4.unlink()
                print(f"Removed orphan dataset file: {mp4.name}")
            except Exception as e:
                pass

    print("=== Clean Up Complete! Remaining Videos in Library: ===")
    db = SessionLocal()
    remaining = db.query(Video).all()
    for r in remaining:
        print(f"  [Kept] {r.video_id}: {r.filename} ({r.source})")
    db.close()

if __name__ == "__main__":
    clean_sample_videos()
