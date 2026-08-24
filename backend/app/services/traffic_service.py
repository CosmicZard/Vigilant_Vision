from typing import List, Dict, Any, Tuple
from collections import Counter
from app.services.tracker import TrackedObject


class TrafficAnalyzer:
    """
    Computes traffic volume, vehicle class distributions, flow rate, and congestion level.
    """

    def __init__(self, congestion_threshold_medium: int = 5, congestion_threshold_heavy: int = 10, congestion_threshold_severe: int = 15):
        self.thresh_med = congestion_threshold_medium
        self.thresh_heavy = congestion_threshold_heavy
        self.thresh_severe = congestion_threshold_severe

    def analyze_traffic(self, tracks: List[TrackedObject], frame_h: int, frame_w: int) -> Dict[str, Any]:
        vehicle_tracks = [t for t in tracks if t.class_name in ["car", "bus", "truck", "motorcycle", "bicycle"]]
        vehicle_count = len(vehicle_tracks)

        # Class breakdown
        class_counts = Counter([t.class_name for t in vehicle_tracks])

        # Congestion classification
        if vehicle_count >= self.thresh_severe:
            congestion_level = "SEVERE"
        elif vehicle_count >= self.thresh_heavy:
            congestion_level = "HEAVY"
        elif vehicle_count >= self.thresh_med:
            congestion_level = "MODERATE"
        else:
            congestion_level = "LOW"

        # Average speed of vehicles
        speeds = [t.speed for t in vehicle_tracks if t.speed > 0]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0.0

        # Estimated flow rate (vehicles per minute approx based on speed and density)
        flow_rate = round(vehicle_count * 6.0, 1)

        # Road zone occupancy (percentage of frame covered by vehicles)
        total_vehicle_area = sum((t.bbox[2] - t.bbox[0]) * (t.bbox[3] - t.bbox[1]) for t in vehicle_tracks)
        frame_area = max(1, frame_h * frame_w)
        occupancy_ratio = min(1.0, total_vehicle_area / frame_area)

        return {
            "vehicle_count": vehicle_count,
            "congestion_level": congestion_level,
            "flow_rate": flow_rate,
            "avg_speed_px_s": round(avg_speed, 1),
            "occupancy_percentage": round(occupancy_ratio * 100, 1),
            "class_distribution": dict(class_counts)
        }
