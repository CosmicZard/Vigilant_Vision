import cv2
import numpy as np
import random
from pathlib import Path
from typing import Optional


class SyntheticVideoGenerator:
    """
    Generates realistic road surveillance test videos (.mp4) with accurate visual
    signatures for:
    - POTHOLE_DETECTED (Asphalt craters & depressions)
    - GARBAGE_DETECTED (Roadside trash piles & debris)
    - WATERLOGGING_DETECTED (Road water puddles, standing water, and flooding)
    - ALL_INCLUSIVE (Combined multi-hazard road scenario)
    """

    @staticmethod
    def generate_road_scenario(
        output_path: Path,
        duration_sec: int = 8,
        fps: int = 24,
        scenario_type: str = "all_inclusive"
    ) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        width, height = 960, 540
        total_frames = duration_sec * fps

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

        lane_x = [240, 360, 600, 720]
        vehicles = []

        # Moving vehicles
        num_veh = 4
        for i in range(num_veh):
            # Southbound (down: y increases)
            vehicles.append({
                "x": lane_x[0] if i % 2 == 0 else lane_x[1],
                "y": -80 - (i * 180),
                "w": 50,
                "h": 85,
                "vy": random.uniform(3.5, 5.0),
                "vx": 0,
                "color": (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200)),
            })
            # Northbound (up: y decreases)
            vehicles.append({
                "x": lane_x[2] if i % 2 == 0 else lane_x[3],
                "y": height + 80 + (i * 180),
                "w": 54,
                "h": 90,
                "vy": -random.uniform(3.8, 5.2),
                "vx": 0,
                "color": (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200)),
            })

        # Scenario Specific Ground Truth Anomalies
        potholes = []
        if scenario_type in ["potholes", "pothole", "all_inclusive"]:
            potholes.append({"x": 320, "y": 380, "r": 30, "w": 65, "h": 40})
            potholes.append({"x": 650, "y": 420, "r": 36, "w": 75, "h": 48})

        garbage_piles = []
        if scenario_type in ["garbage", "garbage_debris", "all_inclusive"]:
            garbage_piles.append({"x": 160, "y": 340, "w": 45, "h": 35, "color": (40, 160, 220)})  # yellow-red waste
            garbage_piles.append({"x": 780, "y": 400, "w": 55, "h": 40, "color": (220, 120, 60)})  # plastic debris

        water_puddles = []
        if scenario_type in ["waterlogging", "water_logging", "water", "all_inclusive"]:
            water_puddles.append({"x": 390, "y": 370, "w": 110, "h": 55})
            water_puddles.append({"x": 570, "y": 410, "w": 130, "h": 65})

        for f in range(total_frames):
            # Base Road Canvas (Daylight asphalt)
            frame = np.full((height, width, 3), (48, 52, 56), dtype=np.uint8)
            shoulder_color = (38, 75, 38)
            line_color = (0, 215, 255)

            # Road Shoulders
            cv2.rectangle(frame, (0, 0), (140, height), shoulder_color, -1)
            cv2.rectangle(frame, (width - 140, 0), (width, height), shoulder_color, -1)

            # Solid Edge Lines
            cv2.line(frame, (140, 0), (140, height), line_color, 4)
            cv2.line(frame, (width - 140, 0), (width - 140, height), line_color, 4)

            # Center Median Barrier
            cv2.line(frame, (475, 0), (475, height), (240, 240, 240), 3)
            cv2.line(frame, (485, 0), (485, height), (240, 240, 240), 3)

            # Dashed Lane Lines
            dash_offset = (f * 6) % 40
            for y_start in range(-40 + dash_offset, height, 40):
                cv2.line(frame, (300, y_start), (300, min(height, y_start + 20)), (200, 200, 200), 2)
                cv2.line(frame, (660, y_start), (660, min(height, y_start + 20)), (200, 200, 200), 2)

            # 1. Render Potholes (organic depression with depth contour)
            for pot in potholes:
                cv2.ellipse(frame, (pot["x"], pot["y"]), (pot["w"]//2, pot["h"]//2), 12, 0, 360, (14, 14, 16), -1)
                cv2.ellipse(frame, (pot["x"] + 2, pot["y"] + 2), (pot["w"]//2 - 4, pot["h"]//2 - 4), 12, 0, 360, (8, 8, 10), -1)
                cv2.ellipse(frame, (pot["x"], pot["y"]), (pot["w"]//2 + 2, pot["h"]//2 + 2), 12, 0, 360, (28, 30, 32), 2)

            # 2. Render Garbage & Litter Piles (textured colorful clusters on road shoulder)
            for g in garbage_piles:
                cv2.ellipse(frame, (g["x"], g["y"]), (g["w"]//2, g["h"]//2), 0, 0, 360, g["color"], -1)
                cv2.circle(frame, (g["x"] - 10, g["y"] + 4), 10, (240, 240, 240), -1)
                cv2.circle(frame, (g["x"] + 12, g["y"] - 3), 8, (40, 180, 50), -1)
                cv2.rectangle(frame, (g["x"] - 14, g["y"] - 12), (g["x"] + 6, g["y"] - 2), (30, 30, 200), -1)

            # 3. Render Waterlogging & Standing Water Puddles (liquid sheen with specular reflections)
            for wtr in water_puddles:
                # Wet dark perimeter
                cv2.ellipse(frame, (wtr["x"], wtr["y"]), (wtr["w"]//2 + 6, wtr["h"]//2 + 4), 0, 0, 360, (30, 34, 38), -1)
                # Water puddle surface (reflective sky sheen & blue-gray water tint)
                cv2.ellipse(frame, (wtr["x"], wtr["y"]), (wtr["w"]//2, wtr["h"]//2), 0, 0, 360, (140, 120, 80), -1)
                # Specular light highlight ripple
                ripple_offset = int(np.sin(f * 0.3) * 3)
                cv2.ellipse(frame, (wtr["x"] - 12, wtr["y"] - 6 + ripple_offset), (wtr["w"]//3, wtr["h"]//4), -10, 0, 360, (210, 195, 170), -1)
                cv2.ellipse(frame, (wtr["x"] + 10, wtr["y"] + 4 - ripple_offset), (wtr["w"]//4, wtr["h"]//5), 5, 0, 360, (180, 160, 130), -1)

            # 4. Render Moving Vehicles
            for v in vehicles:
                v["y"] += v["vy"]
                v["x"] += v["vx"]
                vx = int(v["x"])
                vy = int(v["y"])
                vw = v["w"]
                vh = v["h"]

                if v["vy"] > 0 and vy > height + 100:
                    v["y"] = -100
                elif v["vy"] < 0 and vy < -100:
                    v["y"] = height + 100

                if -100 < vy < height + 100:
                    # Vehicle Body
                    cv2.rectangle(frame, (vx - vw//2, vy - vh//2), (vx + vw//2, vy + vh//2), v["color"], -1)
                    # Windshield
                    ws_y = vy - 15 if v["vy"] > 0 else vy + 5
                    cv2.rectangle(frame, (vx - vw//2 + 5, ws_y), (vx + vw//2 - 5, ws_y + 12), (30, 40, 50), -1)

            # Top HUD Watermark
            scenario_title = scenario_type.upper().replace("_", " ")
            hud_text = f"IBVAP CIVIC ANALYTICS | SCENARIO: {scenario_title} | FRAME #{f:04d}"
            cv2.putText(frame, hud_text, (18, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (240, 240, 240), 1, cv2.LINE_AA)

            out.write(frame)

        out.release()
        return output_path
