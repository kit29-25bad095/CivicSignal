import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.models import Investigation, AuditLog
from app.schemas import InvestigationResponse

router = APIRouter(prefix="/investigations", tags=["Investigations"])

@router.get("", response_model=List[InvestigationResponse])
def get_investigations(pattern_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Investigation)
    if pattern_id:
        query = query.filter(Investigation.pattern_id == pattern_id)
    return query.order_by(Investigation.created_at.desc()).all()

@router.get("/{investigation_id}", response_model=InvestigationResponse)
def get_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

@router.patch("/{investigation_id}")
def update_investigation(
    investigation_id: str,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    findings: Optional[str] = None,
    checklist_updates: Optional[List[Dict[str, Any]]] = None,
    db: Session = Depends(get_db)
):
    inv = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if status:
        inv.status = status.upper()
    if assigned_to:
        inv.assigned_to = assigned_to
    if findings:
        inv.findings = findings
    if checklist_updates:
        inv.checklist_json = checklist_updates

    inv.updated_at = datetime.datetime.utcnow()

    audit = AuditLog(
        actor_id="OFFICER",
        actor_name="Duty Officer",
        actor_role="OFFICER",
        action_type="INVESTIGATION_UPDATED",
        entity_type="investigation",
        entity_id=investigation_id,
        details_json={"status": inv.status, "assigned_to": inv.assigned_to}
    )
    db.add(audit)
    db.commit()
    db.refresh(inv)
    return inv
