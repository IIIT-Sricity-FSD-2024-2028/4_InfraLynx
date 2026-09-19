"""
Steps 5 & 6 combined: Classification + Entity Extraction + Urgency + Routing.
This is Yshasvee's final deliverable function.
Takes Karthik's output (clean English text) and produces the structured
complaint object that gets attached to the InfraLynx request.

Usage:
    from classify_route import classify_and_route
"""
from classify import classify_department
from entities import extract_entities
from urgency import estimate_urgency

def classify_and_route(input_dict: dict) -> dict:
    """
    Full Step 5-6 pipeline:
    1. Classify complaint into a department (zero-shot)
    2. Extract entities (duration, location, previous complaint)
    3. Estimate urgency (keyword scorer)
    4. Package everything into the output contract

    Args:
        input_dict: Karthik's output:
            {
                "original_text": "meri bijli 2 din se nahi aa rahi hai",
                "detected_language": "hin",
                "english_text": "my electricity has not come for the past 2 days",
                "confidence": 0.91
            }

    Returns:
        {
            "original_text": "...",
            "detected_language": "hin",
            "english_text": "my electricity has not come for the past 2 days",
            "department": "Electricity",
            "department_confidence": 0.87,
            "needs_manual_review": false,
            "entities": {
                "duration": "2 days",
                "location": null,
                "previous_complaint": false
            },
            "urgency": {
                "score": 2.0,
                "label": "Medium"
            }
        }
    """
    text = input_dict.get("english_text", "")

    # Step 5a: Department classification
    dept_result = classify_department(text)

    # Step 5b: Entity extraction
    entities = extract_entities(text)

    # Step 5c: Urgency estimation
    urgency = estimate_urgency(text)

    # Step 6: Package for routing — department is the routing key.
    # Officer assignment is a NestJS business rule, NOT an NLP task.
    return {
        "original_text": input_dict.get("original_text", ""),
        "detected_language": input_dict.get("detected_language", ""),
        "english_text": text,
        "department": dept_result["department"],
        "department_confidence": dept_result["confidence"],
        "needs_manual_review": dept_result["needs_manual_review"],
        "entities": entities,
        "urgency": urgency,
    }
