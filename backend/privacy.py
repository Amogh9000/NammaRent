"""
Privacy Layer for Namma Tenant Navigator.
Guarantees local PII masking with stable placeholders, Microsoft Presidio,
custom Indian & Bengaluru recognizers, and strict pre-LLM leakage guards.
"""

import re
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine

class PrivacyLeakException(Exception):
    """Raised when raw PII from the local vault is detected in outgoing LLM prompts."""
    pass

class MaskResult(BaseModel):
    masked_text: str
    placeholders_detected: Dict[str, str]  # { placeholder: entity_type }
    anonymized_count: int

class SessionVault:
    def __init__(self, session_id: str):
        self.session_id = session_id
        # Map: placeholder -> real_value (e.g. "[TENANT_NAME]" -> "Aarav Sharma")
        self.placeholder_to_real: Dict[str, str] = {}
        # Map: normalized_real_value -> placeholder
        self.real_to_placeholder: Dict[str, str] = {}
        # Counters for numbered placeholders
        self.counters: Dict[str, int] = {
            "PHONE": 0,
            "EMAIL": 0,
            "AADHAAR": 0,
            "PAN": 0,
            "ADDRESS": 0,
            "PINCODE": 0
        }

    def register(self, entity_type: str, real_value: Optional[str]) -> Optional[str]:
        if not real_value or not real_value.strip():
            return None
        clean_val = real_value.strip()
        norm_key = clean_val.lower()

        if norm_key in self.real_to_placeholder:
            return self.real_to_placeholder[norm_key]

        if entity_type in ["TENANT_NAME", "LANDLORD_NAME", "PROPERTY_ADDRESS"]:
            placeholder = f"[{entity_type}]"
        else:
            self.counters[entity_type] = self.counters.get(entity_type, 0) + 1
            placeholder = f"[{entity_type}_{self.counters[entity_type]}]"

        self.placeholder_to_real[placeholder] = clean_val
        self.real_to_placeholder[norm_key] = placeholder
        return placeholder

    def get_real(self, placeholder: str) -> Optional[str]:
        return self.placeholder_to_real.get(placeholder)

    def get_all_vault_items(self) -> Dict[str, str]:
        return dict(self.placeholder_to_real)


class PrivacyEngine:
    _instance = None

    def __init__(self):
        self.vaults: Dict[str, SessionVault] = {}
        self.analyzer = self._init_presidio_analyzer()
        self.anonymizer = AnonymizerEngine()

    @classmethod
    def get_instance(cls) -> "PrivacyEngine":
        if cls._instance is None:
            cls._instance = PrivacyEngine()
        return cls._instance

    def _init_presidio_analyzer(self) -> AnalyzerEngine:
        # We initialize Presidio with standard and custom recognizers
        try:
            analyzer = AnalyzerEngine()
        except Exception:
            # Fallback if spacy model is loading lazily
            analyzer = AnalyzerEngine(supported_languages=["en"])

        # 1. Indian Phone Numbers (+91 or 0, starting with 6, 7, 8, 9, 10 digits)
        phone_pattern = Pattern(
            name="in_phone_pattern",
            regex=r"(?:(?:\+91[\-\s]?)?|0)?[6-9]\d{9}\b",
            score=0.9
        )
        phone_recognizer = PatternRecognizer(
            supported_entity="IN_PHONE",
            patterns=[phone_pattern]
        )
        analyzer.registry.add_recognizer(phone_recognizer)

        # 2. Indian Aadhaar Number (12 digits, often with space/hyphen)
        aadhaar_pattern = Pattern(
            name="in_aadhaar_pattern",
            regex=r"\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b",
            score=0.9
        )
        aadhaar_recognizer = PatternRecognizer(
            supported_entity="IN_AADHAAR",
            patterns=[aadhaar_pattern]
        )
        analyzer.registry.add_recognizer(aadhaar_recognizer)

        # 3. Indian PAN Card (5 letters, 4 digits, 1 letter)
        pan_pattern = Pattern(
            name="in_pan_pattern",
            regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
            score=0.95
        )
        pan_recognizer = PatternRecognizer(
            supported_entity="IN_PAN",
            patterns=[pan_pattern]
        )
        analyzer.registry.add_recognizer(pan_recognizer)

        # 4. Bengaluru PIN Codes (560xxx)
        pin_pattern = Pattern(
            name="blr_pincode_pattern",
            regex=r"\b560\d{3}\b",
            score=0.9
        )
        pin_recognizer = PatternRecognizer(
            supported_entity="IN_PINCODE",
            patterns=[pin_pattern]
        )
        analyzer.registry.add_recognizer(pin_recognizer)

        # 5. Bengaluru Specific Address Patterns (Layout, Main, Cross, Stage, Areas)
        blr_address_pattern = Pattern(
            name="blr_address_pattern",
            regex=r"(?i)\b(?:\d+[/,\-]\w+|\#?\d+),?\s*(?:[A-Za-z0-9\.\-\s]+)?(?:Cross|Main|Road|Layout|Stage|Block|Phase|Indiranagar|Koramangala|HSR\s*Layout|Whitefield|Bellandur|BTM\s*Layout|Malleshwaram|Jayanagar|Marathahalli|Electronic\s*City|Sarjapur|Hebbal|Yelahanka|JP\s*Nagar)\b",
            score=0.8
        )
        blr_address_recognizer = PatternRecognizer(
            supported_entity="BLR_ADDRESS",
            patterns=[blr_address_pattern]
        )
        analyzer.registry.add_recognizer(blr_address_recognizer)

        return analyzer

    def get_or_create_vault(self, session_id: str) -> SessionVault:
        if session_id not in self.vaults:
            self.vaults[session_id] = SessionVault(session_id)
        return self.vaults[session_id]

    def clear_vault(self, session_id: str) -> None:
        if session_id in self.vaults:
            del self.vaults[session_id]

    def register_known_entities(
        self,
        session_id: str,
        tenant_name: Optional[str] = None,
        landlord_name: Optional[str] = None,
        property_address: Optional[str] = None,
        pin_code: Optional[str] = None
    ) -> SessionVault:
        vault = self.get_or_create_vault(session_id)
        if tenant_name:
            vault.register("TENANT_NAME", tenant_name)
        if landlord_name:
            vault.register("LANDLORD_NAME", landlord_name)
        if property_address:
            vault.register("PROPERTY_ADDRESS", property_address)
        if pin_code:
            vault.register("PINCODE", pin_code)
        return vault

    def mask(self, text: str, session_id: str) -> MaskResult:
        if not text:
            return MaskResult(masked_text="", placeholders_detected={}, anonymized_count=0)

        vault = self.get_or_create_vault(session_id)
        result_text = text
        detected: Dict[str, str] = {}

        # 1. Pre-registered vault replacement (Exact, case-insensitive boundary matches)
        # Sort registered values by length descending so longer substrings match first
        registered_pairs = sorted(
            vault.placeholder_to_real.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )

        for placeholder, real_val in registered_pairs:
            if not real_val or len(real_val) < 2:
                continue
            # Regex match with word boundary if alphanumeric
            escaped_val = re.escape(real_val)
            pattern = re.compile(rf"\b{escaped_val}\b", re.IGNORECASE)
            if pattern.search(result_text):
                result_text = pattern.sub(placeholder, result_text)
                detected[placeholder] = "REGISTERED"

        # 2a. Direct regex pre-scan for Indian PII (phone, Aadhaar, email, PAN)
        # This runs BEFORE Presidio to guarantee masking regardless of NLP pipeline state.
        _direct_patterns: list[tuple[str, str, str]] = [
            # Indian mobile: optional +91/0 prefix, starts 6-9, 10 digits total
            ("PHONE", r"(?:(?:\+91[\-\s]?)|(?:0))(?=[6-9])(\d{10})\b", "full"),
            # Plain 10-digit starting 6-9 (no prefix)
            ("PHONE", r"(?<!\d)([6-9]\d{9})(?!\d)", "group1"),
            # Aadhaar: 12 digits optionally grouped
            ("AADHAAR", r"\b([2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4})\b", "full"),
            # PAN card
            ("PAN", r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", "full"),
            # Email
            ("EMAIL", r"[\w.\-+]+@[\w.\-]+\.[a-zA-Z]{2,}", "full"),
        ]

        for entity_type, pat, match_mode in _direct_patterns:
            compiled = re.compile(pat)
            # Find all non-overlapping matches from end to start
            all_matches = list(compiled.finditer(result_text))
            for m in reversed(all_matches):
                raw_val = m.group(0)
                if raw_val.startswith("[") and raw_val.endswith("]"):
                    continue
                ph = vault.register(entity_type, raw_val)
                if ph:
                    result_text = result_text[:m.start()] + ph + result_text[m.end():]
                    detected[ph] = entity_type

        # 2b. Presidio Analyzer for dynamic entities (NLP-based: names, addresses)
        # We explicitly avoid masking monetary amounts, percentages, and dates
        results = self.analyzer.analyze(
            text=result_text,
            language="en",
            entities=[
                "IN_PHONE", "PHONE_NUMBER", "EMAIL_ADDRESS",
                "IN_AADHAAR", "IN_PAN", "IN_PINCODE",
                "BLR_ADDRESS", "PERSON"
            ]
        )

        # Sort results from end of string to beginning to avoid offset shifting
        sorted_results = sorted(results, key=lambda res: res.start, reverse=True)

        for entity_res in sorted_results:
            raw_substr = result_text[entity_res.start:entity_res.end]
            
            # Guard: do NOT mask placeholders already present
            if raw_substr.startswith("[") and raw_substr.endswith("]"):
                continue

            # Guard: ensure dates and pure amounts are not masked as Person or Phone
            if re.search(r"(?:₹|Rs\.?|INR)", raw_substr, re.IGNORECASE):
                continue
            if raw_substr.isdigit() and len(raw_substr) < 6:
                continue
            if entity_res.entity_type == "PERSON" and re.search(r"\d", raw_substr):
                continue

            entity_type = entity_res.entity_type
            type_mapping = {
                "IN_PHONE": "PHONE",
                "PHONE_NUMBER": "PHONE",
                "EMAIL_ADDRESS": "EMAIL",
                "IN_AADHAAR": "AADHAAR",
                "IN_PAN": "PAN",
                "IN_PINCODE": "PINCODE",
                "BLR_ADDRESS": "PROPERTY_ADDRESS",
                "PERSON": "TENANT_NAME" if "[TENANT_NAME]" not in result_text else "LANDLORD_NAME"
            }
            mapped_type = type_mapping.get(entity_type, "PII")

            placeholder = vault.register(mapped_type, raw_substr)
            if placeholder:
                result_text = (
                    result_text[:entity_res.start]
                    + placeholder
                    + result_text[entity_res.end:]
                )
                detected[placeholder] = mapped_type

        return MaskResult(
            masked_text=result_text,
            placeholders_detected=detected,
            anonymized_count=len(detected)
        )

    def verify_no_leak(self, text_to_send: str, session_id: str) -> None:
        """
        Hard Guard: Scans outgoing prompt before dispatch to LLM.
        Aborts with PrivacyLeakException if any real value in the vault is present.
        """
        vault = self.vaults.get(session_id)
        if not vault:
            return

        for placeholder, real_val in vault.placeholder_to_real.items():
            if not real_val or len(real_val.strip()) < 3:
                continue
            
            # Avoid triggering on common short substrings (e.g. "at", "on", "10")
            clean_real = real_val.strip()
            pattern = re.compile(rf"\b{re.escape(clean_real)}\b", re.IGNORECASE)
            if pattern.search(text_to_send):
                raise PrivacyLeakException(
                    f"CRITICAL PRIVACY VIOLATION: Vault value for '{placeholder}' "
                    f"detected in outgoing LLM payload. Dispatch aborted."
                )

    def unmask(self, text: str, session_id: str) -> str:
        """Replaces placeholders with real details from the local session vault."""
        vault = self.vaults.get(session_id)
        if not vault or not text:
            return text

        result = text
        for placeholder, real_val in vault.placeholder_to_real.items():
            result = result.replace(placeholder, real_val)
        return result
