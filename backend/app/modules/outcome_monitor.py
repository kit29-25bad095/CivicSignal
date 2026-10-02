import datetime
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Outcome, Action, Pattern, Complaint, Cluster, AuditLog
from app.modules.temporal import temporal_engine

logger = logging.getLogger(__name__)

class OutcomeMonitor:
    """
    Step 13 — Outcome Monitoring Module.
    Tracks post-intervention complaint trajectory and compares before vs after activity.
    Strictly reports observations without asserting direct causal relationships.
    """
    def evaluate_action_outcome(
        self,
        db: Session,
        pattern_id: str,
        action_id: Optional[str] = None,
        pre_window_days: int = 14,
        post_window_days: int = 14
    ) -> Outcome:
        pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found.")

        # Find action
        action = None
        if action_id:
            action = db.query(Action).filter(Action.action_id == action_id).first()
        else:
            action = db.query(Action).filter(
                Action.pattern_id == pattern_id,
                Action.status == "COMPLETED"
            ).order_by(Action.completed_at.desc()).first()

        intervention_date = action.completed_at if action and action.completed_at else datetime.datetime.utcnow() - datetime.timedelta(days=7)

        # Retrieve complaints linked to this pattern's cluster
        cluster = db.query(Cluster).filter(Cluster.cluster_id == pattern.cluster_id).first()
        complaint_records = []
        if cluster and cluster.complaint_ids_json:
            complaints = db.query(Complaint).filter(Complaint.complaint_id.in_(cluster.complaint_ids_json)).all()
            complaint_records = [
                {"complaint_id": c.complaint_id, "created_at": c.created_at, "ward": c.ward}
                for c in complaints
            ]
        else:
            # Fallback to ward & category
            complaints = db.query(Complaint).filter(
                Complaint.ward == pattern.ward,
                Complaint.category == pattern.category
            ).all()
            complaint_records = [
                {"complaint_id": c.complaint_id, "created_at": c.created_at, "ward": c.ward}
                for c in complaints
            ]

        # Use temporal engine for objective comparison
        res = temporal_engine.evaluate_intervention_impact(
            complaint_records,
            intervention_date=intervention_date,
            pre_window_days=pre_window_days,
            post_window_days=post_window_days
        )

        outcome_count = db.query(Outcome).count() + 1
        outcome_id = f"OUT-{outcome_count:04d}"

        outcome = Outcome(
            outcome_id=outcome_id,
            pattern_id=pattern_id,
            action_id=action.action_id if action else None,
            pre_action_complaint_count=res["pre_action_complaint_count"],
            post_action_complaint_count=res["post_action_complaint_count"],
            pre_action_window_days=res["pre_action_window_days"],
            post_action_window_days=res["post_action_window_days"],
            observed_change_percent=res["observed_change_percent"],
            observation_report=res["observation_report"],
            disclaimer=res["disclaimer"],
            monitored_at=datetime.datetime.utcnow()
        )
        db.add(outcome)

        # Audit log
        audit = AuditLog(
            actor_id="OUTCOME_MONITOR",
            actor_name="CivicSignal Outcome Monitor",
            actor_role="AI_AGENT",
            action_type="OUTCOME_RECORDED",
            entity_type="outcome",
            entity_id=outcome_id,
            details_json={
                "pattern_id": pattern_id,
                "pre_count": res["pre_action_complaint_count"],
                "post_count": res["post_action_complaint_count"],
                "change_percent": res["observed_change_percent"]
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(outcome)
        return outcome

outcome_monitor = OutcomeMonitor()
