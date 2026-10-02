import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=True)
    role = Column(String(50), default="citizen", nullable=False) # citizen, officer, admin
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    contact_email = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    ward = Column(String(100), index=True, nullable=False)
    area_name = Column(String(150), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    zone = Column(String(100), nullable=True)

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(50), unique=True, index=True, nullable=False)
    complaint_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=True)
    
    # Understanding Module Outputs
    category = Column(String(100), index=True, nullable=False)
    sub_issue = Column(String(100), nullable=True)
    duration_text = Column(String(100), nullable=True)
    severity = Column(String(50), default="medium", nullable=False) # low, medium, high, critical
    urgency_score = Column(Float, default=0.5)
    
    # Spatial info
    location_name = Column(String(255), nullable=True)
    street = Column(String(255), index=True, nullable=True)
    ward = Column(String(100), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Department & Tracking
    department = Column(String(150), index=True, nullable=False)
    status = Column(String(50), default="submitted", index=True) # submitted, triaged, clustered, resolved
    language = Column(String(20), default="en")
    reporter_type = Column(String(50), default="anonymous") # anonymous, verified_citizen
    cluster_id = Column(String(50), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    embedding = relationship("ComplaintEmbedding", back_populates="complaint", uselist=False, cascade="all, delete-orphan")

class ComplaintEmbedding(Base):
    __tablename__ = "complaint_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(50), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), unique=True, index=True)
    embedding_json = Column(JSON, nullable=False) # List of floats
    model_name = Column(String(100), default="all-MiniLM-L6-v2")
    dimension = Column(Integer, default=384)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="embedding")

class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(String(50), unique=True, index=True, nullable=False)
    dominant_category = Column(String(100), nullable=False)
    complaint_count = Column(Integer, default=0)
    avg_similarity = Column(Float, default=0.0)
    
    geo_center_lat = Column(Float, nullable=True)
    geo_center_lon = Column(Float, nullable=True)
    geo_radius_km = Column(Float, default=0.0)
    primary_ward = Column(String(100), nullable=True)
    
    temporal_span_days = Column(Float, default=0.0)
    first_complaint_at = Column(DateTime, nullable=True)
    last_complaint_at = Column(DateTime, nullable=True)
    
    representative_complaints_json = Column(JSON, default=list) # List of complaint IDs & quotes
    complaint_ids_json = Column(JSON, default=list) # List of all member complaint IDs
    
    status = Column(String(50), default="ACTIVE") # ACTIVE, MERGED, CLOSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. PAT-001
    title = Column(String(255), nullable=False)
    category = Column(String(100), index=True, nullable=False)
    ward = Column(String(100), index=True, nullable=False)
    cluster_id = Column(String(50), index=True, nullable=False)
    
    # Quantitative Pattern Metrics
    pattern_strength = Column(Float, default=0.0) # 0.0 to 1.0 explainable score
    complaint_count = Column(Integer, default=0)
    temporal_recurrence_days = Column(Float, default=0.0)
    affected_streets_json = Column(JSON, default=list) # List of street names
    baseline_frequency = Column(Float, default=0.0) # Complaints / day baseline
    observed_frequency = Column(Float, default=0.0) # Observed complaints / day
    spike_ratio = Column(Float, default=1.0) # observed / baseline
    avg_semantic_similarity = Column(Float, default=0.0)
    
    summary = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING_REVIEW", index=True) 
    # PENDING_REVIEW, VALIDATED, REJECTED, NEEDS_INVESTIGATION
    
    requires_human_validation = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    evidence_items = relationship("PatternEvidence", back_populates="pattern", cascade="all, delete-orphan")
    validations = relationship("PatternValidation", back_populates="pattern", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="pattern", cascade="all, delete-orphan")
    actions = relationship("Action", back_populates="pattern", cascade="all, delete-orphan")
    outcomes = relationship("Outcome", back_populates="pattern", cascade="all, delete-orphan")

class PatternEvidence(Base):
    __tablename__ = "pattern_evidence"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(50), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), index=True, nullable=False)
    evidence_type = Column(String(100), nullable=False) # SEMANTIC_SIMILARITY, GEOGRAPHIC_CLUSTER, TEMPORAL_RECURRENCE, BASELINE_SPIKE, VOLUME
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    metric_value = Column(Float, nullable=True)
    metric_label = Column(String(100), nullable=True)
    details_json = Column(JSON, default=dict) # Inspectable raw data
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    pattern = relationship("Pattern", back_populates="evidence_items")

class PatternValidation(Base):
    __tablename__ = "pattern_validations"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(50), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), index=True, nullable=False)
    officer_id = Column(String(100), nullable=False)
    officer_name = Column(String(150), nullable=False)
    decision = Column(String(50), nullable=False) # VALIDATED, REJECTED, NEEDS_INVESTIGATION
    officer_notes = Column(Text, nullable=True)
    validated_at = Column(DateTime, default=datetime.datetime.utcnow)

    pattern = relationship("Pattern", back_populates="validations")

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(String(50), unique=True, index=True, nullable=False)
    pattern_id = Column(String(50), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    checklist_json = Column(JSON, default=list) # List of [{id, item, status, verified_notes}]
    status = Column(String(50), default="RECOMMENDED") # RECOMMENDED, ASSIGNED, IN_PROGRESS, COMPLETED
    assigned_to = Column(String(150), nullable=True)
    findings = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    pattern = relationship("Pattern", back_populates="investigations")

class Action(Base):
    __tablename__ = "actions"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String(50), unique=True, index=True, nullable=False)
    pattern_id = Column(String(50), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), index=True, nullable=False)
    investigation_id = Column(String(50), nullable=True)
    title = Column(String(255), nullable=False)
    department = Column(String(150), nullable=False)
    assigned_team = Column(String(150), nullable=False)
    priority = Column(String(50), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="PENDING") # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    pattern = relationship("Pattern", back_populates="actions")
    outcomes = relationship("Outcome", back_populates="action", cascade="all, delete-orphan")

class Outcome(Base):
    __tablename__ = "outcomes"

    id = Column(Integer, primary_key=True, index=True)
    outcome_id = Column(String(50), unique=True, index=True, nullable=False)
    pattern_id = Column(String(50), ForeignKey("patterns.pattern_id", ondelete="CASCADE"), index=True, nullable=False)
    action_id = Column(String(50), ForeignKey("actions.action_id", ondelete="CASCADE"), index=True, nullable=True)
    
    pre_action_complaint_count = Column(Integer, default=0)
    post_action_complaint_count = Column(Integer, default=0)
    pre_action_window_days = Column(Integer, default=14)
    post_action_window_days = Column(Integer, default=14)
    observed_change_percent = Column(Float, default=0.0) # Negative means reduction
    
    # Strictly non-causal reporting as mandated:
    # "Complaint frequency decreased after the intervention." Not "The intervention caused the decrease."
    observation_report = Column(Text, nullable=False)
    disclaimer = Column(String(255), default="Observed correlation only; not an assertion of direct single-factor causation.")
    monitored_at = Column(DateTime, default=datetime.datetime.utcnow)

    pattern = relationship("Pattern", back_populates="outcomes")
    action = relationship("Action", back_populates="outcomes")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    actor_id = Column(String(100), nullable=False)
    actor_name = Column(String(150), nullable=False)
    actor_role = Column(String(50), nullable=False) # AI_AGENT, OFFICER, CITIZEN, ADMIN
    action_type = Column(String(100), nullable=False) # INTAKE, CLUSTER_DETECTED, PATTERN_GENERATED, VALIDATION, INVESTIGATION_RECOMMENDED, ACTION_CREATED, OUTCOME_LOGGED
    entity_type = Column(String(50), nullable=False) # complaint, cluster, pattern, action, investigation
    entity_id = Column(String(50), nullable=False)
    details_json = Column(JSON, default=dict)
