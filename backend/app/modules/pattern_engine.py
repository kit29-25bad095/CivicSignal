import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.modules.similarity import similarity_engine
from app.modules.temporal import temporal_engine
from app.modules.geospatial import geospatial_engine

logger = logging.getLogger(__name__)

class PatternIntelligenceAgent:
    """
    Step 8 & 9 — CivicSignal Pattern Intelligence Agent.
    Synthesizes signals from:
      - Semantic Similarity
      - Cluster Information
      - Complaint Volume
      - Temporal Recurrence
      - Geographic Concentration
      - Baseline Deviation
    Calculates explainable Pattern Strength (0.0 to 1.0) and generates an inspectable Evidence Trail.
    Adheres strictly to the ethical boundaries: identifies patterns, not blame or unverified root causes.
    """
    def __init__(self):
        pass

    def calculate_pattern_strength(
        self,
        avg_similarity: float,
        complaint_count: int,
        recurrence_days: int,
        concentration_score: float,
        spike_ratio: float
    ) -> float:
        """
        Explainable heuristic scoring model.
        Weights:
          - Semantic similarity: 25%
          - Volume signal: 20% (saturates around 30 complaints)
          - Temporal recurrence: 20% (saturates around 7 days)
          - Geographic concentration: 15%
          - Baseline spike: 20% (saturates at 3.0x baseline)
        """
        # 1. Similarity (0.0 - 1.0)
        sim_sig = min(1.0, max(0.0, (avg_similarity - 0.5) / 0.5))

        # 2. Volume signal
        vol_sig = min(1.0, complaint_count / 30.0)

        # 3. Recurrence signal
        rec_sig = min(1.0, recurrence_days / 7.0)

        # 4. Geo concentration
        geo_sig = min(1.0, max(0.0, concentration_score))

        # 5. Baseline spike signal
        spike_sig = min(1.0, max(0.0, (spike_ratio - 1.0) / 2.0))

        raw_score = (
            0.25 * sim_sig +
            0.20 * vol_sig +
            0.20 * rec_sig +
            0.15 * geo_sig +
            0.20 * spike_sig
        )

        return round(float(np_clip(raw_score, 0.05, 0.98)), 2)

    def evaluate_cluster(
        self,
        cluster: Dict[str, Any],
        cluster_complaints: List[Dict[str, Any]],
        historical_baseline_daily: float = 1.0
    ) -> Optional[Dict[str, Any]]:
        """
        Synthesizes cluster signals into a candidate Pattern with comprehensive Evidence Trail.
        """
        count = len(cluster_complaints)
        if count < 3:
            return None

        # 1. Temporal Analysis
        temp_stats = temporal_engine.analyze_timeseries(
            cluster_complaints,
            historical_baseline_daily=historical_baseline_daily
        )

        # 2. Geospatial Analysis
        geo_stats = geospatial_engine.analyze_spatial_distribution(cluster_complaints)

        # 3. Semantic Similarity
        avg_similarity = cluster.get("avg_similarity", 0.82)

        # 4. Pattern Strength Calculation
        strength = self.calculate_pattern_strength(
            avg_similarity=avg_similarity,
            complaint_count=count,
            recurrence_days=temp_stats["recurrence_days_count"],
            concentration_score=geo_stats["concentration_score"],
            spike_ratio=temp_stats["spike_ratio"]
        )

        # Title & Category
        cat_name = cluster.get("dominant_category", "Civic Issue").replace("_", " ").title()
        ward_name = geo_stats["primary_ward"]
        title = f"Potential Recurring {cat_name} Pattern — {ward_name}"

        # Build Explainable Evidence Items (Step 9)
        evidence_items = []

        # Evidence 1: Cluster Volume & Relatedness
        evidence_items.append({
            "evidence_type": "CLUSTER_VOLUME",
            "title": f"Aggregated Cluster Volume ({count} complaints)",
            "description": f"{count} complaints belong to a semantically coherent cluster with an average cosine similarity of {avg_similarity:.2f}.",
            "metric_value": float(count),
            "metric_label": "Complaints",
            "details_json": {
                "cluster_id": cluster.get("cluster_id"),
                "sample_ids": [c["complaint_id"] for c in cluster_complaints[:5]]
            }
        })

        # Evidence 2: Geographic Concentration
        streets_str = ", ".join(geo_stats["affected_streets"][:6]) if geo_stats["affected_streets"] else "nearby streets"
        evidence_items.append({
            "evidence_type": "GEOGRAPHIC_CLUSTER",
            "title": f"Localized Geographic Concentration ({geo_stats['affected_streets_count']} streets)",
            "description": f"Complaints are concentrated within a {geo_stats['radius_km']} km radius in {ward_name} across {geo_stats['affected_streets_count']} connected streets ({streets_str}).",
            "metric_value": geo_stats["radius_km"],
            "metric_label": "Radius (km)",
            "details_json": {
                "center_lat": geo_stats["center_lat"],
                "center_lon": geo_stats["center_lon"],
                "streets": geo_stats["affected_streets"]
            }
        })

        # Evidence 3: Temporal Recurrence
        evidence_items.append({
            "evidence_type": "TEMPORAL_RECURRENCE",
            "title": f"Persistent Temporal Recurrence ({temp_stats['recurrence_days_count']} active days)",
            "description": f"Similar grievances were logged across {temp_stats['recurrence_days_count']} days spanning an observation period of {temp_stats['temporal_span_days']} days.",
            "metric_value": float(temp_stats["recurrence_days_count"]),
            "metric_label": "Active Days",
            "details_json": {
                "span_days": temp_stats["temporal_span_days"],
                "daily_rate": temp_stats["observed_daily_rate"]
            }
        })

        # Evidence 4: Baseline Deviation
        evidence_items.append({
            "evidence_type": "BASELINE_SPIKE",
            "title": f"Frequency Deviation ({temp_stats['spike_ratio']}x Baseline)",
            "description": f"The observed complaint frequency of {temp_stats['observed_daily_rate']}/day represents a {temp_stats['spike_ratio']}x deviation over the typical baseline ({temp_stats['baseline_daily_rate']}/day).",
            "metric_value": temp_stats["spike_ratio"],
            "metric_label": "Spike Ratio",
            "details_json": {
                "observed_rate": temp_stats["observed_daily_rate"],
                "baseline_rate": temp_stats["baseline_daily_rate"]
            }
        })

        summary = (
            f"AI Pattern Detection: {count} complaints logged across {geo_stats['affected_streets_count']} streets in {ward_name} "
            f"demonstrate high semantic coherence ({avg_similarity:.2f}) and a {temp_stats['spike_ratio']}x elevation above historical baseline over {temp_stats['recurrence_days_count']} days. "
            f"Evidence indicates a potential systemic civic pattern requiring human officer review."
        )

        pattern_id = f"PAT-{cluster.get('cluster_id', '001')[-7:]}"

        return {
            "pattern_id": pattern_id,
            "title": title,
            "category": cluster.get("dominant_category", "general"),
            "ward": ward_name,
            "cluster_id": cluster.get("cluster_id"),
            "pattern_strength": strength,
            "complaint_count": count,
            "temporal_recurrence_days": float(temp_stats["recurrence_days_count"]),
            "affected_streets": geo_stats["affected_streets"],
            "baseline_frequency": temp_stats["baseline_daily_rate"],
            "observed_frequency": temp_stats["observed_daily_rate"],
            "spike_ratio": temp_stats["spike_ratio"],
            "avg_semantic_similarity": avg_similarity,
            "summary": summary,
            "status": "PENDING_REVIEW",
            "requires_human_validation": True,
            "evidence_items": evidence_items,
            "temporal_stats": temp_stats,
            "geospatial_stats": geo_stats
        }

def np_clip(val, min_val, max_val):
    return max(min_val, min(max_val, val))

pattern_agent = PatternIntelligenceAgent()
