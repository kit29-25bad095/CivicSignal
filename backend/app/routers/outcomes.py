from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Outcome, Pattern
from app.schemas import OutcomeResponse
from app.modules.outcome_monitor import outcome_monitor

router = APIRouter(prefix="/outcomes", tags=["Outcomes"])

@router.get("", response_model=List[OutcomeResponse])
def get_all_outcomes(db: Session = Depends(get_db)):
    return db.query(Outcome).order_by(Outcome.monitored_at.desc()).all()

@router.get("/{pattern_id}", response_model=List[OutcomeResponse])
def get_pattern_outcomes(pattern_id: str, db: Session = Depends(get_db)):
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    outcomes = db.query(Outcome).filter(Outcome.pattern_id == pattern_id).order_by(Outcome.monitored_at.desc()).all()
    return outcomes

@router.post("/{pattern_id}/evaluate", response_model=OutcomeResponse)
def evaluate_pattern_outcome(
    pattern_id: str,
    action_id: Optional[str] = Query(None),
    pre_days: int = Query(14),
    post_days: int = Query(14),
    db: Session = Depends(get_db)
):
    """
    Step 13 — Triggers Outcome Monitoring comparison.
    Produces strictly non-causal observation report.
    """
    try:
        outcome = outcome_monitor.evaluate_action_outcome(
            db=db,
            pattern_id=pattern_id,
            action_id=action_id,
            pre_window_days=pre_days,
            post_window_days=post_days
        )
        return outcome
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
