"""
Steps 3 & 4: Translation to English + Normalization
Owner: Karthik

This is the main entry point for Karthik's work.
"""
from translate import translate_to_english
from normalize import normalize_text

def translate_and_normalize(input_dict: dict) -> dict:
    """
    Stub for Karthik's translate_and_normalize() — passes English through.
    Karthik: Implement this using IndicTrans2 and spaCy.
    """
    return {
        "original_text": input_dict.get("original_text", ""),
        "detected_language": input_dict.get("detected_language", "eng"),
        "english_text": input_dict.get("native_script_text", input_dict.get("original_text", "")).lower().strip(),
        "confidence": input_dict.get("confidence", 1.0),
    }
