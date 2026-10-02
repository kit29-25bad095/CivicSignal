import random
import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models import (
    User, Department, Location, Complaint, ComplaintEmbedding,
    Cluster, Pattern, PatternEvidence, PatternValidation,
    Investigation, Action, Outcome, AuditLog
)
from app.modules.intake import intake_module
from app.modules.embeddings import embedding_engine
from app.modules.clustering import clustering_engine
from app.modules.pattern_engine import pattern_agent
from app.modules.investigation import investigation_agent

# Coordinate center for Ward 12 (Metropolitan Demo Area)
WARD_12_CENTER = (12.9716, 77.5946)
WARD_12_STREETS = [
    "1st Main Road",
    "4th Cross Street",
    "Gandhi Nagar 2nd Avenue",
    "School Road",
    "Hospital Link Road",
    "Temple Street"
]

WATER_COMPLAINT_TEMPLATES = [
    "No water in our street for two days now.",
    "Water hasn't come for two days and the taps are completely dry.",
    "Very low water pressure in our area, cannot fill the ground sump.",
    "Only 10 minutes of water supply received this morning, very weak flow.",
    "No water near the government primary school on {street}.",
    "Drinking water supply stopped completely since yesterday morning.",
    "Our entire lane on {street} has zero municipal water pressure.",
    "Water supply is totally erratic, only trickle pressure for 15 minutes.",
    "No water in {street}, all residents are forced to order private tankers.",
    "Severe water shortage on {street} for the past 48 hours.",
    "Water pressure too weak to reach first floor tanks.",
    "Taps running dry on {street} since Monday.",
    "No Cauvery water supply in our cross road today again.",
    "Water has not come for 3 consecutive days on {street}.",
    "Low water pressure and sputtering air from municipal pipes."
]

OTHER_CATEGORIES = {
    "sanitation_waste": {
        "dept": "Solid Waste Management Department",
        "streets": ["Market Road", "Station Avenue", "Commercial Street", "Park Road", "Bazaar Lane"],
        "texts": [
            "Garbage not cleared from the corner bin for 4 days.",
            "Overflowing trash bin near the public park causing foul smell.",
            "Waste collection vehicle did not visit our street today.",
            "Rotting vegetable waste dumped near the junction.",
            "Street sweepers haven't cleared dry leaves and plastic bags.",
            "Illegal dumping of commercial debris on vacant plot."
        ]
    },
    "road_infrastructure": {
        "dept": "Roads & Civil Works Division",
        "streets": ["Ring Road Sector 3", "Bus Terminus Road", "Metro Corridor", "Industrial Lane", "Bridge Approach"],
        "texts": [
            "Dangerous deep pothole right in the middle of the road.",
            "Asphalt has completely broken down after recent rains.",
            "Unmarked high speed breaker causing vehicular accidents.",
            "Footpath paving slabs are broken and hazardous for pedestrians.",
            "Large crater near the traffic signal damaging two-wheelers.",
            "Trench dug for utility cable left unpaved and open."
        ]
    },
    "electricity_lighting": {
        "dept": "Electricity & Street Lighting Department",
        "streets": ["Lake View Road", "Church Street", "North Extension", "South Circular Road"],
        "texts": [
            "Streetlight pole not functioning, entire junction is pitch dark.",
            "Low-hanging electric wire posing serious danger to pedestrians.",
            "Streetlights flickering continuously for past two nights.",
            "Dark stretch on {street}, women feel unsafe walking after 8 PM.",
            "Automated daylight sensor fused, street lights stay off all night.",
            "Sparking observed from local distribution pole during breeze."
        ]
    },
    "sewage_drainage": {
        "dept": "Drainage & Sewerage Authority",
        "streets": ["Canal Bank Road", "Lowland Avenue", "Railway Border Road", "Old Town Street"],
        "texts": [
            "Storm water drain clogged with plastic waste and overflowing onto road.",
            "Manhole cover broken and missing near the bus stop.",
            "Foul sewage backflow in front of residential apartments.",
            "Gutter overflowing with black water after light shower.",
            "Drainage silt excavated during desilting left on roadside."
        ]
    }
}

WARDS = ["Ward 12", "Ward 3", "Ward 5", "Ward 7", "Ward 8", "Ward 15"]

def seed_database(target_count: int = 520):
    db = SessionLocal()
    try:
        print("Initializing database tables...")
        Base.metadata.create_all(bind=engine)

        # Check if already seeded
        existing_count = db.query(Complaint).count()
        if existing_count >= 500:
            print(f"Database already contains {existing_count} complaints. Skipping seed.")
            return

        # 1. Seed Default Departments
        depts_data = [
            ("Water Supply & Sewerage Board", "BWSSB", "water@civicsignal.gov", "Water distribution and sewerage networks"),
            ("Solid Waste Management Department", "SWMD", "waste@civicsignal.gov", "Garbage collection, street sweeping, disposal"),
            ("Roads & Civil Works Division", "RCWD", "roads@civicsignal.gov", "Paving, pothole repair, storm drainage culverts"),
            ("Electricity & Street Lighting Department", "ESLD", "lighting@civicsignal.gov", "Streetlights and electrical safety"),
            ("Drainage & Sewerage Authority", "DSA", "drainage@civicsignal.gov", "Underground drainage and storm drains")
        ]
        for name, code, email, desc in depts_data:
            if not db.query(Department).filter(Department.code == code).first():
                db.add(Department(name=name, code=code, contact_email=email, description=desc))

        # 2. Seed Default Users
        if not db.query(User).filter(User.username == "officer1").first():
            db.add(User(
                username="officer1",
                email="r.sharma@civicsignal.gov",
                hashed_password="pbkdf2:sha256:dummyhashofficer",
                full_name="Rajesh Sharma",
                role="officer",
                department="Water Supply & Sewerage Board"
            ))
            db.add(User(
                username="citizen1",
                email="ananya.k@example.com",
                hashed_password="pbkdf2:sha256:dummyhashcitizen",
                full_name="Ananya Kumar",
                role="citizen"
            ))
            db.add(User(
                username="admin",
                email="admin@civicsignal.gov",
                hashed_password="pbkdf2:sha256:dummyhashadmin",
                full_name="System Administrator",
                role="admin"
            ))

        db.commit()

        # 3. Create PRIMARY SCENARIO: 43 Related Complaints in Ward 12 across 6 streets over 10 days
        print("Generating primary water supply cluster: 43 related complaints in Ward 12...")
        now = datetime.datetime.utcnow()
        complaints_to_add = []
        embeddings_to_add = []

        ward_12_complaint_ids = []

        for i in range(1, 44):
            street = WARD_12_STREETS[(i - 1) % len(WARD_12_STREETS)]
            template = random.choice(WATER_COMPLAINT_TEMPLATES)
            text = template.replace("{street}", street)

            # Recurrence over last 10 days
            day_offset = (i * 10) // 44  # Spans 0 to 9 days ago
            created_at = now - datetime.timedelta(days=day_offset, hours=random.randint(1, 12), minutes=random.randint(0, 59))

            # Geographic dispersion within ~0.6 km around Ward 12 center
            lat_jitter = random.uniform(-0.0035, 0.0035)
            lon_jitter = random.uniform(-0.0035, 0.0035)
            lat = round(WARD_12_CENTER[0] + lat_jitter, 6)
            lon = round(WARD_12_CENTER[1] + lon_jitter, 6)

            cid = f"CMP-W12-WAT-{i:03d}"
            ward_12_complaint_ids.append(cid)

            # Understanding extraction
            analysis = intake_module.extract_deterministic(text, f"{street}, Ward 12")

            c = Complaint(
                complaint_id=cid,
                complaint_text=text,
                normalized_text=analysis["normalized_text"],
                category="water_supply",
                sub_issue=analysis["issue"],
                duration_text=analysis["duration"] or "2-3 days",
                severity=analysis["severity"],
                urgency_score=analysis["urgency_score"],
                location_name=f"{street}, Ward 12",
                street=street,
                ward="Ward 12",
                latitude=lat,
                longitude=lon,
                department="Water Supply & Sewerage Board",
                status="clustered",
                language="en",
                reporter_type="anonymous",
                cluster_id="CLS-WAT-001",
                created_at=created_at
            )
            complaints_to_add.append(c)

        # Batch embed Ward 12 texts
        w12_texts = [c.complaint_text for c in complaints_to_add]
        w12_embs = embedding_engine.embed_batch(w12_texts)
        for c, emb in zip(complaints_to_add, w12_embs):
            embeddings_to_add.append(ComplaintEmbedding(
                complaint_id=c.complaint_id,
                embedding_json=emb,
                model_name=embedding_engine.model_name,
                dimension=embedding_engine.dimension
            ))

        # 4. Generate remaining background complaints (~470 complaints)
        print("Generating background complaints across other wards and departments...")
        cid_counter = 44
        remaining_needed = target_count - len(complaints_to_add)

        ward_centers = {
            "Ward 3": (12.9850, 77.5800),
            "Ward 5": (12.9600, 77.6100),
            "Ward 7": (12.9450, 77.5750),
            "Ward 8": (12.9900, 77.6200),
            "Ward 12": (12.9716, 77.5946),
            "Ward 15": (12.9350, 77.6050)
        }

        bg_texts = []
        bg_complaints = []

        categories_pool = list(OTHER_CATEGORIES.keys())

        for _ in range(remaining_needed):
            cat = random.choice(categories_pool)
            cat_data = OTHER_CATEGORIES[cat]
            street = random.choice(cat_data["streets"])
            ward = random.choice(WARDS)
            tmpl = random.choice(cat_data["texts"])
            text = tmpl.replace("{street}", street)

            center = ward_centers.get(ward, WARD_12_CENTER)
            lat = round(center[0] + random.uniform(-0.015, 0.015), 6)
            lon = round(center[1] + random.uniform(-0.015, 0.015), 6)

            # Spread over last 30 days
            day_offset = random.randint(0, 28)
            created_at = now - datetime.timedelta(days=day_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))

            cid = f"CMP-{cat[:3].upper()}-{cid_counter:04d}"
            cid_counter += 1

            analysis = intake_module.extract_deterministic(text, f"{street}, {ward}")

            c = Complaint(
                complaint_id=cid,
                complaint_text=text,
                normalized_text=analysis["normalized_text"],
                category=cat,
                sub_issue=analysis["issue"],
                duration_text=analysis["duration"],
                severity=analysis["severity"],
                urgency_score=analysis["urgency_score"],
                location_name=f"{street}, {ward}",
                street=street,
                ward=ward,
                latitude=lat,
                longitude=lon,
                department=cat_data["dept"],
                status="submitted",
                language="en",
                reporter_type="anonymous",
                created_at=created_at
            )
            bg_complaints.append(c)
            bg_texts.append(text)

        # Batch embed background complaints
        bg_embs = embedding_engine.embed_batch(bg_texts)
        for c, emb in zip(bg_complaints, bg_embs):
            embeddings_to_add.append(ComplaintEmbedding(
                complaint_id=c.complaint_id,
                embedding_json=emb,
                model_name=embedding_engine.model_name,
                dimension=embedding_engine.dimension
            ))

        # Save all complaints & embeddings
        print(f"Saving {len(complaints_to_add) + len(bg_complaints)} complaints to database...")
        db.bulk_save_objects(complaints_to_add + bg_complaints)
        db.bulk_save_objects(embeddings_to_add)
        db.commit()

        # 5. Create Seed Primary Cluster for Ward 12 Water Issue
        print("Constructing primary cluster and pattern PAT-001...")
        primary_cluster = Cluster(
            cluster_id="CLS-WAT-001",
            dominant_category="water_supply",
            complaint_count=43,
            avg_similarity=0.88,
            geo_center_lat=WARD_12_CENTER[0],
            geo_center_lon=WARD_12_CENTER[1],
            geo_radius_km=0.64,
            primary_ward="Ward 12",
            temporal_span_days=9.8,
            first_complaint_at=now - datetime.timedelta(days=10),
            last_complaint_at=now - datetime.timedelta(hours=2),
            representative_complaints_json=[
                {"complaint_id": "CMP-W12-WAT-001", "text": "No water in our street for two days now.", "street": "1st Main Road", "ward": "Ward 12", "severity": "high"},
                {"complaint_id": "CMP-W12-WAT-005", "text": "Very low water pressure in our area, cannot fill the ground sump.", "street": "4th Cross Street", "ward": "Ward 12", "severity": "high"},
                {"complaint_id": "CMP-W12-WAT-012", "text": "Only 10 minutes of water supply received this morning, very weak flow.", "street": "School Road", "ward": "Ward 12", "severity": "high"}
            ],
            complaint_ids_json=ward_12_complaint_ids,
            status="ACTIVE"
        )
        db.add(primary_cluster)

        # 6. Create Seed Pattern PAT-001
        pattern_001 = Pattern(
            pattern_id="PAT-001",
            title="Recurring Water Supply Disruption — Ward 12 Corridor",
            category="water_supply",
            ward="Ward 12",
            cluster_id="CLS-WAT-001",
            pattern_strength=0.86,
            complaint_count=43,
            temporal_recurrence_days=10.0,
            affected_streets_json=WARD_12_STREETS,
            baseline_frequency=1.1,
            observed_frequency=4.4,
            spike_ratio=4.0,
            avg_semantic_similarity=0.88,
            summary=(
                "AI Pattern Detection: 43 semantically related complaints concentrated across 6 streets in Ward 12 "
                "demonstrate persistent recurrence over 10 days with a 4.0x elevation above historical baseline. "
                "Evidence indicates a localized infrastructure disruption requiring field verification."
            ),
            status="PENDING_REVIEW",
            requires_human_validation=True
        )
        db.add(pattern_001)

        # 7. Seed Pattern Evidence Trail
        evidences = [
            PatternEvidence(
                pattern_id="PAT-001",
                evidence_type="CLUSTER_VOLUME",
                title="Semantically Coherent Cluster (43 Complaints)",
                description="43 complaints clustered with an average pairwise cosine similarity of 0.88, referencing dry taps, low pressure, and truncated supply hours.",
                metric_value=43.0,
                metric_label="Complaints",
                details_json={"cluster_id": "CLS-WAT-001", "sample_count": 43}
            ),
            PatternEvidence(
                pattern_id="PAT-001",
                evidence_type="GEOGRAPHIC_CLUSTER",
                title="Localized Geographic Bounding (6 Connected Streets)",
                description="Complaints are tightly concentrated within a 0.64 km radius corridor spanning 1st Main Road, 4th Cross Street, Gandhi Nagar 2nd Ave, School Road, Hospital Link Rd, and Temple Street.",
                metric_value=0.64,
                metric_label="Radius (km)",
                details_json={"center_lat": WARD_12_CENTER[0], "center_lon": WARD_12_CENTER[1], "streets": WARD_12_STREETS}
            ),
            PatternEvidence(
                pattern_id="PAT-001",
                evidence_type="TEMPORAL_RECURRENCE",
                title="10-Day Persistent Recurrence",
                description="Complaints occurred across each of the preceding 10 calendar days without natural decay, demonstrating that the grievance is persistent rather than a transient blip.",
                metric_value=10.0,
                metric_label="Recurrence Days",
                details_json={"span_days": 10.0, "observed_rate": 4.4}
            ),
            PatternEvidence(
                pattern_id="PAT-001",
                evidence_type="BASELINE_SPIKE",
                title="Significant Spike Ratio (4.0x Above Baseline)",
                description="Observed frequency of 4.4 complaints/day sharply exceeds the 30-day moving average baseline of 1.1 complaints/day for water supply in Ward 12.",
                metric_value=4.0,
                metric_label="Spike Ratio",
                details_json={"baseline": 1.1, "observed": 4.4}
            )
        ]
        for ev in evidences:
            db.add(ev)

        # 8. Seed Default Investigation Checklist for PAT-001
        inv_items = investigation_agent.generate_checklist({
            "category": "water_supply",
            "affected_streets_json": WARD_12_STREETS
        })
        investigation_001 = Investigation(
            investigation_id="INV-001",
            pattern_id="PAT-001",
            title="Field Verification: Ward 12 Water Distribution Network",
            checklist_json=inv_items,
            status="RECOMMENDED",
            assigned_to=None,
            findings="Awaiting officer validation to dispatch technical inspection team."
        )
        db.add(investigation_001)

        # 9. Seed Audit Logs
        db.add(AuditLog(
            actor_id="CIVICSIGNAL_AGENT",
            actor_name="CivicSignal Orchestration Engine",
            actor_role="AI_AGENT",
            action_type="PATTERN_GENERATED",
            entity_type="pattern",
            entity_id="PAT-001",
            details_json={
                "complaints_count": 43,
                "ward": "Ward 12",
                "pattern_strength": 0.86,
                "reason": "4.0x spike ratio, 0.88 similarity, 6 affected streets over 10 days"
            }
        ))

        db.commit()
        print("Database successfully seeded with 500+ complaints, primary cluster CLS-WAT-001, and pattern PAT-001.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
