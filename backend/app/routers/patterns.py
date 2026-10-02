import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import (
    Pattern, PatternEvidence, PatternValidation, Cluster,
    Complaint, ComplaintEmbedding, Investigation, Action, AuditLog
)
from app.schemas import (
    PatternResponse, PatternValidationRequest,
    SimilarityCheckResponse, SimilarityMatch
)
from app.modules.clustering import clustering_engine
from app.modules.pattern_engine import pattern_agent
from app.modules.similarity import similarity_engine
from app.modules.embeddings import embedding_engine
from app.modules.investigation import investigation_agent

router = APIRouter(prefix="/patterns", tags=["Patterns"])

@router.get("", response_model=List[PatternResponse])
def get_patterns(
    status: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Pattern)
    if status:
        query = query.filter(Pattern.status == status.upper())
    if ward:
        query = query.filter(Pattern.ward == ward)
    if category:
        query = query.filter(Pattern.category == category)

    return query.order_by(Pattern.pattern_strength.desc()).all()

@router.get("/{pattern_id}", response_model=PatternResponse)
def get_pattern_detail(pattern_id: str, db: Session = Depends(get_db)):
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern

@router.get("/{pattern_id}/complaints")
def get_pattern_complaints(pattern_id: str, db: Session = Depends(get_db)):
    """
    Returns the underlying complaints supporting the pattern evidence.
    """
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    cluster = db.query(Cluster).filter(Cluster.cluster_id == pattern.cluster_id).first()
    if cluster and cluster.complaint_ids_json:
        complaints = db.query(Complaint).filter(Complaint.complaint_id.in_(cluster.complaint_ids_json)).all()
    else:
        complaints = db.query(Complaint).filter(
            Complaint.ward == pattern.ward,
            Complaint.category == pattern.category
        ).limit(50).all()

    return [
        {
            "id": c.id,
            "complaint_id": c.complaint_id,
            "text": c.complaint_text,
            "street": c.street,
            "ward": c.ward,
            "category": c.category,
            "sub_issue": c.sub_issue,
            "severity": c.severity,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "department": c.department
        }
        for c in complaints
    ]

@router.post("/discover")
def trigger_pattern_discovery(db: Session = Depends(get_db)):
    """
    Steps 5, 6, 7, 8, 9:
    Triggers clustering (DBSCAN) over all embeddings, computes spatial/temporal signals,
    and runs Pattern Intelligence Agent to produce explainable patterns.
    """
    complaints = db.query(Complaint).all()
    if len(complaints) < 3:
        return {"status": "insufficient_data", "message": "At least 3 complaints are required for clustering."}

    # Gather embeddings
    embeddings_map = {
        e.complaint_id: e.embedding_json
        for e in db.query(ComplaintEmbedding).all()
    }

    valid_complaints = []
    valid_embeddings = []

    for c in complaints:
        emb = embeddings_map.get(c.complaint_id)
        if not emb:
            emb = embedding_engine.embed_text(c.complaint_text)
            db.add(ComplaintEmbedding(complaint_id=c.complaint_id, embedding_json=emb))
        valid_complaints.append({
            "complaint_id": c.complaint_id,
            "complaint_text": c.complaint_text,
            "category": c.category,
            "ward": c.ward,
            "street": c.street,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "severity": c.severity,
            "created_at": c.created_at
        })
        valid_embeddings.append(emb)

    db.commit()

    # Step 5: Clustering
    detected_clusters = clustering_engine.cluster_embeddings(valid_embeddings, valid_complaints)
    patterns_created = 0

    for cl_data in detected_clusters:
        # Check if cluster exists in DB
        db_cluster = db.query(Cluster).filter(Cluster.cluster_id == cl_data["cluster_id"]).first()
        if not db_cluster:
            db_cluster = Cluster(
                cluster_id=cl_data["cluster_id"],
                dominant_category=cl_data["dominant_category"],
                complaint_count=cl_data["complaint_count"],
                avg_similarity=cl_data["avg_similarity"],
                geo_center_lat=cl_data["geo_center_lat"],
                geo_center_lon=cl_data["geo_center_lon"],
                geo_radius_km=cl_data["geo_radius_km"],
                primary_ward=cl_data["primary_ward"],
                temporal_span_days=cl_data["temporal_span_days"],
                first_complaint_at=cl_data["first_complaint_at"],
                last_complaint_at=cl_data["last_complaint_at"],
                representative_complaints_json=cl_data["representative_complaints"],
                complaint_ids_json=cl_data["complaint_ids"],
                status="ACTIVE"
            )
            db.add(db_cluster)
            db.commit()

        # Step 8 & 9: Pattern Generation
        cluster_complaint_records = [
            c for c in valid_complaints if c["complaint_id"] in cl_data["complaint_ids"]
        ]
        pat_eval = pattern_agent.evaluate_cluster(cl_data, cluster_complaint_records)
        if pat_eval:
            existing_pat = db.query(Pattern).filter(Pattern.cluster_id == cl_data["cluster_id"]).first()
            if not existing_pat:
                new_pat = Pattern(
                    pattern_id=pat_eval["pattern_id"],
                    title=pat_eval["title"],
                    category=pat_eval["category"],
                    ward=pat_eval["ward"],
                    cluster_id=pat_eval["cluster_id"],
                    pattern_strength=pat_eval["pattern_strength"],
                    complaint_count=pat_eval["complaint_count"],
                    temporal_recurrence_days=pat_eval["temporal_recurrence_days"],
                    affected_streets_json=pat_eval["affected_streets"],
                    baseline_frequency=pat_eval["baseline_frequency"],
                    observed_frequency=pat_eval["observed_frequency"],
                    spike_ratio=pat_eval["spike_ratio"],
                    avg_semantic_similarity=pat_eval["avg_semantic_similarity"],
                    summary=pat_eval["summary"],
                    status="PENDING_REVIEW",
                    requires_human_validation=True
                )
                db.add(new_pat)

                # Add Evidence Items
                for ev in pat_eval["evidence_items"]:
                    db.add(PatternEvidence(
                        pattern_id=pat_eval["pattern_id"],
                        evidence_type=ev["evidence_type"],
                        title=ev["title"],
                        description=ev["description"],
                        metric_value=ev["metric_value"],
                        metric_label=ev["metric_label"],
                        details_json=ev["details_json"]
                    ))

                # Generate recommended investigation checklist
                inv_items = investigation_agent.generate_checklist({
                    "category": pat_eval["category"],
                    "affected_streets_json": pat_eval["affected_streets"]
                })
                db.add(Investigation(
                    investigation_id=f"INV-{pat_eval['pattern_id'][-7:]}",
                    pattern_id=pat_eval["pattern_id"],
                    title=f"Field Verification: {pat_eval['title']}",
                    checklist_json=inv_items,
                    status="RECOMMENDED"
                ))

                patterns_created += 1

    db.commit()
    return {
        "status": "success",
        "clusters_detected": len(detected_clusters),
        "patterns_generated": patterns_created
    }

@router.post("/{pattern_id}/validate")
def validate_pattern(pattern_id: str, payload: PatternValidationRequest, db: Session = Depends(get_db)):
    """
    Step 10 — Human Validation by authorized municipal officer.
    Decision: VALIDATED, REJECTED, or NEEDS_INVESTIGATION.
    """
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    pattern.status = payload.decision.upper()
    pattern.updated_at = datetime.datetime.utcnow()

    # Record validation decision
    val = PatternValidation(
        pattern_id=pattern_id,
        officer_id=payload.officer_id,
        officer_name=payload.officer_name,
        decision=payload.decision.upper(),
        officer_notes=payload.officer_notes,
        validated_at=datetime.datetime.utcnow()
    )
    db.add(val)

    # Audit log
    audit = AuditLog(
        actor_id=payload.officer_id,
        actor_name=payload.officer_name,
        actor_role="OFFICER",
        action_type="PATTERN_VALIDATION",
        entity_type="pattern",
        entity_id=pattern_id,
        details_json={
            "decision": payload.decision.upper(),
            "notes": payload.officer_notes
        }
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "pattern_id": pattern_id, "new_status": pattern.status}

@router.post("/similarity/search", response_model=SimilarityCheckResponse)
def search_similar_complaints(query_text: str, top_k: int = 6, db: Session = Depends(get_db)):
    """
    Step 4 — Interactive Semantic Similarity Search.
    Ranks against all stored embeddings with configurable high/related thresholds.
    """
    query_emb = embedding_engine.embed_text(query_text)

    all_embeddings = db.query(ComplaintEmbedding).all()
    if not all_embeddings:
        return SimilarityCheckResponse(
            query_text=query_text,
            matches_count=0,
            threshold_high=similarity_engine.high_threshold,
            threshold_related=similarity_engine.related_threshold,
            top_matches=[]
        )

    cand_embs = [e.embedding_json for e in all_embeddings]
    cand_ids = [e.complaint_id for e in all_embeddings]

    # Map metadata
    complaints = {c.complaint_id: c for c in db.query(Complaint).filter(Complaint.complaint_id.in_(cand_ids)).all()}
    metadata = []
    for cid in cand_ids:
        c = complaints.get(cid)
        if c:
            metadata.append({
                "complaint_id": c.complaint_id,
                "complaint_text": c.complaint_text,
                "ward": c.ward,
                "street": c.street
            })
        else:
            metadata.append({
                "complaint_id": cid,
                "complaint_text": "",
                "ward": "",
                "street": ""
            })

    matches = similarity_engine.find_top_matches(
        target_embedding=query_emb,
        candidate_embeddings=cand_embs,
        candidate_metadata=metadata,
        top_k=top_k
    )

    return SimilarityCheckResponse(
        query_text=query_text,
        matches_count=len(matches),
        threshold_high=similarity_engine.high_threshold,
        threshold_related=similarity_engine.related_threshold,
        top_matches=[SimilarityMatch(**m) for m in matches]
    )
