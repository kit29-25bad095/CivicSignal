import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import csv

from app.database import get_db
from app.models import Complaint, ComplaintEmbedding, AuditLog
from app.schemas import ComplaintCreate, ComplaintResponse, UnderstandingResult
from app.modules.intake import intake_module
from app.modules.embeddings import embedding_engine

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.post("", response_model=ComplaintResponse)
def submit_complaint(payload: ComplaintCreate, db: Session = Depends(get_db)):
    """
    Step 1 & 2 — Ingest Citizen Complaint and run Intake Understanding.
    """
    count = db.query(Complaint).count() + 1
    complaint_id = f"CMP-{payload.ward.replace(' ', '')}-{count:04d}"

    # Intake Understanding
    analysis = intake_module.process(payload.complaint_text, f"{payload.street or ''}, {payload.ward}")

    category = payload.category or analysis["category"]
    sub_issue = payload.sub_issue or analysis["issue"]
    severity = payload.severity or analysis["severity"]
    dept = payload.department or analysis["department"]

    complaint = Complaint(
        complaint_id=complaint_id,
        complaint_text=payload.complaint_text,
        normalized_text=analysis["normalized_text"],
        category=category,
        sub_issue=sub_issue,
        duration_text=analysis["duration"],
        severity=severity,
        urgency_score=analysis["urgency_score"],
        location_name=payload.location_name or analysis["location"],
        street=payload.street,
        ward=payload.ward,
        latitude=payload.latitude,
        longitude=payload.longitude,
        department=dept,
        status="submitted",
        language=analysis["language"],
        reporter_type=payload.reporter_type or "anonymous",
        created_at=datetime.datetime.utcnow()
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Step 3 — Semantic Representation Embedding
    try:
        emb = embedding_engine.embed_text(payload.complaint_text)
        db_emb = ComplaintEmbedding(
            complaint_id=complaint_id,
            embedding_json=emb,
            model_name=embedding_engine.model_name,
            dimension=embedding_engine.dimension
        )
        db.add(db_emb)
        db.commit()
    except Exception as e:
        db.rollback()

    # Step 10 & Audit
    audit = AuditLog(
        actor_id="CITIZEN",
        actor_name="Citizen Reporter",
        actor_role="CITIZEN",
        action_type="COMPLAINT_SUBMITTED",
        entity_type="complaint",
        entity_id=complaint_id,
        details_json={
            "ward": payload.ward,
            "category": category,
            "severity": severity
        }
    )
    db.add(audit)
    db.commit()

    return complaint

@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    ward: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if ward:
        query = query.filter(Complaint.ward == ward)
    if category:
        query = query.filter(Complaint.category == category)
    if severity:
        query = query.filter(Complaint.severity == severity)
    if status:
        query = query.filter(Complaint.status == status)
    if search:
        query = query.filter(Complaint.complaint_text.ilike(f"%{search}%"))

    return query.order_by(Complaint.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{id_or_code}", response_model=ComplaintResponse)
def get_complaint_detail(id_or_code: str, db: Session = Depends(get_db)):
    if id_or_code.isdigit():
        c = db.query(Complaint).filter(Complaint.id == int(id_or_code)).first()
    else:
        c = db.query(Complaint).filter(Complaint.complaint_id == id_or_code).first()

    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return c

@router.post("/analyze/text", response_model=UnderstandingResult)
def analyze_complaint_text(text: str, location_hint: Optional[str] = None):
    """
    On-the-fly Complaint Understanding preview.
    """
    res = intake_module.process(text, location_hint)
    return UnderstandingResult(**res)

@router.post("/import/csv")
def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    CSV batch import for historical records.
    """
    contents = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(contents))
    imported = 0

    for row in reader:
        text = row.get("complaint_text") or row.get("text")
        if not text:
            continue
        ward = row.get("ward", "Ward 12")
        street = row.get("street", "Main Road")
        lat = float(row.get("latitude", 12.9716))
        lon = float(row.get("longitude", 77.5946))
        cat = row.get("category")
        sev = row.get("severity", "medium")

        analysis = intake_module.extract_deterministic(text, f"{street}, {ward}")

        cid = f"CMP-CSV-{db.query(Complaint).count() + 1:04d}"
        c = Complaint(
            complaint_id=cid,
            complaint_text=text,
            normalized_text=analysis["normalized_text"],
            category=cat or analysis["category"],
            sub_issue=analysis["issue"],
            duration_text=analysis["duration"],
            severity=sev or analysis["severity"],
            urgency_score=analysis["urgency_score"],
            location_name=f"{street}, {ward}",
            street=street,
            ward=ward,
            latitude=lat,
            longitude=lon,
            department=analysis["department"],
            status="submitted",
            language="en",
            reporter_type="csv_import",
            created_at=datetime.datetime.utcnow()
        )
        db.add(c)
        imported += 1

    db.commit()
    return {"status": "success", "imported_count": imported}
