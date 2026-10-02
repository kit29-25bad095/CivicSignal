import numpy as np
import math
from typing import List, Dict, Any, Tuple
from app.modules.clustering import haversine_km

class GeospatialEngine:
    """
    Step 7 — Geospatial Intelligence Module.
    Analyzes geographic dispersion, spatial concentration, hotspot clusters,
    and street/ward level density.
    """
    def __init__(self):
        pass

    def analyze_spatial_distribution(self, complaints: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates centroid, bounding coordinates, street concentrations,
        and geographic density.
        """
        valid_points = [
            c for c in complaints
            if c.get("latitude") is not None and c.get("longitude") is not None
        ]

        if not valid_points:
            return {
                "center_lat": 0.0,
                "center_lon": 0.0,
                "radius_km": 0.0,
                "affected_streets": [],
                "affected_streets_count": 0,
                "primary_ward": "Unknown",
                "ward_breakdown": {},
                "concentration_score": 0.0,
                "is_localized": False
            }

        lats = [c["latitude"] for c in valid_points]
        lons = [c["longitude"] for c in valid_points]

        center_lat = float(np.mean(lats))
        center_lon = float(np.mean(lons))

        # Max radius from centroid
        max_dist = 0.0
        for lat, lon in zip(lats, lons):
            d = haversine_km(center_lat, center_lon, lat, lon)
            if d > max_dist:
                max_dist = d

        # Affected streets
        street_counts = {}
        for c in valid_points:
            s = c.get("street")
            if s and s.strip():
                street_counts[s.strip()] = street_counts.get(s.strip(), 0) + 1
        
        affected_streets = sorted(street_counts.keys(), key=lambda s: street_counts[s], reverse=True)

        # Ward counts
        ward_counts = {}
        for c in valid_points:
            w = c.get("ward")
            if w:
                ward_counts[w] = ward_counts.get(w, 0) + 1
        primary_ward = max(ward_counts.items(), key=lambda x: x[1])[0] if ward_counts else "Unknown"

        # Concentration score: high when radius is small (< 1.5 km) and complaints are high (> 5)
        # Bounded between 0.0 and 1.0
        radius_factor = max(0.1, max_dist)
        # e.g., if radius is 0.5km, 1 / (1 + 0.5) = 0.67
        spread_tightness = 1.0 / (1.0 + radius_factor)
        volume_factor = min(1.0, len(valid_points) / 20.0)
        concentration_score = round(float(0.6 * spread_tightness + 0.4 * volume_factor), 3)

        return {
            "center_lat": round(center_lat, 6),
            "center_lon": round(center_lon, 6),
            "radius_km": round(max_dist, 3),
            "affected_streets": affected_streets,
            "affected_streets_count": len(affected_streets),
            "primary_ward": primary_ward,
            "ward_breakdown": ward_counts,
            "concentration_score": concentration_score,
            "is_localized": max_dist <= 2.5
        }

geospatial_engine = GeospatialEngine()
