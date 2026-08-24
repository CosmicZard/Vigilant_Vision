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
    - MISSING_TRAFFIC_LIGHT (Intersection with signal pole but missing light)
    - MISSING_SIGN_BOARD (Speed post with missing regulatory board)
    - MISSING_STREET_LIGHT_NIGHT (Nighttime road corridor with blackout zone)
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

        is_night = scenario_type in ["missing_street_light_night", "night"]

        lane_x = [240, 360, 600, 720]
        vehicles = []

        # Moving vehicles
        num_veh = 2 if is_night else 4
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
            garbage_piles.append({"x": 160, "y": 340, "w": 45, "h": 35, "color": (40, 160, 220)}) # yellow-red waste
            garbage_piles.append({"x": 780, "y": 400, "w": 55, "h": 40, "color": (220, 120, 60)}) # plastic debris

        for f in range(total_frames):
            # Base Road Canvas
            if is_night:
                frame = np.full((height, width, 3), (18, 20, 22), dtype=np.uint8) # Dark asphalt night
                shoulder_color = (12, 25, 12)
                line_color = (120, 120, 80)
            else:
                frame = np.full((height, width, 3), (48, 52, 56), dtype=np.uint8) # Daylight asphalt
                shoulder_color = (38, 75, 38)
                line_color = (0, 215, 255)

            # Road Shoulders
            cv2.rectangle(frame, (0, 0), (140, height), shoulder_color, -1)
            cv2.rectangle(frame, (width - 140, 0), (width, height), shoulder_color, -1)

            # Solid Edge Lines
            cv2.line(frame, (140, 0), (140, height), line_color, 4)
            cv2.line(frame, (width - 140, 0), (width - 140, height), line_color, 4)

            # Center Median Barrier
            median_color = (140, 140, 140) if is_night else (240, 240, 240)
            cv2.line(frame, (475, 0), (475, height), median_color, 3)
            cv2.line(frame, (485, 0), (485, height), median_color, 3)

            # Dashed Lane Lines
            dash_offset = (f * 6) % 40
            for y_start in range(-40 + dash_offset, height, 40):
                cv2.line(frame, (300, y_start), (300, min(height, y_start + 20)), (200, 200, 200) if not is_night else (100, 100, 100), 2)
                cv2.line(frame, (660, y_start), (660, min(height, y_start + 20)), (200, 200, 200) if not is_night else (100, 100, 100), 2)

            # 1. Render Potholes (organic depression with depth contour)
            for pot in potholes:
                # Outer shadow contour
                cv2.ellipse(frame, (pot["x"], pot["y"]), (pot["w"]//2, pot["h"]//2), 12, 0, 360, (14, 14, 16), -1)
                cv2.ellipse(frame, (pot["x"] + 2, pot["y"] + 2), (pot["w"]//2 - 4, pot["h"]//2 - 4), 12, 0, 360, (8, 8, 10), -1)
                # Cracked edge texture
                cv2.ellipse(frame, (pot["x"], pot["y"]), (pot["w"]//2 + 2, pot["h"]//2 + 2), 12, 0, 360, (28, 30, 32), 2)

            # 2. Render Garbage & Litter Piles (textured colorful clusters on road shoulder)
            for g in garbage_piles:
                # Waste bags & plastic debris cluster
                cv2.ellipse(frame, (g["x"], g["y"]), (g["w"]//2, g["h"]//2), 0, 0, 360, g["color"], -1)
                cv2.circle(frame, (g["x"] - 10, g["y"] + 4), 10, (240, 240, 240), -1) # white plastic bag
                cv2.circle(frame, (g["x"] + 12, g["y"] - 3), 8, (40, 180, 50), -1) # green bag
                cv2.rectangle(frame, (g["x"] - 14, g["y"] - 12), (g["x"] + 6, g["y"] - 2), (30, 30, 200), -1) # cardboard

            # 3. Render Infrastructure Posts (Traffic signal post & Speed sign post)
            # Left Speed Sign Post (Missing sign board demonstration)
            cv2.line(frame, (90, 160), (90, 320), (160, 160, 160), 6) # Pole
            cv2.rectangle(frame, (82, 150), (98, 160), (100, 100, 100), -1) # Empty sign mount bracket without sign!
            cv2.putText(frame, "[POST 1]", (60, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

            # Right Intersection Signal Pole (Missing traffic light head demonstration)
            cv2.line(frame, (860, 120), (860, 340), (120, 120, 120), 8) # Mast arm pole
            cv2.line(frame, (760, 120), (860, 120), (120, 120, 120), 6) # Horizontal arm without light head!
            cv2.putText(frame, "[JUNCTION 4A]", (760, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

            # 4. Nighttime Streetlight Illumination Simulation
            if is_night:
                # Streetlight 1 cone (Left top)
                light_mask = np.zeros((height, width), dtype=np.uint8)
                cv2.circle(light_mask, (250, 140), 180, 120, -1)
                # Streetlight 3 cone (Right bottom)
                cv2.circle(light_mask, (700, 420), 180, 110, -1)
                # Notice: Center sector (X: 380 - 580) is completely unlit (BLACKOUT / MISSING STREETLIGHT)!

                # Blend light cones onto frame
                light_bgr = cv2.cvtColor(light_mask, cv2.COLOR_GRAY2BGR)
                frame = cv2.add(frame, (light_bgr * 0.45).astype(np.uint8))

            # 5. Render Moving Vehicles with Headlights
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

                    # Vehicle Headlights / Taillights
                    if is_night:
                        # Headlight illumination beams
                        if v["vy"] > 0:
                            # Southbound beam down
                            cv2.circle(frame, (vx - vw//2 + 6, vy + vh//2), 6, (200, 255, 255), -1)
                            cv2.circle(frame, (vx + vw//2 - 6, vy + vh//2), 6, (200, 255, 255), -1)
                        else:
                            # Northbound tail red lights
                            cv2.circle(frame, (vx - vw//2 + 6, vy + vh//2), 5, (0, 0, 255), -1)
                            cv2.circle(frame, (vx + vw//2 - 6, vy + vh//2), 5, (0, 0, 255), -1)

            # Top HUD Watermark
            scenario_title = scenario_type.upper().replace("_", " ")
            hud_text = f"IBVAP CIVIC ANALYTICS | SCENARIO: {scenario_title} | FRAME #{f:04d}"
            cv2.putText(frame, hud_text, (18, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (240, 240, 240) if not is_night else (180, 180, 180), 1, cv2.LINE_AA)

            out.write(frame)

        out.release()
        return output_path
