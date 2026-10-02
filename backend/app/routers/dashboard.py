from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.database import get_db
from app.models import Complaint, Cluster, Pattern, Action, Outcome, AuditLog
from app.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_complaints = db.query(Complaint).count()
    active_clusters = db.query(Cluster).filter(Cluster.status == "ACTIVE").count()
    potential_patterns = db.query(Pattern).filter(Pattern.status == "PENDING_REVIEW").count()
    validated_patterns = db.query(Pattern).filter(Pattern.status == "VALIDATED").count()
    open_actions = db.query(Action).filter(Action.status.in_(["PENDING", "IN_PROGRESS"])).count()
    completed_actions = db.query(Action).filter(Action.status == "COMPLETED").count()
    monitored_outcomes = db.query(Outcome).count()

    # Category breakdown
    cat_rows = db.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
    categories_breakdown = {cat: count for cat, count in cat_rows}

    # Ward breakdown
    ward_rows = db.query(Complaint.ward, func.count(Complaint.id)).group_by(Complaint.ward).all()
    wards_breakdown = {ward: count for ward, count in ward_rows}

    # Recent Audit Activity
    recent_audits = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()
    recent_activity = [
        {
            "id": a.id,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "actor_role": a.actor_role,
            "actor_name": a.actor_name,
            "action_type": a.action_type,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "details": a.details_json
        }
        for a in recent_audits
    ]

    return DashboardSummaryResponse(
        total_complaints=total_complaints,
        active_clusters=active_clusters,
        potential_patterns=potential_patterns,
        validated_patterns=validated_patterns,
        open_actions=open_actions,
        completed_actions=completed_actions,
        monitored_outcomes=monitored_outcomes,
        categories_breakdown=categories_breakdown,
        wards_breakdown=wards_breakdown,
        recent_activity=recent_activity
    )
