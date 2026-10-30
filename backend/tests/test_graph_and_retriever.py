"""
Pytest suite for Retriever, LangGraph State Machine, Emergency Triage, and PDF.
Tests:
- Retrieval returns right source and nothing for unrelated queries
- Harassment routes straight to emergency with NO PDF
- Missing facts loop with follow-up questions instead of generation
- Invalid citations fail validation / are rejected
- Full deterministic flow generates valid ReportLab PDF notice
"""

import pytest
from pathlib import Path
from backend.retriever import KnowledgeBase, KBChunk
from backend.graph import (
    triage_node,
    emergency_node,
    collect_facts_node,
    mask_node,
    retrieve_law_node,
    analyze_node,
    confirm_node,
    generate_notice_node,
    NavigatorState
)
from backend.privacy import PrivacyEngine
from backend.config import settings

@pytest.fixture
def kb():
    return KnowledgeBase.get_instance()

def test_retriever_returns_right_source_for_deposit(kb):
    query = "landlord deducting painting charges from security deposit without bills"
    chunks = kb.retrieve(query, top_k=2)
    assert len(chunks) > 0
    chunk_ids = [c.id for c in chunks]
    # Should match either wear and tear (KB-WTR-002) or deposit cap (KB-DEP-001)
    assert "KB-WTR-002" in chunk_ids or "KB-DEP-001" in chunk_ids

def test_retriever_returns_nothing_for_unrelated_query(kb):
    query = "quantum electrodynamics perturbation theory on manifold"
    chunks = kb.retrieve(query, top_k=3)
    # Cosine distance or token overlap will fail relevance threshold
    assert len(chunks) == 0

def test_harassment_routes_to_emergency_no_pdf():
    state_dict = {
        "session_id": "emergency-test-01",
        "pin_code": "560038",
        "case_type": "harassment",
        "messages": [{"content": "Landlord cut off my water and power supply yesterday"}]
    }

    triage_res = triage_node(state_dict)
    assert triage_res["case_type"] == "harassment"

    emerg_res = emergency_node(triage_res)
    assert emerg_res["current_step"] == "emergency"
    assert emerg_res["emergency_info"] is not None
    assert emerg_res["emergency_info"]["police_emergency"].startswith("112")
    assert "Section 27" in emerg_res["emergency_info"]["guidance"]
    assert emerg_res.get("notice_generated") is not True

def test_missing_facts_triggers_followup_question_no_generation():
    # Only partial deposit facts provided
    partial_state = {
        "session_id": "partial-facts-01",
        "case_type": "deposit",
        "monthly_rent": 30000.0,
        "deposit_paid": 180000.0
        # missing: deductions_claimed, move_out_date, itemised_bills_provided
    }

    res = collect_facts_node(partial_state)
    assert len(res["missing_fields"]) > 0
    assert "deductions_claimed" in res["missing_fields"]
    assert res["follow_up_question"] is not None
    assert res.get("notice_generated") is not True

def test_invalid_citations_rejected_in_analysis():
    state_dict = {
        "session_id": "citation-test-01",
        "case_type": "deposit",
        "monthly_rent": 25000.0,
        "deposit_paid": 150000.0,
        "deductions_claimed": 30000.0,
        "move_out_date": "2026-08-31",
        "itemised_bills_provided": False,
        "retrieved_chunk_ids": ["KB-DEP-001", "KB-FAKE-999"]  # KB-FAKE-999 does not exist
    }

    res = analyze_node(state_dict)
    analysis = res["analysis"]
    assert analysis is not None
    # Invalid fake chunk must NOT be accepted in citations
    assert "KB-FAKE-999" not in analysis["citations"]
    assert "KB-DEP-001" in analysis["citations"]

def test_full_deposit_flow_and_pdf_generation(tmp_path):
    session_id = "full-flow-01"
    engine = PrivacyEngine.get_instance()
    engine.register_known_entities(
        session_id=session_id,
        tenant_name="Deepa Shenoy",
        landlord_name="Balakrishna Rao",
        property_address="Villa 12, Indiranagar, Bengaluru",
        pin_code="560038"
    )

    state = {
        "session_id": session_id,
        "tenant_name": "Deepa Shenoy",
        "landlord_name": "Balakrishna Rao",
        "property_address": "Villa 12, Indiranagar, Bengaluru",
        "pin_code": "560038",
        "case_type": "deposit",
        "monthly_rent": 40000.0,
        "deposit_paid": 240000.0,
        "deductions_claimed": 50000.0,
        "deduction_reasons": "Arbitrary painting charges",
        "move_out_date": "2026-09-01",
        "itemised_bills_provided": False,
        "user_confirmed": True
    }

    s1 = triage_node(state)
    s2 = collect_facts_node(s1)
    assert len(s2["missing_fields"]) == 0

    s3 = mask_node(s2)
    s4 = retrieve_law_node(s3)
    s5 = analyze_node(s4)
    s6 = confirm_node(s5)

    pdf_path = tmp_path / "test_notice.pdf"
    from backend.pdf_gen import generate_demand_notice_pdf
    generate_demand_notice_pdf(NavigatorState(**s6), pdf_path)

    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 1000
