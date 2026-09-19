"""
Step 5a: Department Classification
Uses facebook/bart-large-mnli for zero-shot classification.
Fallback: typeform/distilbart-mnli-12-3 if CPU-only and bart-large is too slow.
"""
from transformers import pipeline

# ─── IMPORTANT ───────────────────────────────────────────────────────────────
# Replace/extend this list with the EXACT names from your NestJS backend's
# seed.data.ts → serviceCategories. These must match exactly (case-sensitive)
# so that NestJS can map the predicted department back to a real category.
# ─────────────────────────────────────────────────────────────────────────────
DEPARTMENTS = [
    "roads",
    "water",
    "drainage",
    "lighting",
    "sanitation",
    "green"
]
CONFIDENCE_THRESHOLD = 0.4

# Load once at module level — takes 30-60s on first import (downloads ~1.6GB model)
# If your machine is CPU-only and this is unbearably slow, swap the model string:
#   model="typeform/distilbart-mnli-12-3"   (3x smaller, slightly less accurate)
print("Loading zero-shot classifier (facebook/bart-large-mnli)...")
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli",
)
print("✅ Classifier loaded.")

def classify_department(text: str, candidate_labels: list = None) -> dict:
    """
    Classify english_text into one of the DEPARTMENTS using zero-shot classification.
    Returns:
        {
            "department": "water" | "Unclassified",
            "confidence": 0.87,
            "needs_manual_review": False | True
        }
    """
    if candidate_labels is None:
        candidate_labels = DEPARTMENTS

    if not text or not text.strip():
        return {
            "department": "Unclassified",
            "confidence": 0.0,
            "needs_manual_review": True,
        }

    result = classifier(text, candidate_labels)
    top_label = result["labels"][0]
    top_score = round(result["scores"][0], 2)

    if top_score < CONFIDENCE_THRESHOLD:
        return {
            "department": "Unclassified",
            "confidence": top_score,
            "needs_manual_review": True,
        }

    return {
        "department": top_label,
        "confidence": top_score,
        "needs_manual_review": False,
    }
