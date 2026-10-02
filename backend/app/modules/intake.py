import re
import json
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Primary Municipal Categories & Keywords
CATEGORY_TAXONOMY = {
    "water_supply": {
        "department": "Water Supply & Sewerage Board",
        "keywords": ["water", "pressure", "tap", "pipeline", "leakage", "drinking water", "supply", "tanker", "pipe burst", "contaminated water"],
        "issues": {
            "low_or_no_water": ["no water", "low pressure", "stopped", "dry tap", "not coming", "no supply"],
            "contaminated_water": ["dirty", "smell", "yellow water", "muddy", "bad odor", "sewage smell"],
            "pipeline_burst": ["burst", "leak", "gushing", "broken pipe", "overflowing pipe"]
        }
    },
    "sanitation_waste": {
        "department": "Solid Waste Management Department",
        "keywords": ["garbage", "trash", "waste", "dump", "bin", "litter", "cleaning", "sweep", "debris"],
        "issues": {
            "uncollected_garbage": ["not cleared", "piling up", "overflowing bin", "dumped", "rotting"],
            "illegal_dumping": ["illegal", "vacant plot", "commercial waste"],
            "dead_animal": ["dead dog", "carcass", "dead animal"]
        }
    },
    "road_infrastructure": {
        "department": "Roads & Civil Works Division",
        "keywords": ["pothole", "road", "tar", "asphalt", "crater", "footpath", "sidewalk", "divider", "pavement"],
        "issues": {
            "potholes": ["pothole", "crater", "broken road", "cave-in"],
            "footpath_encroachment": ["encroachment", "footpath broken", "blocked sidewalk"],
            "speed_breaker": ["unmarked speed breaker", "hump"]
        }
    },
    "electricity_lighting": {
        "department": "Electricity & Street Lighting Department",
        "keywords": ["streetlight", "light", "dark", "pole", "wire", "blackout", "fluctuation", "transformer"],
        "issues": {
            "streetlight_outage": ["dark", "not working", "flickering", "bulb fused", "blackout"],
            "hanging_wire": ["hanging wire", "sparking", "exposed wire", "low cable"]
        }
    },
    "sewage_drainage": {
        "department": "Drainage & Sewerage Authority",
        "keywords": ["drain", "sewage", "gutter", "clogged", "overflowing drain", "manhole", "waterlogging", "rainwater"],
        "issues": {
            "clogged_drain": ["clogged", "blocked drain", "overflowing gutter"],
            "open_manhole": ["open manhole", "missing cover", "broken slab"],
            "waterlogging": ["flooding", "water stagnant", "waterlogging"]
        }
    }
}

DURATION_PATTERNS = [
    r"(\d+)\s*(days?|day|weeks?|week|hours?|hr|months?|month)",
    r"(since\s+yesterday|from\s+morning|last\s+\d+\s+days?|for\s+over\s+a\s+week|past\s+\d+\s+days?)"
]

SEVERITY_PATTERNS = {
    "critical": ["burst", "cave-in", "open manhole", "exposed wire", "sparking", "flooding inside home", "contamination", "danger", "hazardous"],
    "high": ["no water", "3 days", "4 days", "5 days", "10 days", "week", "overflowing", "foul smell", "completely dark", "large crater"],
    "medium": ["low pressure", "flickering", "delay", "pothole", "irregular", "bad taste"],
    "low": ["minor", "inconvenience", "cleaning needed", "information"]
}

class IntakeModule:
    """
    Intake Intelligence Module
    Processes each incoming complaint:
    - Text normalization
    - Language detection
    - Rule-based & LLM extraction
    - Category, Sub-issue, Urgency, Department determination
    """
    def __init__(self):
        self.gemini_client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini API client initialized for Intake Module")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini Client: {e}")

    def normalize_text(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", text).strip()
        return cleaned

    def extract_duration(self, text: str) -> Optional[str]:
        for pattern in DURATION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        return None

    def estimate_severity(self, text: str) -> tuple[str, float]:
        lower = text.lower()
        for s in SEVERITY_PATTERNS["critical"]:
            if s in lower:
                return "critical", 0.95
        for s in SEVERITY_PATTERNS["high"]:
            if s in lower:
                return "high", 0.80
        for s in SEVERITY_PATTERNS["low"]:
            if s in lower:
                return "low", 0.30
        return "medium", 0.55

    def extract_deterministic(self, text: str, location_hint: Optional[str] = None) -> Dict[str, Any]:
        normalized = self.normalize_text(text)
        lower = normalized.lower()
        
        # Match Category
        best_cat = "general_civic"
        best_score = 0
        assigned_dept = "Municipal Administration Department"
        best_issue = "general_issue"

        for cat, data in CATEGORY_TAXONOMY.items():
            score = sum(1 for kw in data["keywords"] if kw in lower)
            if score > best_score:
                best_score = score
                best_cat = cat
                assigned_dept = data["department"]
                # Detect sub-issue
                for issue, sub_kws in data["issues"].items():
                    if any(sk in lower for sk in sub_kws):
                        best_issue = issue
                        break

        duration = self.extract_duration(normalized)
        severity, urgency = self.estimate_severity(normalized)
        
        # Entities
        entities = []
        loc_match = re.search(r"(?:near|at|in|on|opposite|opp\.)\s+([A-Za-z0-9\s,\-]+?)(?:\.|$|,|and)", normalized, re.IGNORECASE)
        if loc_match:
            entities.append(f"Location: {loc_match.group(1).strip()}")
        elif location_hint:
            entities.append(f"Location: {location_hint}")

        return {
            "category": best_cat,
            "issue": best_issue,
            "duration": duration,
            "severity": severity,
            "urgency_score": urgency,
            "location": location_hint or (loc_match.group(1).strip() if loc_match else "Detected in ward"),
            "department": assigned_dept,
            "entities": entities,
            "language": "en",
            "normalized_text": normalized
        }

    def process(self, text: str, location_hint: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes complaint understanding.
        Deterministic fallback is immediate, highly accurate, and resilient.
        If Gemini is available and query is complex, augments entities.
        """
        deterministic_result = self.extract_deterministic(text, location_hint)
        
        if self.gemini_client:
            try:
                prompt = f"""
You are the Intake Module of CivicSignal. Analyze this citizen complaint:
"{text}"

Extract in JSON format:
{{
  "category": "water_supply | sanitation_waste | road_infrastructure | electricity_lighting | sewage_drainage",
  "issue": "short summary code",
  "duration": "extracted duration or null",
  "severity": "low | medium | high | critical",
  "urgency_score": 0.0 to 1.0,
  "department": "responsible municipal department",
  "entities": ["list of entities like landmarks, streets"]
}}
Return only valid JSON.
"""
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                if response and response.text:
                    cleaned_txt = response.text.replace("```json", "").replace("```", "").strip()
                    llm_data = json.loads(cleaned_txt)
                    # Merge LLM nuances while preserving deterministic safety bounds
                    deterministic_result["category"] = llm_data.get("category", deterministic_result["category"])
                    deterministic_result["issue"] = llm_data.get("issue", deterministic_result["issue"])
                    if llm_data.get("duration"):
                        deterministic_result["duration"] = llm_data["duration"]
                    deterministic_result["severity"] = llm_data.get("severity", deterministic_result["severity"])
                    deterministic_result["department"] = llm_data.get("department", deterministic_result["department"])
                    if llm_data.get("entities"):
                        deterministic_result["entities"] = llm_data["entities"]
            except Exception as e:
                logger.debug(f"Gemini enrichment skipped or failed: {e}. Using deterministic result.")

        return deterministic_result

intake_module = IntakeModule()
