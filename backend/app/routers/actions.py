from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Action, Pattern
from app.schemas import ActionCreate, ActionUpdate, ActionResponse
from app.modules.action_manager import action_manager
from app.modules.outcome_monitor import outcome_monitor

router = APIRouter(prefix="/actions", tags=["Actions"])

@router.get("", response_model=List[ActionResponse])
def get_actions(
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    pattern_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Action)
    if status:
        query = query.filter(Action.status == status.upper())
    if department:
        query = query.filter(Action.department == department)
    if pattern_id:
        query = query.filter(Action.pattern_id == pattern_id)

    return query.order_by(Action.created_at.desc()).all()

@router.post("", response_model=ActionResponse)
def create_action(payload: ActionCreate, db: Session = Depends(get_db)):
    """
    Step 12 — Create an action after officer validation.
    """
    pattern = db.query(Pattern).filter(Pattern.pattern_id == payload.pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    action = action_manager.create_action(
        db=db,
        pattern_id=payload.pattern_id,
        title=payload.title,
        department=payload.department,
        assigned_team=payload.assigned_team,
        priority=payload.priority,
        due_date=payload.due_date,
        investigation_id=payload.investigation_id,
        notes=payload.notes
    )
    return action

@router.patch("/{action_id}", response_model=ActionResponse)
def update_action(action_id: str, payload: ActionUpdate, db: Session = Depends(get_db)):
    """
    Update action status, assignments, or complete action.
    When completed, triggers Outcome Monitoring.
    """
    action = db.query(Action).filter(Action.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    updated = action_manager.update_action_status(
        db=db,
        action_id=action_id,
        new_status=payload.status or action.status,
        notes=payload.notes
    )

    if payload.assigned_team:
        updated.assigned_team = payload.assigned_team
    if payload.priority:
        updated.priority = payload.priority.upper()

    db.commit()
    db.refresh(updated)

    # If action is completed, auto-evaluate outcome trend
    if updated.status == "COMPLETED":
        try:
            outcome_monitor.evaluate_action_outcome(
                db=db,
                pattern_id=updated.pattern_id,
                action_id=updated.action_id
            )
        except Exception:
            pass

    return updated
