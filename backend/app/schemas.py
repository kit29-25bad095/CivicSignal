import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ComplaintBase(BaseModel):
    complaint_text: str
    location_name: Optional[str] = None
    street: Optional[str] = None
    ward: str
    latitude: float
    longitude: float
    category: Optional[str] = None
    sub_issue: Optional[str] = None
    severity: Optional[str] = "medium"
    department: Optional[str] = None
    language: Optional[str] = "en"
    reporter_type: Optional[str] = "anonymous"

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintResponse(BaseModel):
    id: int
    complaint_id: str
    complaint_text: str
    normalized_text: Optional[str]
    category: str
    sub_issue: Optional[str]
    duration_text: Optional[str]
    severity: str
    urgency_score: float
    location_name: Optional[str]
    street: Optional[str]
    ward: str
    latitude: float
    longitude: float
    department: str
    status: str
    language: str
    reporter_type: str
    cluster_id: Optional[str]
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True

class UnderstandingResult(BaseModel):
    category: str
    issue: str
    duration: Optional[str]
    severity: str
    urgency_score: float
    location: str
    department: str
    entities: List[str] = []
    language: str = "en"
    normalized_text: str

class SimilarityMatch(BaseModel):
    complaint_id: str
    complaint_text: str
    ward: str
    street: Optional[str]
    similarity_score: float
    classification: str # "HIGHLY_SIMILAR", "POTENTIALLY_RELATED", "UNRELATED"

class SimilarityCheckResponse(BaseModel):
    query_text: str
    matches_count: int
    threshold_high: float
    threshold_related: float
    top_matches: List[SimilarityMatch]

class EvidenceItemResponse(BaseModel):
    evidence_type: str
    title: str
    description: str
    metric_value: Optional[float]
    metric_label: Optional[str]
    details_json: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class PatternResponse(BaseModel):
    id: int
    pattern_id: str
    title: str
    category: str
    ward: str
    cluster_id: str
    pattern_strength: float
    complaint_count: int
    temporal_recurrence_days: float
    affected_streets_json: List[str]
    baseline_frequency: float
    observed_frequency: float
    spike_ratio: float
    avg_semantic_similarity: float
    summary: str
    status: str
    requires_human_validation: bool
    evidence_items: List[EvidenceItemResponse] = []
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True

class PatternValidationRequest(BaseModel):
    officer_id: str
    officer_name: str
    decision: str # VALIDATED, REJECTED, NEEDS_INVESTIGATION
    officer_notes: Optional[str] = None

class InvestigationItem(BaseModel):
    id: str
    item: str
    status: str = "PENDING" # PENDING, VERIFIED, INCONCLUSIVE
    verified_notes: Optional[str] = None

class InvestigationResponse(BaseModel):
    id: int
    investigation_id: str
    pattern_id: str
    title: str
    checklist_json: List[Dict[str, Any]]
    status: str
    assigned_to: Optional[str]
    findings: Optional[str]
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True

class ActionCreate(BaseModel):
    pattern_id: str
    investigation_id: Optional[str] = None
    title: str
    department: str
    assigned_team: str
    priority: str = "MEDIUM"
    due_date: Optional[datetime.datetime] = None
    notes: Optional[str] = None

class ActionUpdate(BaseModel):
    status: Optional[str] = None # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    notes: Optional[str] = None
    assigned_team: Optional[str] = None
    priority: Optional[str] = None

class ActionResponse(BaseModel):
    id: int
    action_id: str
    pattern_id: str
    investigation_id: Optional[str]
    title: str
    department: str
    assigned_team: str
    priority: str
    due_date: Optional[datetime.datetime]
    status: str
    notes: Optional[str]
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True

class OutcomeResponse(BaseModel):
    outcome_id: str
    pattern_id: str
    action_id: Optional[str]
    pre_action_complaint_count: int
    post_action_complaint_count: int
    pre_action_window_days: int
    post_action_window_days: int
    observed_change_percent: float
    observation_report: str
    disclaimer: str
    monitored_at: datetime.datetime

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    total_complaints: int
    active_clusters: int
    potential_patterns: int
    validated_patterns: int
    open_actions: int
    completed_actions: int
    monitored_outcomes: int
    categories_breakdown: Dict[str, int]
    wards_breakdown: Dict[str, int]
    recent_activity: List[Dict[str, Any]]
