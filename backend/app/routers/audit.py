from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.database import get_db
from app.models import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("")
def get_audit_logs(
    actor_role: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if actor_role:
        query = query.filter(AuditLog.actor_role == actor_role)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "actor_id": l.actor_id,
            "actor_name": l.actor_name,
            "actor_role": l.actor_role,
            "action_type": l.action_type,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details_json
        }
        for l in logs
    ]
