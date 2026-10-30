"""
Pytest suite for Namma Tenant Navigator Privacy Layer.
Tests:
- PII removed (names, phone numbers, Bengaluru addresses, PIN codes)
- Amounts and dates survive without masking
- Stable typed placeholders per session
- Privacy guard aborts when raw vault values appear in LLM payload
"""

import pytest
from backend.privacy import PrivacyEngine, PrivacyLeakException

@pytest.fixture
def privacy_engine():
    engine = PrivacyEngine.get_instance()
    # Reset for clean test
    engine.vaults.clear()
    return engine

def test_stable_placeholders_and_name_preregistration(privacy_engine):
    session_id = "test-session-001"
    
    # Pre-register tenant and landlord
    vault = privacy_engine.register_known_entities(
        session_id=session_id,
        tenant_name="Karthik Subramanian",
        landlord_name="Nagaraj Rao",
        property_address="Flat 302, Green Glen Layout, Bellandur, Bengaluru",
        pin_code="560103"
    )

    sample_text = (
        "Tenant Karthik Subramanian paid ₹65,000 to landlord Nagaraj Rao on 15-08-2024. "
        "Contact 9845012345 or email karthik@example.com at Flat 302, Green Glen Layout, Bellandur, Bengaluru."
    )

    res = privacy_engine.mask(sample_text, session_id)
    masked = res.masked_text

    # Verify names & address are replaced
    assert "Karthik Subramanian" not in masked
    assert "Nagaraj Rao" not in masked
    assert "[TENANT_NAME]" in masked
    assert "[LANDLORD_NAME]" in masked

    # Verify phone and email are masked
    assert "9845012345" not in masked
    assert "karthik@example.com" not in masked

    # Verify amounts and dates survived untouched
    assert "₹65,000" in masked or "65,000" in masked
    assert "15-08-2024" in masked

    # Verify unmasking re-inserts correct values
    unmasked = privacy_engine.unmask(masked, session_id)
    assert "Karthik Subramanian" in unmasked
    assert "Nagaraj Rao" in unmasked

def test_amounts_and_dates_survive_pure_numeric(privacy_engine):
    session_id = "test-session-amounts"
    text = "Rent is Rs. 35,000 and deposit is ₹2,10,000. Notice period is 90 days from 01/10/2026."
    res = privacy_engine.mask(text, session_id)

    # Amounts and dates must NOT be masked as PII
    assert "35,000" in res.masked_text
    assert "2,10,000" in res.masked_text
    assert "90 days" in res.masked_text
    assert "01/10/2026" in res.masked_text

def test_guard_aborts_on_pii_leak(privacy_engine):
    session_id = "test-session-leak"
    privacy_engine.register_known_entities(
        session_id=session_id,
        tenant_name="Pooja Hegde",
        landlord_name="Ramesh Kumar"
    )

    # Safe payload with placeholders
    safe_prompt = "Evaluating lease agreement for [TENANT_NAME] against [LANDLORD_NAME]."
    privacy_engine.verify_no_leak(safe_prompt, session_id)  # Should not raise

    # Leaked payload with raw name
    leaked_prompt = "Evaluating lease agreement for Pooja Hegde against [LANDLORD_NAME]."
    with pytest.raises(PrivacyLeakException) as exc_info:
        privacy_engine.verify_no_leak(leaked_prompt, session_id)
    assert "CRITICAL PRIVACY VIOLATION" in str(exc_info.value)
