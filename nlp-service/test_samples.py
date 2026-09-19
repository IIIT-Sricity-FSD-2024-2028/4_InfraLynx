"""
Test suite for Steps 5-6: Classification, Entity Extraction, Urgency.
Run this to verify your code works before integrating with Aayush and Karthik.
Uses the 8 shared test sentences (English translations that Karthik would produce).

Usage:
    python test_samples.py
"""
from classify import classify_department
from entities import extract_entities
from urgency import estimate_urgency
from classify_route import classify_and_route
import json

def separator(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def pp(obj):
    """Pretty-print a dict."""
    print(json.dumps(obj, indent=2, default=str))

# ─── Test data ────────────────────────────────────────────────────────────────
# These simulate what Karthik's translate_and_normalize() would produce
# for each of the 8 shared test sentences.
TEST_INPUTS = [
    {
        "id": 1,
        "description": "Hindi → Electricity complaint",
        "input": {
            "original_text": "मेरी बिजली 2 दिन से नहीं आ रही है",
            "detected_language": "hin",
            "english_text": "my electricity has not come for the past 2 days",
            "confidence": 0.91,
        },
        "expected_department": "lighting",
    },
    {
        "id": 2,
        "description": "Hindi (was Roman) → Electricity complaint",
        "input": {
            "original_text": "meri bijli 2 din se nahi aa rahi hai",
            "detected_language": "hin",
            "english_text": "my electricity has not come for the past 2 days",
            "confidence": 0.91,
        },
        "expected_department": "lighting",
    },
    {
        "id": 3,
        "description": "Tamil → Water complaint",
        "input": {
            "original_text": "என் பகுதியில் 3 நாட்களாக தண்ணீர் இல்லை",
            "detected_language": "tam",
            "english_text": "no water in my area for 3 days",
            "confidence": 0.88,
        },
        "expected_department": "water",
    },
    {
        "id": 4,
        "description": "Tamil (was Roman) → Water complaint",
        "input": {
            "original_text": "en pakuthiyil 3 naatkalaga thanni illai",
            "detected_language": "tam",
            "english_text": "there is no water in my area for 3 days",
            "confidence": 0.85,
        },
        "expected_department": "water",
    },
    {
        "id": 5,
        "description": "Telugu → Water complaint",
        "input": {
            "original_text": "మా వీధిలో మూడు రోజుల నుండి నీరు లేదు",
            "detected_language": "tel",
            "english_text": "no water in our street for 3 days",
            "confidence": 0.89,
        },
        "expected_department": "water",
    },
    {
        "id": 6,
        "description": "Telugu (was Roman) → Water complaint",
        "input": {
            "original_text": "maa veedhilo moodu rojula nunchi neeru ledu",
            "detected_language": "tel",
            "english_text": "there is no water in our street for 3 days",
            "confidence": 0.84,
        },
        "expected_department": "water",
    },
    {
        "id": 7,
        "description": "English → Water complaint",
        "input": {
            "original_text": "Water supply has been cut for 3 days",
            "detected_language": "eng",
            "english_text": "water supply has been cut for 3 days",
            "confidence": 0.99,
        },
        "expected_department": "water",
    },
    {
        "id": 8,
        "description": "Mixed/ambiguous → likely low confidence",
        "input": {
            "original_text": "meri complaint abhi tak pending hai",
            "detected_language": "hin",
            "english_text": "my complaint is still pending",
            "confidence": 0.72,
        },
        "expected_department": "Unclassified",
    },
]

def test_classify():
    separator("TESTING: classify_department()")
    for test in TEST_INPUTS:
        result = classify_department(test["input"]["english_text"])
        match = "✅" if result["department"] == test["expected_department"] else "⚠️"
        print(f"\n  {match} Test #{test['id']}: {test['description']}")
        print(f"     Input:    \"{test['input']['english_text']}\"")
        print(f"     Got:      {result['department']} ({result['confidence']})")
        print(f"     Expected: {test['expected_department']}")
        if result["needs_manual_review"]:
            print(f"     ⚡ Flagged for manual review")

def test_entities():
    separator("TESTING: extract_entities()")
    for test in TEST_INPUTS:
        result = extract_entities(test["input"]["english_text"])
        print(f"\n  Test #{test['id']}: {test['description']}")
        print(f"     Input:    \"{test['input']['english_text']}\"")
        pp(result)

def test_urgency():
    separator("TESTING: estimate_urgency()")
    for test in TEST_INPUTS:
        result = estimate_urgency(test["input"]["english_text"])
        print(f"\n  Test #{test['id']}: {test['description']}")
        print(f"     Input:    \"{test['input']['english_text']}\"")
        print(f"     Urgency:  {result['label']} (score={result['score']})")

    # Additional urgency edge cases
    separator("TESTING: urgency edge cases")
    edge_cases = [
        ("there is a gas leak near my house", "Critical"),
        ("my street light has been off for a week", "Medium"),
        ("pothole on the road", "Medium"),
        ("the building is about to collapse and there is danger", "Critical"),
        ("sewage overflow in our street for 2 months, no action taken", "High"),
        ("please fix the park bench", "Low"),
    ]

    for text, expected in edge_cases:
        result = estimate_urgency(text)
        match = "✅" if result["label"] == expected else "⚠️"
        print(f"  {match} \"{text}\"")
        print(f"     Got: {result['label']} (score={result['score']}), Expected: {expected}")

def test_full_pipeline():
    separator("TESTING: classify_and_route() — full Step 5-6 output")
    for test in TEST_INPUTS:
        result = classify_and_route(test["input"])
        print(f"\n  Test #{test['id']}: {test['description']}")
        pp(result)

if __name__ == "__main__":
    print("\n" + "🧪 InfraLynx NLP — Step 5-6 Test Suite" + "\n")
    test_classify()
    test_entities()
    test_urgency()
    test_full_pipeline()
    separator("ALL TESTS COMPLETE")
    print("  Review the output above for any ⚠️ mismatches.")
    print("  Share the full test_full_pipeline() output with Aayush and Karthik.\n")
