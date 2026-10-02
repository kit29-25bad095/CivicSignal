import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

INVESTIGATION_TEMPLATES = {
    "water_supply": [
        {"id": "INV-01", "item": "Verify physical pressure at terminal points across affected streets.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-02", "item": "Inspect primary distribution feeder valve and main junction pipelines for leaks or blockages.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-03", "item": "Cross-reference municipal water pumping station logs for schedule curtailments or pressure drops.", "status": "PENDING", "priority": "MEDIUM"},
        {"id": "INV-04", "item": "Review maintenance or unnotified construction work records along the supply corridor.", "status": "PENDING", "priority": "MEDIUM"},
        {"id": "INV-05", "item": "Perform sample water quality / contamination test at affected consumer taps.", "status": "PENDING", "priority": "MEDIUM"},
        {"id": "INV-06", "item": "Interview resident representatives and local ward pump operator.", "status": "PENDING", "priority": "LOW"}
    ],
    "sanitation_waste": [
        {"id": "INV-01", "item": "Audit garbage collection vehicle GPS telemetry and route logs for the past 10 days.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-02", "item": "Inspect physical secondary collection bin locations and designated collection spots.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-03", "item": "Verify private commercial waste disposal or unauthorized dump activity in the vicinity.", "status": "PENDING", "priority": "MEDIUM"},
        {"id": "INV-04", "item": "Review sanitation staff attendance and shift logs for the assigned ward beat.", "status": "PENDING", "priority": "MEDIUM"}
    ],
    "road_infrastructure": [
        {"id": "INV-01", "item": "Conduct engineering visual inspection and measure crater depth across reported streets.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-02", "item": "Check utility trenching permits (telecom, gas, water lines) issued in the last 6 months.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-03", "item": "Deploy temporary warning barricades and signage around critical road hazards.", "status": "PENDING", "priority": "CRITICAL"},
        {"id": "INV-04", "item": "Verify contractor defect liability period (DLP) status for recent paving contracts.", "status": "PENDING", "priority": "MEDIUM"}
    ],
    "electricity_lighting": [
        {"id": "INV-01", "item": "Survey street lighting feeder pillar circuit breakers and automated daylight timers.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-02", "item": "Inspect physical poles and overhead cables for low-hanging lines or insulation damage.", "status": "PENDING", "priority": "CRITICAL"},
        {"id": "INV-03", "item": "Check local distribution transformer load balance and phase failure logs.", "status": "PENDING", "priority": "MEDIUM"}
    ],
    "sewage_drainage": [
        {"id": "INV-01", "item": "Inspect storm water drain outfall and silt accumulation levels.", "status": "PENDING", "priority": "HIGH"},
        {"id": "INV-02", "item": "Check for open or fractured manhole lids requiring immediate safety covers.", "status": "PENDING", "priority": "CRITICAL"},
        {"id": "INV-03", "item": "Verify illegal sewage connections routed into storm water drains.", "status": "PENDING", "priority": "MEDIUM"}
    ]
}

DEFAULT_CHECKLIST = [
    {"id": "INV-01", "item": "Conduct initial field verification at focal coordinates.", "status": "PENDING", "priority": "HIGH"},
    {"id": "INV-02", "item": "Review departmental dispatch and maintenance records for the last 14 days.", "status": "PENDING", "priority": "MEDIUM"},
    {"id": "INV-03", "item": "Interview resident representatives and inspect physical infrastructure.", "status": "PENDING", "priority": "MEDIUM"}
]

class InvestigationAgent:
    """
    Step 11 — Investigation Agent.
    Generates structured, actionable verification checklists for field officers.
    Can be enriched with Gemini for contextual nuances.
    """
    def __init__(self):
        self.gemini_client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception:
                pass

    def generate_checklist(self, pattern: Dict[str, Any]) -> List[Dict[str, Any]]:
        category = pattern.get("category", "general")
        base_items = INVESTIGATION_TEMPLATES.get(category, DEFAULT_CHECKLIST)
        checklist = [dict(item) for item in base_items]

        # Add location-specific note if affected streets exist
        streets = pattern.get("affected_streets_json") or pattern.get("affected_streets") or []
        if streets:
            streets_text = ", ".join(streets[:4])
            checklist.insert(0, {
                "id": "INV-LOC",
                "item": f"Prioritize on-site field visits across target corridor: {streets_text}.",
                "status": "PENDING",
                "priority": "HIGH"
            })

        return checklist

investigation_agent = InvestigationAgent()
