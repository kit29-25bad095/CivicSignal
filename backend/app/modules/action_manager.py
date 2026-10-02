import datetime
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Action, Pattern, AuditLog, Outcome
from app.modules.temporal import temporal_engine

logger = logging.getLogger(__name__)

class ActionManager:
    """
    Step 12 — Action Management.
    Manages municipal intervention workflows initiated by validated civic patterns.
    """
    def create_action(
        self,
        db: Session,
        pattern_id: str,
        title: str,
        department: str,
        assigned_team: str,
        priority: str = "MEDIUM",
        due_date: Optional[datetime.datetime] = None,
        investigation_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Action:
        action_count = db.query(Action).count() + 1
        action_id = f"ACT-{action_count:04d}"

        action = Action(
            action_id=action_id,
            pattern_id=pattern_id,
            investigation_id=investigation_id,
            title=title,
            department=department,
            assigned_team=assigned_team,
            priority=priority.upper(),
            due_date=due_date or (datetime.datetime.utcnow() + datetime.timedelta(days=5)),
            status="PENDING",
            notes=notes,
            created_at=datetime.datetime.utcnow()
        )
        db.add(action)

        # Audit log
        audit = AuditLog(
            actor_id="OFFICER",
            actor_name="Duty Municipal Officer",
            actor_role="OFFICER",
            action_type="ACTION_CREATED",
            entity_type="action",
            entity_id=action_id,
            details_json={
                "pattern_id": pattern_id,
                "title": title,
                "team": assigned_team,
                "priority": priority
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(action)
        return action

    def update_action_status(
        self,
        db: Session,
        action_id: str,
        new_status: str,
        notes: Optional[str] = None
    ) -> Optional[Action]:
        action = db.query(Action).filter(Action.action_id == action_id).first()
        if not action:
            return None

        old_status = action.status
        action.status = new_status.upper()
        if notes:
            action.notes = (action.notes or "") + f"\n[{datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {notes}"

        if action.status == "COMPLETED" and not action.completed_at:
            action.completed_at = datetime.datetime.utcnow()

        # Audit log
        audit = AuditLog(
            actor_id="OFFICER",
            actor_name="Duty Municipal Officer",
            actor_role="OFFICER",
            action_type="ACTION_STATUS_UPDATED",
            entity_type="action",
            entity_id=action_id,
            details_json={
                "from_status": old_status,
                "to_status": action.status,
                "completed_at": str(action.completed_at) if action.completed_at else None
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(action)
        return action

action_manager = ActionManager()
