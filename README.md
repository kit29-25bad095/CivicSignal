# CivicSignal Intelligence Agent
> **Tagline:** From Complaints to Collective Intelligence

CivicSignal is a production-structured civic intelligence system that converts fragmented, isolated citizen grievances into evidence-backed municipal patterns. Rather than treating individual complaints as siloed tickets or building a generic chatbot, CivicSignal operates as an **AI Civic Intelligence Analyst** that discovers latent spatial, temporal, and semantic relationships across municipal departments.

---

## 🏛️ System Pipeline (13 Steps)

```
INDIVIDUAL COMPLAINTS
        ↓ (Step 1 & 2: Ingestion & NLP Intake Understanding)
      CONNECT
        ↓ (Step 3 & 4: SentenceTransformers & Cosine Similarity)
   DETECT PATTERNS
        ↓ (Step 5: DBSCAN Clustering Layer)
ANALYZE TIME + LOCATION
        ↓ (Step 6 & 7: Temporal Moving Averages & Geospatial Bounding)
  GENERATE EVIDENCE
        ↓ (Step 8 & 9: Explainable Pattern Strength & Evidence Trail)
  HUMAN VALIDATION
        ↓ (Step 10: Human-in-the-Loop Officer Validation)
INVESTIGATION / ACTION
        ↓ (Step 11 & 12: Field Checklist & Intervention Management)
  MONITOR OUTCOME
        ↓ (Step 13: Non-Causal Pre/Post Intervention Comparison)
```

---

## 🔬 Core Ethical & Engineering Principles

1. **Human-in-the-Loop:** AI findings remain candidate recommendations (`PENDING_REVIEW`) until verified and validated by an authorized municipal officer.
2. **Evidence Before Conclusions:** Every detected pattern links directly to inspectable citizen complaint IDs, spatial radii, and baseline deviations.
3. **No Automated Blame or Unsupported Causation:** The system never attributes negligence, corruption, or single-factor causation. Reports use strictly empirical phrasing: *"Complaint frequency decreased after the recorded intervention."*
4. **Deterministic Math for Math:** NLP/LLMs are reserved strictly for language understanding and checklist drafting; all cosine similarities, DBSCAN clustering, rolling averages, and Haversine distances are computed deterministically.
5. **Privacy by Design:** Full civic intelligence is generated without requiring citizens to provide PII.

---

## 💻 Tech Stack

- **Backend:** Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic, Uvicorn
- **AI & NLP:** `sentence-transformers` (`all-MiniLM-L6-v2`), `google-genai` (Gemini API), deterministic sub-word vectorizer fallback
- **Machine Learning & Analytics:** `scikit-learn` (DBSCAN, Cosine Similarity, Bounding), `pandas`, `numpy`, `scipy`
- **Frontend:** React 19, Vite, Tailwind CSS, Leaflet + OpenStreetMap, Recharts, Lucide Icons

---

## 📊 Demo Scenario

- **520+ Realistically Seeded Citizen Complaints** across 6 municipal wards.
- **Primary Incident Scenario:**
  - **43 Related Water Grievances** in **Ward 12**.
  - Concentrated across **6 connected streets**: *1st Main Road, 4th Cross Street, Gandhi Nagar 2nd Ave, School Road, Hospital Link Rd, Temple Street*.
  - **10-day persistent recurrence** with varied wording (*"Taps dry"*, *"Weak pressure"*, *"Only 10 mins water"*).
  - **4.0x Spike Ratio** exceeding historical 1.1 complaints/day baseline.
  - Generates candidate pattern **`PAT-001`** (Pattern Strength: 0.86).

---

## 🚀 Running the Project

### 1. Backend Server
```powershell
cd "backend"
python -m uvicorn app.main:app --port 8000 --reload
```
API Documentation available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Application
```powershell
cd "frontend"
npm run dev
```
Open browser at: `http://127.0.0.1:5173`

---

## 🗺️ Frontend Pages

1. **Citizen Portal (`CitizenHome`)**: Transparent civic oversight, privacy principles, active issue highlights.
2. **Report Grievance (`SubmitComplaint`)**: Live Intake Intelligence (category, duration, urgency), interactive map pin placement.
3. **Track Issue (`ComplaintTracking`)**: Ticket lookup & interactive semantic similarity search.
4. **Officer Console (`OfficerDashboard`)**: High-level KPIs, category pie charts, ward bar charts, live activity stream.
5. **Pattern Discovery (`PatternDiscovery`)**: Cluster list, pattern strength scores, live DBSCAN trigger.
6. **Pattern Detail (`PatternDetail`)**: Complete evidentiary audit trail, Leaflet cluster map, timeline graph, human validation actions (`VALIDATE`, `REJECT`, `NEEDS_INVESTIGATION`), investigation checklists, intervention dispatch, and outcome reports.
7. **Map Intelligence (`MapIntelligence`)**: Full-screen OpenStreetMap with category markers and cluster bounds.
8. **Timeline Intelligence (`TimelineIntelligence`)**: Daily counts, 3-day moving averages, baseline thresholds.
9. **Action Management (`ActionTracking`)**: Engineering crew dispatch and lifecycle tracking.
10. **Outcome Monitor (`OutcomeMonitoring`)**: Before/after complaint trajectory comparisons.
11. **Audit Trail (`AuditLog`)**: Immutable audit logs of all AI and officer actions.
