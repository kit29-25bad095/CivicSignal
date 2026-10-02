import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class TemporalEngine:
    """
    Step 6 — Temporal Intelligence Module.
    Calculates:
      - Daily / Weekly complaint volumes
      - Moving averages
      - Baseline frequency comparisons
      - Spike ratios and recurrence patterns
      - Pre- vs Post-intervention window metrics
    Strictly reports observations without asserting direct causal relationships.
    """
    def __init__(self):
        pass

    def parse_datetime(self, val: Any) -> datetime:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                pass
        return datetime.utcnow()

    def analyze_timeseries(
        self,
        complaints: List[Dict[str, Any]],
        historical_baseline_daily: float = 1.2
    ) -> Dict[str, Any]:
        """
        Calculates temporal distribution, daily aggregation, moving average, and recurrence.
        """
        if not complaints:
            return {
                "daily_counts": [],
                "total_count": 0,
                "temporal_span_days": 0,
                "observed_daily_rate": 0.0,
                "baseline_daily_rate": historical_baseline_daily,
                "spike_ratio": 1.0,
                "recurrence_days_count": 0,
                "is_anomalous_spike": False
            }

        dates = [self.parse_datetime(c.get("created_at")).date() for c in complaints]
        df = pd.DataFrame({"date": dates, "count": 1})
        daily_df = df.groupby("date").sum().reset_index()
        daily_df["date_str"] = daily_df["date"].astype(str)

        # Full range filling
        min_date = daily_df["date"].min()
        max_date = daily_df["date"].max()
        span_days = max(1, (max_date - min_date).days + 1)
        
        full_idx = pd.date_range(min_date, max_date)
        full_df = pd.DataFrame({"date": full_idx.date})
        merged = pd.merge(full_df, daily_df, on="date", how="left").fillna(0)
        merged["rolling_3d"] = merged["count"].rolling(window=3, min_periods=1).mean().round(2)
        merged["date_str"] = merged["date"].astype(str)

        total_count = len(complaints)
        observed_daily_rate = round(total_count / span_days, 2)
        baseline = max(0.2, historical_baseline_daily)
        spike_ratio = round(observed_daily_rate / baseline, 2)
        recurrence_days = int((merged["count"] > 0).sum())

        daily_counts_list = [
            {
                "date": row["date_str"],
                "count": int(row["count"]),
                "rolling_avg": float(row["rolling_3d"])
            }
            for _, row in merged.iterrows()
        ]

        return {
            "daily_counts": daily_counts_list,
            "total_count": total_count,
            "temporal_span_days": span_days,
            "observed_daily_rate": observed_daily_rate,
            "baseline_daily_rate": baseline,
            "spike_ratio": spike_ratio,
            "recurrence_days_count": recurrence_days,
            "is_anomalous_spike": spike_ratio >= 1.5
        }

    def evaluate_intervention_impact(
        self,
        complaints: List[Dict[str, Any]],
        intervention_date: datetime,
        pre_window_days: int = 14,
        post_window_days: int = 14
    ) -> Dict[str, Any]:
        """
        Compares complaint volume in windows prior to and following an intervention.
        Follows strict scientific guideline: reports observed correlation without claiming causation.
        """
        interv_dt = self.parse_datetime(intervention_date)
        pre_cutoff = interv_dt - timedelta(days=pre_window_days)
        post_cutoff = interv_dt + timedelta(days=post_window_days)

        pre_count = 0
        post_count = 0

        for c in complaints:
            dt = self.parse_datetime(c.get("created_at"))
            # Make naive for comparison
            if dt.tzinfo:
                dt = dt.replace(tzinfo=None)
            if interv_dt.tzinfo:
                interv_dt_naive = interv_dt.replace(tzinfo=None)
            else:
                interv_dt_naive = interv_dt

            if dt >= (interv_dt_naive - timedelta(days=pre_window_days)) and dt < interv_dt_naive:
                pre_count += 1
            elif dt >= interv_dt_naive and dt <= (interv_dt_naive + timedelta(days=post_window_days)):
                post_count += 1

        if pre_count > 0:
            change_percent = round(((post_count - pre_count) / pre_count) * 100.0, 1)
        else:
            change_percent = 0.0

        if change_percent < 0:
            observation_report = (
                f"Complaint frequency decreased from {pre_count} to {post_count} "
                f"({abs(change_percent)}% reduction) in the {post_window_days}-day period following the recorded intervention."
            )
        elif change_percent > 0:
            observation_report = (
                f"Complaint frequency increased from {pre_count} to {post_count} "
                f"(+{change_percent}%) during the post-intervention observation window."
            )
        else:
            observation_report = (
                f"Complaint frequency remained constant at {post_count} complaints "
                f"between the pre- and post-intervention periods."
            )

        return {
            "pre_action_complaint_count": pre_count,
            "post_action_complaint_count": post_count,
            "pre_action_window_days": pre_window_days,
            "post_action_window_days": post_window_days,
            "observed_change_percent": change_percent,
            "observation_report": observation_report,
            "disclaimer": "Observed correlation only; not an assertion of direct single-factor causation."
        }

temporal_engine = TemporalEngine()
