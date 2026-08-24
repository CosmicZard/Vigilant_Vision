import math
from typing import List, Dict, Any, Tuple, Optional
from collections import deque


def compute_iou(box1: List[int], box2: List[int]) -> float:
    """Compute Intersection over Union between two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection_area = max(0, x2 - x1) * max(0, y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - intersection_area

    if union_area <= 0:
        return 0.0
    return intersection_area / union_area


class TrackedObject:
    def __init__(self, track_id: int, class_name: str, bbox: List[int], frame_num: int, timestamp: float):
        self.track_id = track_id
        self.class_name = class_name
        self.bbox = bbox
        self.last_frame = frame_num
        self.last_timestamp = timestamp
        self.disappeared_count = 0
        
        # Center points history: [(cx, cy, timestamp)]
        cx = (bbox[0] + bbox[2]) // 2
        cy = (bbox[1] + bbox[3]) // 2
        self.history = deque(maxlen=30)
        self.history.append((cx, cy, timestamp))

        # Kinematic state
        self.velocity = (0.0, 0.0)  # (vx, vy) in px/sec
        self.speed = 0.0  # magnitude in px/sec
        self.heading_angle = 0.0  # degrees: 0 = right, 90 = down, 180 = left, 270 = up
        self.is_stationary = False
        self.stationary_duration = 0.0

    def update(self, bbox: List[int], frame_num: int, timestamp: float):
        self.bbox = bbox
        self.last_frame = frame_num
        self.disappeared_count = 0

        cx = (bbox[0] + bbox[2]) // 2
        cy = (bbox[1] + bbox[3]) // 2
        
        if len(self.history) > 0:
            last_cx, last_cy, last_ts = self.history[-1]
            dt = max(0.001, timestamp - last_ts)
            dx = cx - last_cx
            dy = cy - last_cy

            vx = dx / dt
            vy = dy / dt
            self.velocity = (vx, vy)
            self.speed = math.sqrt(vx**2 + vy**2)
            self.heading_angle = math.degrees(math.atan2(dy, dx)) % 360

            if self.speed < 15.0:  # Threshold for stationary
                self.stationary_duration += dt
                self.is_stationary = True
            else:
                self.stationary_duration = 0.0
                self.is_stationary = False

        self.history.append((cx, cy, timestamp))

    @property
    def current_center(self) -> Tuple[int, int]:
        return ((self.bbox[0] + self.bbox[2]) // 2, (self.bbox[1] + self.bbox[3]) // 2)


class CentroidTracker:
    """
    Real-time multi-object tracker using IoU and centroid association with trajectory history.
    """
    def __init__(self, max_disappeared: int = 15, iou_threshold: float = 0.3):
        self.next_track_id = 1
        self.objects: Dict[int, TrackedObject] = {}
        self.max_disappeared = max_disappeared
        self.iou_threshold = iou_threshold

    def update(self, detections: List[Dict[str, Any]], frame_num: int, timestamp: float) -> List[TrackedObject]:
        """
        Associate detections with existing tracks.
        """
        # If no tracks exist, register all detections as new tracks
        if len(self.objects) == 0:
            for det in detections:
                self._register(det["class_name"], det["bbox"], frame_num, timestamp)
            return list(self.objects.values())

        track_ids = list(self.objects.keys())
        active_tracks = [self.objects[tid] for tid in track_ids]

        if len(detections) == 0:
            for tid in track_ids:
                self.objects[tid].disappeared_count += 1
                if self.objects[tid].disappeared_count > self.max_disappeared:
                    del self.objects[tid]
            return list(self.objects.values())

        # Compute IoU matrix between existing tracks and new detections
        matched_detections = set()
        matched_tracks = set()

        for t_idx, track in enumerate(active_tracks):
            best_iou = 0.0
            best_d_idx = -1
            for d_idx, det in enumerate(detections):
                if d_idx in matched_detections:
                    continue
                # Optional class matching
                if track.class_name != det["class_name"]:
                    continue

                iou = compute_iou(track.bbox, det["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_d_idx = d_idx

            if best_iou >= self.iou_threshold and best_d_idx != -1:
                track.update(detections[best_d_idx]["bbox"], frame_num, timestamp)
                matched_tracks.add(track.track_id)
                matched_detections.add(best_d_idx)

        # Handle unmatched tracks
        for tid in track_ids:
            if tid not in matched_tracks:
                self.objects[tid].disappeared_count += 1
                if self.objects[tid].disappeared_count > self.max_disappeared:
                    del self.objects[tid]

        # Handle unmatched detections (new tracks)
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_detections:
                self._register(det["class_name"], det["bbox"], frame_num, timestamp)

        return list(self.objects.values())

    def _register(self, class_name: str, bbox: List[int], frame_num: int, timestamp: float):
        track = TrackedObject(self.next_track_id, class_name, bbox, frame_num, timestamp)
        self.objects[self.next_track_id] = track
        self.next_track_id += 1
        return track
