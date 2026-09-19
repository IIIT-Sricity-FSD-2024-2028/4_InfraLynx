"""
Step 5c: Urgency Estimation
Uses a deterministic, explainable weighted-keyword scorer.
NOT using sentiment analysis (VADER etc.) — sentiment measures emotional
tone ("I'm furious"), not actual severity ("gas leak"). A calmly worded
gas leak report should rank higher than an angry pothole complaint.
"""

# ─── Keyword weights ─────────────────────────────────────────────────────────
# Tune these after testing with Karthik's real translated outputs.
# Keep the scoring logic unchanged; just adjust dictionary contents.
# ──────────────────────────────────────────────────────────────────────────────

URGENCY_SIGNALS = {
    # Critical — safety / life-threatening (weight 3)
    "fire": 3,
    "flood": 3,
    "collapse": 3,
    "collapsed": 3,
    "gas leak": 3,
    "electric shock": 3,
    "electrocution": 3,
    "accident": 3,
    "danger": 3,
    "dangerous": 3,
    "life threatening": 3,

    # High — service-down / health-risk (weight 2)
    "no water": 2,
    "no electricity": 2,
    "no power": 2,
    "power cut": 2,
    "sewage": 2,
    "overflow": 2,
    "overflowing": 2,
    "contaminated": 2,
    "open drain": 2,
    "short circuit": 2,

    # Contributing factors — push score up, don't decide alone (weight 1-2)
    "broken": 1.5,
    "blocked": 1.5,
    "damaged": 1.5,
    "leaking": 1.5,
    "leak": 1.5,
    "pothole": 1,
    "week": 1.5,
    "weeks": 1.5,
    "month": 2,
    "months": 2.5,
    "year": 3,

    # Escalation signals — citizen has waited / feels ignored
    "no action": 1.5,
    "still pending": 1.5,
    "complained before": 2,
    "multiple complaints": 2,
    "ignored": 1.5,
    "no response": 1.5,
    "urgent": 1.5,
    "emergency": 2,
}

def score_urgency(text: str) -> float:
    """
    Sum up weights of all matching urgency keywords found in the text.
    """
    text_lower = text.lower()
    return sum(
        weight
        for keyword, weight in URGENCY_SIGNALS.items()
        if keyword in text_lower
    )

def urgency_label(score: float) -> str:
    """
    Map a numeric urgency score to a human-readable label.
    """
    if score >= 3:
        return "Critical"
    elif score >= 2:
        return "High"
    elif score >= 1:
        return "Medium"
    else:
        return "Low"

def estimate_urgency(text: str) -> dict:
    """
    Estimate how urgent/serious a complaint is based on keyword signals.
    Returns:
        {
            "score": 2.0,
            "label": "High"
        }
    """
    if not text or not text.strip():
        return {"score": 0, "label": "Low"}

    score = score_urgency(text)
    return {"score": score, "label": urgency_label(score)}
