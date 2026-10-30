"""
LangGraph Deterministic State Machine for Namma Tenant Navigator.
Coordinates triage, fact gathering, masking, law retrieval, strict arithmetic,
analysis, user confirmation, and notice generation with MemorySaver checkpoints.
"""

from typing import Dict, List, Optional, Any, Annotated
from datetime import datetime, date
import json
import re
from pydantic import BaseModel, Field

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from backend.config import settings
from backend.privacy import PrivacyEngine, PrivacyLeakException
from backend.retriever import KnowledgeBase, KBChunk

# --- Data Schemas ---

class ComputedArithmetic(BaseModel):
    deposit_months: Optional[float] = None
    excess_deposit_months: Optional[float] = None
    net_refundable_amount: Optional[float] = None
    disputed_deductions: Optional[float] = None
    rent_increase_percent: Optional[float] = None
    notice_gap_days: Optional[int] = None
    statutory_90_day_met: Optional[bool] = None
    shortfall_days: Optional[int] = None

class LegalViolation(BaseModel):
    issue: str
    statutory_basis: str
    kb_chunk_id: str
    is_verified: bool
    summary: str

class LegalAnalysis(BaseModel):
    case_type: str
    arithmetic: ComputedArithmetic
    violations: List[LegalViolation]
    recommended_demand: str
    confidence: float
    citations: List[str]
    warning_unverified_sources: List[str] = []
    insufficient_context: bool = False
    guidance_message: Optional[str] = None

class EmergencyInfo(BaseModel):
    pin_code: Optional[str] = None
    authority_name: str
    office_address: str
    phone: str
    police_emergency: str = "112"
    bescom_helpline: str = "1912"
    bwssb_helpline: str = "1916"
    guidance: str
    notes: Optional[str] = None

class NavigatorState(BaseModel):
    session_id: str
    current_step: str = "triage"
    case_type: Optional[str] = None  # "deposit" | "rent_hike" | "harassment"
    
    # Raw & Vault Identifiers
    tenant_name: Optional[str] = None
    landlord_name: Optional[str] = None
    property_address: Optional[str] = None
    pin_code: Optional[str] = None
    lease_registered: Optional[bool] = None
    
    # Deposit Fields
    monthly_rent: Optional[float] = None
    deposit_paid: Optional[float] = None
    deductions_claimed: Optional[float] = None
    deduction_reasons: Optional[str] = None
    move_out_date: Optional[str] = None
    itemised_bills_provided: Optional[bool] = None

    # Rent Hike Fields
    current_rent: Optional[float] = None
    proposed_rent: Optional[float] = None
    notice_received_date: Optional[str] = None
    effective_date: Optional[str] = None
    notice_channel: Optional[str] = None

    # Distress / Emergency
    distress_keywords: List[str] = Field(default_factory=list)
    emergency_info: Optional[EmergencyInfo] = None

    # Flow State
    missing_fields: List[str] = Field(default_factory=list)
    follow_up_question: Optional[str] = None
    masked_prompt: Optional[str] = None
    retrieved_chunk_ids: List[str] = Field(default_factory=list)
    arithmetic: Optional[ComputedArithmetic] = None
    analysis: Optional[LegalAnalysis] = None
    user_confirmed: bool = False
    notice_generated: bool = False
    notice_pdf_url: Optional[str] = None
    messages: List[Dict[str, str]] = Field(default_factory=list)


# --- Helper Functions ---

def load_rent_authorities() -> Dict[str, Any]:
    auth_file = settings.DATA_DIR / "rent_authorities.json"
    if auth_file.exists():
        try:
            return json.loads(auth_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"emergency_contacts": {}, "authorities_by_pin": {}}

def calculate_arithmetic(state: NavigatorState) -> ComputedArithmetic:
    arith = ComputedArithmetic()
    
    # 1. Deposit Calculations
    if state.monthly_rent and state.monthly_rent > 0 and state.deposit_paid is not None:
        deposit_months = round(state.deposit_paid / state.monthly_rent, 2)
        arith.deposit_months = deposit_months
        arith.excess_deposit_months = max(0.0, round(deposit_months - 2.0, 2))
        
        deductions = state.deductions_claimed or 0.0
        arith.disputed_deductions = deductions
        
        # If no itemised bills, full deposit is claimed back
        if state.itemised_bills_provided is False:
            arith.net_refundable_amount = state.deposit_paid
        else:
            arith.net_refundable_amount = max(0.0, state.deposit_paid - deductions)

    # 2. Rent Hike Calculations
    if state.current_rent and state.current_rent > 0 and state.proposed_rent:
        pct = round(((state.proposed_rent - state.current_rent) / state.current_rent) * 100, 2)
        arith.rent_increase_percent = pct

    if state.notice_received_date and state.effective_date:
        try:
            d1 = datetime.strptime(state.notice_received_date.strip()[:10], "%Y-%m-%d").date()
            d2 = datetime.strptime(state.effective_date.strip()[:10], "%Y-%m-%d").date()
            gap = (d2 - d1).days
            arith.notice_gap_days = gap
            arith.statutory_90_day_met = gap >= 90
            arith.shortfall_days = max(0, 90 - gap)
        except Exception:
            pass

    return arith


# --- Node Implementations ---

def triage_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Classifies the case: deposit, rent_hike, or harassment/emergency."""
    s = NavigatorState(**state)
    s.current_step = "triage"

    distress_triggers = [
        "power cut", "electricity cut", "water cut", "harassment",
        "lock-out", "locked out", "threat", "threatened", "thrown out", "violence"
    ]

    # Check text in messages or fields
    text_corpus = " ".join([m.get("content", "") for m in s.messages]).lower()
    if s.deduction_reasons:
        text_corpus += " " + s.deduction_reasons.lower()

    found_triggers = [kw for kw in distress_triggers if kw in text_corpus]
    if found_triggers or s.case_type == "harassment":
        s.case_type = "harassment"
        s.distress_keywords = found_triggers
        return s.model_dump()

    if s.proposed_rent is not None or s.case_type == "rent_hike" or "rent hike" in text_corpus or "increase" in text_corpus:
        s.case_type = "rent_hike"
    else:
        s.case_type = "deposit"

    return s.model_dump()


def emergency_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Handles harassment/distress. Look up PIN in rent_authorities.json. Never fabricate."""
    s = NavigatorState(**state)
    s.current_step = "emergency"

    data = load_rent_authorities()
    authorities = data.get("authorities_by_pin", {})
    emergency_contacts = data.get("emergency_contacts", {})

    pin = s.pin_code.strip() if s.pin_code else None

    if pin and pin in authorities:
        auth_data = authorities[pin]
        info = EmergencyInfo(
            pin_code=pin,
            authority_name=auth_data.get("authority_name", "Rent Controller, Bengaluru"),
            office_address=auth_data.get("office_address", "Mini Vidhana Soudha, Bengaluru"),
            phone=auth_data.get("phone") or "Pending official directory update (Call 112 for immediate relief)",
            police_emergency=emergency_contacts.get("police", "112"),
            bescom_helpline=emergency_contacts.get("bescom_helpline", "1912"),
            bwssb_helpline=emergency_contacts.get("bwssb_helpline", "1916"),
            guidance=(
                f"Under Section 27 of the Karnataka Rent Act, 1999, it is an offence to cut off "
                f"essential utilities (electricity/water). You may file an immediate petition for restoration "
                f"before the {auth_data.get('authority_name')} having jurisdiction over PIN {pin}. "
                f"For threats, physical intimidation, or illegal lockout, call Police 112 immediately."
            ),
            notes=auth_data.get("notes")
        )
    else:
        info = EmergencyInfo(
            pin_code=pin,
            authority_name="Rent Control Authority (Court of Small Causes / Assistant Commissioner)",
            office_address="Kandaya Bhavana, K.G. Road / Mayo Hall Unit, Bengaluru",
            phone="Contact local Sub-Divisional Magistrate / Call 112",
            police_emergency=emergency_contacts.get("police", "112"),
            bescom_helpline=emergency_contacts.get("bescom_helpline", "1912"),
            bwssb_helpline=emergency_contacts.get("bwssb_helpline", "1916"),
            guidance=(
                "Under Section 27 of the Karnataka Rent Act, 1999, landlords cannot cut off water or electricity "
                "or force illegal entry. Since a Bengaluru PIN was not matched, please dial 112 for immediate police "
                "intervention or approach the nearest Court of Small Causes / Rent Controller."
            ),
            notes="PIN not provided or unlisted in local verified authority directory."
        )

    s.emergency_info = info
    return s.model_dump()


def collect_facts_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Loops until all required factual fields are gathered for the case type."""
    s = NavigatorState(**state)
    s.current_step = "collect_facts"
    missing = []

    if s.case_type == "deposit":
        if s.monthly_rent is None:
            missing.append("monthly_rent")
        if s.deposit_paid is None:
            missing.append("deposit_paid")
        if s.deductions_claimed is None:
            missing.append("deductions_claimed")
        if s.move_out_date is None:
            missing.append("move_out_date")
        if s.itemised_bills_provided is None:
            missing.append("itemised_bills_provided")

    elif s.case_type == "rent_hike":
        if s.current_rent is None:
            missing.append("current_rent")
        if s.proposed_rent is None:
            missing.append("proposed_rent")
        if s.notice_received_date is None:
            missing.append("notice_received_date")
        if s.effective_date is None:
            missing.append("effective_date")
        if s.notice_channel is None:
            missing.append("notice_channel")

    s.missing_fields = missing

    if missing:
        field_labels = {
            "monthly_rent": "What was your agreed monthly rent (₹)?",
            "deposit_paid": "What total security deposit amount did you pay (₹)?",
            "deductions_claimed": "What total deduction is the landlord attempting to withhold (₹)?",
            "move_out_date": "What was your move-out / key handover date (YYYY-MM-DD)?",
            "itemised_bills_provided": "Did the landlord provide itemised, GST-compliant repair invoices?",
            "current_rent": "What is your current monthly rent (₹)?",
            "proposed_rent": "What is the new proposed monthly rent (₹)?",
            "notice_received_date": "When did you receive the hike notice (YYYY-MM-DD)?",
            "effective_date": "From which date does the landlord want the hike to apply (YYYY-MM-DD)?",
            "notice_channel": "How was the notice communicated (WhatsApp, email, or letter)?"
        }
        first_missing = missing[0]
        s.follow_up_question = field_labels.get(first_missing, f"Please provide details for: {first_missing}")
    else:
        s.follow_up_question = None

    return s.model_dump()


def mask_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Passes all names and details through Presidio and registers them in the session vault."""
    s = NavigatorState(**state)
    s.current_step = "mask"

    engine = PrivacyEngine.get_instance()

    # Pre-register known intake fields
    engine.register_known_entities(
        session_id=s.session_id,
        tenant_name=s.tenant_name,
        landlord_name=s.landlord_name,
        property_address=s.property_address,
        pin_code=s.pin_code
    )

    # Mask any free text
    combined_notes = f"{s.deduction_reasons or ''} {s.property_address or ''}"
    mask_res = engine.mask(combined_notes, s.session_id)
    s.masked_prompt = mask_res.masked_text

    return s.model_dump()


def retrieve_law_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Queries KB for relevant statutory chunks based on case facts."""
    s = NavigatorState(**state)
    s.current_step = "retrieve_law"

    kb = KnowledgeBase.get_instance()
    query_parts = []
    if s.case_type == "deposit":
        query_parts.append("security deposit refund deduction wear tear painting itemised bills")
    elif s.case_type == "rent_hike":
        query_parts.append("rent increase revision advance 90 days notice written")
    elif s.case_type == "harassment":
        query_parts.append("utility cut off water electricity harassment Section 27")

    query = " ".join(query_parts)
    retrieved = kb.retrieve(query, top_k=4)

    s.retrieved_chunk_ids = [chunk.id for chunk in retrieved]
    return s.model_dump()


def analyze_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes strict Python arithmetic, validates citations against KB,
    and constructs the deterministic legal analysis.
    """
    s = NavigatorState(**state)
    s.current_step = "analyze"

    kb = KnowledgeBase.get_instance()
    engine = PrivacyEngine.get_instance()

    # 1. Compute strict Python arithmetic
    arith = calculate_arithmetic(s)
    s.arithmetic = arith

    # 2. Check KB context relevance
    if not s.retrieved_chunk_ids:
        s.analysis = LegalAnalysis(
            case_type=s.case_type or "unknown",
            arithmetic=arith,
            violations=[],
            recommended_demand="Consult a lawyer or legal aid cell (INSUFFICIENT_LAW_CONTEXT).",
            confidence=0.0,
            citations=[],
            insufficient_context=True,
            guidance_message=(
                "INSUFFICIENT_LAW_CONTEXT: No matching statutory provisions in the Karnataka housing "
                "knowledge base passed the relevance threshold. Please consult an advocate or the Karnataka State "
                "Legal Services Authority (KSLSA) at 080-22111714."
            )
        )
        return s.model_dump()

    # 3. Retrieve chunks and check verification flags
    retrieved_chunks = [kb.get_chunk(cid) for cid in s.retrieved_chunk_ids if kb.get_chunk(cid)]
    unverified_ids = [c.id for c in retrieved_chunks if not c.verified]

    violations: List[LegalViolation] = []
    citations: List[str] = []

    # 4. Construct legal violations grounded strictly in retrieved KB chunks
    if s.case_type == "deposit":
        # Check excessive deposit
        dep_chunk = kb.get_chunk("KB-DEP-001")
        if dep_chunk and arith.deposit_months and arith.deposit_months > 2.0:
            citations.append(dep_chunk.id)
            violations.append(LegalViolation(
                issue=f"Excessive Security Deposit ({arith.deposit_months} months held vs 2-month legal benchmark)",
                statutory_basis=f"{dep_chunk.act} - {dep_chunk.section}",
                kb_chunk_id=dep_chunk.id,
                is_verified=dep_chunk.verified,
                summary=(
                    f"Landlord collected ₹{s.deposit_paid:,.0f} ({arith.deposit_months} months), exceeding the 2-month "
                    f"residential benchmark. ₹{arith.excess_deposit_months * (s.monthly_rent or 0):,.0f} represents excess advance holding."
                )
            ))

        # Check wear & tear / arbitrary deductions
        wtr_chunk = kb.get_chunk("KB-WTR-002")
        if wtr_chunk and (s.deductions_claimed or 0) > 0:
            citations.append(wtr_chunk.id)
            violations.append(LegalViolation(
                issue="Unlawful Deduction for Ordinary Wear and Tear / Lack of Itemised GST Invoices",
                statutory_basis=f"{wtr_chunk.act} - {wtr_chunk.section}",
                kb_chunk_id=wtr_chunk.id,
                is_verified=wtr_chunk.verified,
                summary=(
                    f"Landlord is withholding ₹{s.deductions_claimed:,.0f} without furnishing itemised GST-compliant repair invoices. "
                    "Normal wear, tear, and aging paint cannot be deducted arbitrarily."
                )
            ))

        # Check notice chunk
        not_chunk = kb.get_chunk("KB-NOT-004")
        if not_chunk:
            citations.append(not_chunk.id)

        rec_demand = (
            f"Immediate refund of full security deposit amount ₹{arith.net_refundable_amount:,.0f} within 7 days, "
            f"failing which lawful interest at 12% p.a. and formal petition before the Rent Controller / Court of Small Causes."
        )

    elif s.case_type == "rent_hike":
        rnt_chunk = kb.get_chunk("KB-RNT-003")
        if rnt_chunk:
            citations.append(rnt_chunk.id)
            if arith.statutory_90_day_met is False:
                violations.append(LegalViolation(
                    issue=f"Deficient Notice Period ({arith.notice_gap_days} days provided vs 90 days mandatory)",
                    statutory_basis=f"{rnt_chunk.act} - {rnt_chunk.section}",
                    kb_chunk_id=rnt_chunk.id,
                    is_verified=rnt_chunk.verified,
                    summary=(
                        f"Notice served allows only {arith.notice_gap_days} days prior to the effective date. "
                        f"A minimum 90-day statutory notice is mandated before revision can take legal effect (Shortfall: {arith.shortfall_days} days)."
                    )
                ))

        if s.notice_channel in ["verbal", "whatsapp"]:
            not_chunk = kb.get_chunk("KB-NOT-004")
            if not_chunk:
                citations.append(not_chunk.id)
                violations.append(LegalViolation(
                    issue="Improper Mode of Legal Service",
                    statutory_basis=f"{not_chunk.act} - {not_chunk.section}",
                    kb_chunk_id=not_chunk.id,
                    is_verified=not_chunk.verified,
                    summary="Rent revisions must be formally tendered via written legal instrument, not informal verbal notice."
                ))

        rec_demand = (
            f"Suspension of proposed {arith.rent_increase_percent}% rent escalation until the expiration of a lawful 90-day written notice."
        )

    else:
        rec_demand = "Emergency relief under Section 27 of Karnataka Rent Act."

    # Remove duplicates and validate citations strictly against KB
    valid_citations = [cid for cid in set(citations) if kb.get_chunk(cid) is not None]

    # Pre-LLM Privacy Guard: Ensure no real PII is leaked in prompt construction
    prompt_payload = f"Case: {s.case_type}, Arithmetic: {arith.model_dump_json()}, Chunks: {valid_citations}"
    engine.verify_no_leak(prompt_payload, s.session_id)

    s.analysis = LegalAnalysis(
        case_type=s.case_type or "deposit",
        arithmetic=arith,
        violations=violations,
        recommended_demand=rec_demand,
        confidence=0.92,
        citations=valid_citations,
        warning_unverified_sources=unverified_ids,
        insufficient_context=False
    )

    return s.model_dump()


def confirm_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Halts for user approval before document generation."""
    s = NavigatorState(**state)
    s.current_step = "confirm"
    return s.model_dump()


def generate_notice_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generates the ReportLab PDF Demand Notice with vault re-insertion at render time."""
    from backend.pdf_gen import generate_demand_notice_pdf

    s = NavigatorState(**state)
    s.current_step = "generate_notice"

    if not s.user_confirmed:
        return s.model_dump()

    pdf_filename = f"demand_notice_{s.session_id}.pdf"
    pdf_path = settings.DATA_DIR / pdf_filename

    generate_demand_notice_pdf(
        state=s,
        output_path=pdf_path
    )

    s.notice_generated = True
    s.notice_pdf_url = f"/api/notice/{s.session_id}"

    return s.model_dump()


# --- Conditional Routing Edges ---

def route_triage(state: Dict[str, Any]) -> str:
    s = NavigatorState(**state)
    if s.case_type == "harassment":
        return "emergency"
    return "collect_facts"

def route_collect_facts(state: Dict[str, Any]) -> str:
    s = NavigatorState(**state)
    if s.missing_fields:
        return END  # Wait for user input
    return "mask"

def route_after_confirm(state: Dict[str, Any]) -> str:
    s = NavigatorState(**state)
    if s.user_confirmed:
        return "generate_notice"
    return END  # Awaiting user approval


# --- Graph Construction ---

def create_tenant_navigator_graph() -> Any:
    graph = StateGraph(dict)

    # Add Nodes
    graph.add_node("triage", triage_node)
    graph.add_node("emergency", emergency_node)
    graph.add_node("collect_facts", collect_facts_node)
    graph.add_node("mask", mask_node)
    graph.add_node("retrieve_law", retrieve_law_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("confirm", confirm_node)
    graph.add_node("generate_notice", generate_notice_node)

    # Set Entry Point
    graph.set_entry_point("triage")

    # Edges
    graph.add_conditional_edges(
        "triage",
        route_triage,
        {
            "emergency": "emergency",
            "collect_facts": "collect_facts"
        }
    )

    graph.add_edge("emergency", END)

    graph.add_conditional_edges(
        "collect_facts",
        route_collect_facts,
        {
            "mask": "mask",
            END: END
        }
    )

    graph.add_edge("mask", "retrieve_law")
    graph.add_edge("retrieve_law", "analyze")
    graph.add_edge("analyze", "confirm")

    graph.add_conditional_edges(
        "confirm",
        route_after_confirm,
        {
            "generate_notice": "generate_notice",
            END: END
        }
    )

    graph.add_edge("generate_notice", END)

    memory = MemorySaver()
    return graph.compile(checkpointer=memory)

# Precompiled graph instance
app_graph = create_tenant_navigator_graph()
