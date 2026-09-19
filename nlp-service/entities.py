"""
Step 5b: Entity Extraction
Uses spaCy NER for duration/location, regex fallback for duration,
keyword matching for previous-complaint detection.
"""
import re
import spacy

# Load once at module level
print("Loading spaCy en_core_web_sm for entity extraction...")
nlp = spacy.load("en_core_web_sm")
print("✅ spaCy model loaded.")

# Regex fallback for duration — catches "3 days", "2 hours", "1 week", etc.
DURATION_REGEX = re.compile(
    r"(\d+)\s*(days?|hours?|weeks?|months?|years?)", re.IGNORECASE
)

# Keywords/phrases indicating the citizen has complained about this before
PREVIOUS_COMPLAINT_PHRASES = [
    "already complained",
    "complained before",
    "previous complaint",
    "no action",
    "again",
    "still not resolved",
    "reported earlier",
    "still pending",
    "follow up",
    "followup",
    "reminder",
    "second time",
    "third time",
    "multiple times",
    "repeatedly",
    "no response",
    "ignored",
]

def extract_duration_and_location(text: str) -> dict:
    """
    Extract duration (how long the problem has lasted) and location from text.
    Uses spaCy NER for DATE/TIME and GPE/LOC/FAC entities, with a regex
    fallback for duration patterns that spaCy's general English model misses.
    Note: spaCy's English NER was trained on news/general text, not civic
    complaints. It catches named places well ("MG Road", "Marikina") but
    misses vague references like "my area" or "our street" — those aren't
    named entities. This is a known limitation.
    """
    doc = nlp(text)
    duration = None
    location = None

    for ent in doc.ents:
        if ent.label_ in ("DATE", "TIME") and duration is None:
            duration = ent.text
        elif ent.label_ in ("GPE", "LOC", "FAC") and location is None:
            location = ent.text

    # Regex fallback if spaCy's NER missed the duration
    if duration is None:
        match = DURATION_REGEX.search(text)
        if match:
            duration = match.group(0)

    return {"duration": duration, "location": location}

def detect_previous_complaint(text: str) -> bool:
    """
    Check if the complaint text indicates the citizen has raised this
    issue before (follow-up / repeated complaint).
    """
    text_lower = text.lower()
    return any(phrase in text_lower for phrase in PREVIOUS_COMPLAINT_PHRASES)

def extract_entities(text: str) -> dict:
    """
    Combined entity extraction: duration, location, and previous-complaint flag.
    Returns:
        {
            "duration": "2 days" | None,
            "location": "MG Road" | None,
            "previous_complaint": True | False
        }
    """
    if not text or not text.strip():
        return {"duration": None, "location": None, "previous_complaint": False}

    result = extract_duration_and_location(text)
    result["previous_complaint"] = detect_previous_complaint(text)
    return result
