import math
from typing import List, Dict, Any, Optional
from app.services.tracker import TrackedObject, compute_iou


class BehaviorAnalyzer:
    """
    Analyzes temporal trajectories and kinematic states of tracked objects to detect:
    - WRONG_WAY_DRIVING
    - RASH_DRIVING
    - POSSIBLE_COLLISION
    - POSSIBLE_HIT_AND_RUN
    """

    def __init__(self, default_flow_direction: float = 90.0):
        # default_flow_direction: 90 = top-to-bottom (+Y), 270 = bottom-to-top (-Y)
        self.default_flow_direction = default_flow_direction
        self.collision_pairs_cooldown = {}

    def analyze(self, tracks: List[TrackedObject], frame_num: int, timestamp: float) -> List[Dict[str, Any]]:
        anomalies = []
        vehicles = [t for t in tracks if t.class_name in ["car", "bus", "truck", "motorcycle"]]
        pedestrians = [t for t in tracks if t.class_name == "person"]

        # 1. WRONG_WAY_DRIVING & RASH_DRIVING Check for Vehicles
        for v in vehicles:
            if len(v.history) >= 4 and v.speed > 25.0:
                # Check direction angle relative to flow
                angle_diff = abs(v.heading_angle - self.default_flow_direction)
                if angle_diff > 180:
                    angle_diff = 360 - angle_diff

                # Wrong-way if heading is opposite (e.g. > 130 degrees difference)
                if angle_diff > 130:
                    anomalies.append({
                        "event_type": "WRONG_WAY_DRIVING",
                        "severity": "HIGH",
                        "object_id": f"TRACK-{v.track_id}",
                        "object_type": v.class_name,
                        "bbox": v.bbox,
                        "description": f"Vehicle ({v.class_name}) traveling against designated lane direction ({int(v.heading_angle)}° vs expected {int(self.default_flow_direction)}°)",
                        "metadata": {
                            "speed": round(v.speed, 1),
                            "heading": round(v.heading_angle, 1),
                            "lane_flow": self.default_flow_direction
                        }
                    })

                # Rash driving: High lateral movement variance (swerving) or extreme speed
                if len(v.history) >= 8:
                    xs = [pt[0] for pt in list(v.history)[-8:]]
                    lateral_variance = np_variance(xs)
                    if lateral_variance > 350.0:  # High erratic swerving
                        anomalies.append({
                            "event_type": "RASH_DRIVING",
                            "severity": "HIGH",
                            "object_id": f"TRACK-{v.track_id}",
                            "object_type": v.class_name,
                            "bbox": v.bbox,
                            "description": f"Erratic swerving and dangerous maneuvers detected for {v.class_name}",
                            "metadata": {
                                "lateral_variance": round(lateral_variance, 1),
                                "speed": round(v.speed, 1)
                            }
                        })

        # 2. POSSIBLE_COLLISION: Two vehicles with high IoU / close proximity & converging trajectories
        for i in range(len(vehicles)):
            for j in range(i + 1, len(vehicles)):
                v1 = vehicles[i]
                v2 = vehicles[j]

                iou = compute_iou(v1.bbox, v2.bbox)
                c1 = v1.current_center
                c2 = v2.current_center
                dist = math.dist(c1, c2)

                # Overlapping boxes or distance very close relative to sizes
                min_dim = min(v1.bbox[2] - v1.bbox[0], v2.bbox[2] - v2.bbox[0])
                if (iou > 0.15 or dist < min_dim * 0.7) and (v1.speed > 10.0 or v2.speed > 10.0):
                    pair_key = tuple(sorted([v1.track_id, v2.track_id]))
                    if timestamp - self.collision_pairs_cooldown.get(pair_key, 0.0) > 4.0:
                        self.collision_pairs_cooldown[pair_key] = timestamp
                        
                        # Union bbox
                        u_bbox = [
                            min(v1.bbox[0], v2.bbox[0]),
                            min(v1.bbox[1], v2.bbox[1]),
                            max(v1.bbox[2], v2.bbox[2]),
                            max(v1.bbox[3], v2.bbox[3]),
                        ]

                        anomalies.append({
                            "event_type": "POSSIBLE_COLLISION",
                            "severity": "HIGH",
                            "object_id": f"PAIR-{v1.track_id}-{v2.track_id}",
                            "object_type": f"{v1.class_name}+{v2.class_name}",
                            "bbox": u_bbox,
                            "description": f"Possible collision between {v1.class_name} (ID {v1.track_id}) and {v2.class_name} (ID {v2.track_id})",
                            "metadata": {
                                "track_ids": [v1.track_id, v2.track_id],
                                "distance_px": round(dist, 1),
                                "iou": round(iou, 2)
                            }
                        })

        # 3. POSSIBLE_HIT_AND_RUN / PEDESTRIAN INCIDENT
        for p in pedestrians:
            for v in vehicles:
                iou = compute_iou(p.bbox, v.bbox)
                dist = math.dist(p.current_center, v.current_center)
                if iou > 0.05 or dist < 40:
                    if v.speed > 40.0:  # Vehicle speeding through pedestrian proximity
                        anomalies.append({
                            "event_type": "POSSIBLE_HIT_AND_RUN",
                            "severity": "CRITICAL",
                            "object_id": f"INCIDENT-{v.track_id}-{p.track_id}",
                            "object_type": "vehicle+pedestrian",
                            "bbox": [
                                min(v.bbox[0], p.bbox[0]),
                                min(v.bbox[1], p.bbox[1]),
                                max(v.bbox[2], p.bbox[2]),
                                max(v.bbox[3], p.bbox[3])
                            ],
                            "description": f"Critical vehicle-pedestrian proximity incident involving {v.class_name} at high speed",
                            "metadata": {
                                "vehicle_id": v.track_id,
                                "pedestrian_id": p.track_id,
                                "vehicle_speed": round(v.speed, 1)
                            }
                        })

        return anomalies


def np_variance(values: List[float]) -> float:
    if len(values) <= 1:
        return 0.0
    mean = sum(values) / len(values)
    return sum((x - mean) ** 2 for x in values) / len(values)
