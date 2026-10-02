import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from typing import List, Dict, Any, Optional
from datetime import datetime
import math
from app.config import settings

def haversine_km(lat1, lon1, lat2, lon2):
    """Calculates geodesic distance between two points in km."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ClusteringEngine:
    """
    Step 5 — Clustering Engine.
    Uses DBSCAN on semantic embeddings with cosine distance metric.
    Designed with an extensible interface so HDBSCAN can be dropped in.
    Extracts rich cluster metadata (geo spread, temporal span, dominant category, representative complaints).
    """
    def __init__(self, eps: float = None, min_samples: int = None, algorithm: str = "DBSCAN"):
        self.eps = eps if eps is not None else settings.DBSCAN_EPS
        self.min_samples = min_samples if min_samples is not None else settings.DBSCAN_MIN_SAMPLES
        self.algorithm = algorithm

    def cluster_embeddings(
        self,
        embeddings: List[List[float]],
        complaint_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Executes DBSCAN clustering over embeddings.
        Returns list of structured cluster objects with metadata.
        """
        if len(embeddings) < self.min_samples:
            return []

        X = np.array(embeddings, dtype=np.float32)
        # Cosine distance = 1 - cosine similarity
        distance_matrix = cosine_distances(X, X)

        # DBSCAN clustering
        clusterer = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric="precomputed")
        labels = clusterer.fit_predict(distance_matrix)

        unique_labels = set(labels)
        clusters = []

        for label in sorted(unique_labels):
            if label == -1:
                # Noise cluster — ignore or keep as unclustered
                continue

            indices = np.where(labels == label)[0]
            member_complaints = [complaint_records[i] for i in indices]
            member_embeddings = X[indices]

            # Dominant Category
            cat_counts = {}
            for c in member_complaints:
                cat = c.get("category", "general")
                cat_counts[cat] = cat_counts.get(cat, 0) + 1
            dominant_category = max(cat_counts.items(), key=lambda x: x[1])[0]

            # Primary Ward
            ward_counts = {}
            for c in member_complaints:
                w = c.get("ward", "Unknown")
                ward_counts[w] = ward_counts.get(w, 0) + 1
            primary_ward = max(ward_counts.items(), key=lambda x: x[1])[0]

            # Average pairwise cosine similarity within cluster
            if len(indices) > 1:
                sub_dist = distance_matrix[np.ix_(indices, indices)]
                # cosine similarity = 1 - distance
                sub_sim = 1.0 - sub_dist
                # Average upper triangle excluding self-diagonal
                triu_indices = np.triu_indices(len(indices), k=1)
                avg_similarity = float(np.mean(sub_sim[triu_indices]))
            else:
                avg_similarity = 1.0

            # Geospatial Spread (center lat/lon, radius in km)
            lats = [c.get("latitude") for c in member_complaints if c.get("latitude") is not None]
            lons = [c.get("longitude") for c in member_complaints if c.get("longitude") is not None]
            center_lat = float(np.mean(lats)) if lats else 0.0
            center_lon = float(np.mean(lons)) if lons else 0.0
            max_radius_km = 0.0
            if lats and lons:
                for lat, lon in zip(lats, lons):
                    d = haversine_km(center_lat, center_lon, lat, lon)
                    if d > max_radius_km:
                        max_radius_km = round(d, 3)

            # Temporal Span
            created_times = []
            for c in member_complaints:
                ct = c.get("created_at")
                if isinstance(ct, str):
                    try:
                        ct = datetime.fromisoformat(ct.replace("Z", "+00:00"))
                    except:
                        ct = None
                if isinstance(ct, datetime):
                    created_times.append(ct)

            first_complaint_at = min(created_times) if created_times else None
            last_complaint_at = max(created_times) if created_times else None
            temporal_span_days = 0.0
            if first_complaint_at and last_complaint_at:
                delta = (last_complaint_at - first_complaint_at).total_seconds() / 86400.0
                temporal_span_days = round(max(0.1, delta), 2)

            # Representative complaints (up to 3 closest to centroid)
            centroid = np.mean(member_embeddings, axis=0)
            centroid_norm = np.linalg.norm(centroid)
            if centroid_norm > 0:
                centroid = centroid / centroid_norm
            dists_to_centroid = np.linalg.norm(member_embeddings - centroid, axis=1)
            rep_indices = np.argsort(dists_to_centroid)[:3]
            representative_complaints = [
                {
                    "complaint_id": member_complaints[i]["complaint_id"],
                    "text": member_complaints[i]["complaint_text"],
                    "street": member_complaints[i].get("street"),
                    "ward": member_complaints[i].get("ward"),
                    "severity": member_complaints[i].get("severity")
                }
                for i in rep_indices
            ]

            cluster_id = f"CLS-{dominant_category[:3].upper()}-{label:03d}"

            clusters.append({
                "cluster_id": cluster_id,
                "label": int(label),
                "dominant_category": dominant_category,
                "primary_ward": primary_ward,
                "complaint_count": len(member_complaints),
                "avg_similarity": round(avg_similarity, 3),
                "geo_center_lat": round(center_lat, 6),
                "geo_center_lon": round(center_lon, 6),
                "geo_radius_km": max_radius_km,
                "temporal_span_days": temporal_span_days,
                "first_complaint_at": first_complaint_at,
                "last_complaint_at": last_complaint_at,
                "representative_complaints": representative_complaints,
                "complaint_ids": [c["complaint_id"] for c in member_complaints]
            })

        return clusters

clustering_engine = ClusteringEngine()
