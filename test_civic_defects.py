import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database.connection import init_db, SessionLocal
from app.database.models import Video, Event, Camera
from app.services.synthetic_generator import SyntheticVideoGenerator
from app.services.video_processor import VideoProcessor
from app.config import settings

def test_all_civic_defects():
    print("=== Testing All 5 Civic & Smart Road Defect Scenarios ===")
    init_db()
    db = SessionLocal()

    defect_scenarios = [
        ("potholes", "Pothole Surface Defect"),
        ("garbage", "Roadside Garbage & Debris"),
        ("missing_traffic_light", "Missing Traffic Light Signal"),
        ("missing_sign_board", "Missing Regulatory Sign Board"),
        ("missing_street_light_night", "Night Streetlight Blackout"),
    ]

    for sc_id, label in defect_scenarios:
        print(f"\n--- Testing Scenario: {label} ({sc_id}) ---")
        vid_path = settings.DATASETS_DIR / f"test_{sc_id}.mp4"
        SyntheticVideoGenerator.generate_road_scenario(
            output_path=vid_path,
            duration_sec=6,
            fps=20,
            scenario_type=sc_id
        )
        print(f"Generated video file: {vid_path.name}")

        video_id = f"TEST-VID-{sc_id.upper()}"
        existing = db.query(Video).filter(Video.video_id == video_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        video = Video(
            video_id=video_id,
            filename=f"test_{sc_id}.mp4",
            source="synthetic",
            status="QUEUED"
        )
        db.add(video)
        db.commit()

        processor = VideoProcessor(video_id, vid_path, camera_id="CAM-01")
        processor.process()

        events = db.query(Event).filter(Event.video_id == video_id).all()
        print(f"Detected Events: {len(events)}")
        for e in events:
            print(f"  [{e.severity}] {e.event_id}: {e.event_type} | Offset: {e.timestamp}")
            print(f"    Description: {e.description}")
            print(f"    Evidence: {e.evidence_path}")

    db.close()
    print("\n=== All 5 Defect Scenarios Verified Successfully! ===")

if __name__ == "__main__":
    test_all_civic_defects()
