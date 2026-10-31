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
    locality: Optional[str] = None
    division: Optional[str] = None
    court_jurisdiction: Optional[str] = None
    alt_phone: Optional[str] = None
    mobile: Optional[str] = None

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
    orchestrated_notice: Optional[Dict[str, Any]] = None
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
    
    # 1. Deposit Calculations (ONLY if case_type is deposit or unspecified)
    if state.case_type != "rent_hike" and state.monthly_rent and state.monthly_rent > 0 and state.deposit_paid is not None:
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

    # 2. Rent Hike Calculations (ONLY if case_type is rent_hike)
    if state.case_type == "rent_hike":
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
    verified = data.get("verified_emergency_contacts", {})
    police = verified.get("police", {}).get("number", "112")
    bescom = verified.get("bescom_electricity", {}).get("number", "1912")
    bwssb = verified.get("bwssb_water", {}).get("number", "1916")

    pin = s.pin_code.strip() if s.pin_code else None
    authorities_by_pin = data.get("authorities_by_pin", {})

    matched = None
    if pin and pin in authorities_by_pin:
        matched = authorities_by_pin[pin]
    elif pin and len(pin) == 6 and (pin.startswith("560") or pin.startswith("562")):
        # Sub-division mapping based on Bengaluru administrative revenue zones
        pin_int = int(pin) if pin.isdigit() else 0
        if pin == "562106" or pin == "560100" or (562105 <= pin_int <= 562107):
            # Anekal Taluk
            matched = authorities_by_pin.get("562106")
        elif pin in ["560064", "560024", "560092", "560063", "560065", "560077", "560097", "560057"]:
            # Yelahanka Sub-Division
            matched = authorities_by_pin.get("560064")
        elif pin in ["560036", "560037", "560048", "560066", "560075", "560103"]:
            # East Sub-Division (KR Puram)
            matched = authorities_by_pin.get("560036")
        elif pin in ["560038", "560008", "560017", "560093"]:
            # East Sub-Division (Mayo Hall Unit)
            matched = authorities_by_pin.get("560038")
        elif pin in [
            "560004", "560011", "560019", "560029", "560034", "560041",
            "560068", "560070", "560076", "560078", "560085", "560095", "560102"
        ]:
            # South Sub-Division (Jayanagar Mini Vidhana Soudha)
            matched = authorities_by_pin.get("560011")
        elif pin in ["560003", "560010", "560040", "560079", "560086"]:
            # West / North-West Sub-Division (Kandaya Bhavana)
            matched = authorities_by_pin.get("560010")
        elif pin in ["560001", "560002", "560009", "560020", "560027", "560052"]:
            # Central Sub-Division / City Civil Court
            matched = authorities_by_pin.get("560009")
        else:
            # Default to Central Bengaluru DLSA Headquarters
            matched = authorities_by_pin.get("560009")

    if matched:
        info = EmergencyInfo(
            pin_code=pin or matched.get("pin_code"),
            authority_name=matched.get("authority_name", "Bengaluru Urban DLSA - Verified Legal-Aid Referral"),
            office_address=matched.get("office_address", "Ground Floor, City Civil Court Complex, KG Road, Bengaluru - 560009"),
            phone=matched.get("phone", "080-22215143"),
            alt_phone=matched.get("alt_phone"),
            mobile=matched.get("mobile"),
            police_emergency=police,
            bescom_helpline=bescom,
            bwssb_helpline=bwssb,
            locality=matched.get("locality"),
            division=matched.get("division"),
            court_jurisdiction=matched.get("court_jurisdiction"),
            guidance=matched.get("guidance", (
                "Under Section 27 of the Karnataka Rent Act, 1999, it is an offence to cut off "
                "essential utilities (electricity/water) or forcibly evict tenants. "
                f"For immediate distress or physical threats, call Police {police}. "
                "For legal aid petitions and emergency injunctions, contact the jurisdictional authority listed above."
            )),
            notes=f"Administered under {matched.get('division', 'Bengaluru Urban')}. Verified official helpline: {matched.get('phone')}."
        )
    else:
        info = EmergencyInfo(
            pin_code=pin,
            authority_name="Bengaluru Urban District Legal Services Authority (DLSA Headquarters)",
            office_address="Ground Floor, City Civil Court Complex, KG Road, Bengaluru - 560009",
            phone="080-22215143",
            alt_phone="080-22939213",
            mobile="+91 9141193926",
            police_emergency=police,
            bescom_helpline=bescom,
            bwssb_helpline=bwssb,
            locality="Bengaluru Urban Metropolitan Jurisdiction",
            division="Principal Civil Court & Legal Aid Center",
            court_jurisdiction="Court of Small Causes & City Civil Court, Bengaluru",
            guidance=(
                "Under Section 27 of the Karnataka Rent Act, 1999, landlords cannot cut off water or electricity "
                "or force illegal lockout. For immediate police intervention for threats or lockout, dial 112. "
                "For legal-aid referral and tenant rights petitions, contact Bengaluru Urban DLSA at 080-22215143 / 080-22939213."
            ),
            notes="Showing Bengaluru Urban DLSA Central Headquarters. Enter a 6-digit Bengaluru PIN code (e.g. 560038, 560019, 560066) to locate your zonal Mini Vidhana Soudha / Court."
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
            "monthly_rent": "What was your agreed monthly rent (Γé╣)?",
            "deposit_paid": "What total security deposit amount did you pay (Γé╣)?",
            "deductions_claimed": "What total deduction is the landlord attempting to withhold (Γé╣)?",
            "move_out_date": "What was your move-out / key handover date (YYYY-MM-DD)?",
            "itemised_bills_provided": "Did the landlord provide itemised, GST-compliant repair invoices?",
            "current_rent": "What is your current monthly rent (Γé╣)?",
            "proposed_rent": "What is the new proposed monthly rent (Γé╣)?",
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
    Genuine LangChain + Groq LLM analysis: computes arithmetic, retrieves KB chunks,
    constructs the prompt with placeholders only (no real PII), and calls the LLM.
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

    # 3. Retrieve chunks
    retrieved_chunks = [kb.get_chunk(cid) for cid in s.retrieved_chunk_ids if kb.get_chunk(cid)]
    unverified_ids = [c.id for c in retrieved_chunks if not c.verified]

    # 4. Build LLM prompt with bracket placeholders (no real PII leaks)
    chunk_summaries = []
    for chunk in retrieved_chunks:
        chunk_summaries.append(f"- {chunk.id} ({chunk.act} {chunk.section}): {chunk.plain_summary}")
    chunk_context = "\n".join(chunk_summaries) if chunk_summaries else "No verified KB chunks retrieved."

    # Build dispute-specific profile with strict boundary instructions
    if s.case_type == "deposit":
        profile_text = f"""DISPUTE TYPE: SECURITY DEPOSIT DISPUTE (Move-out / Withheld Funds)
- Monthly Rent: ₹{s.monthly_rent:,.0f}
- Total Deposit Paid: ₹{s.deposit_paid:,.0f} ({arith.deposit_months} months rent)
- Permissible Residential Benchmark: 2.0 Months (Model Tenancy Act 2021 Sec 11 benchmark; Karnataka Rent Act 1999 Sec 15/16: ₹{(s.monthly_rent or 0)*2:,.0f})
- Excess Advance Holding: {arith.excess_deposit_months} Months (₹{arith.excess_deposit_months * (s.monthly_rent or 0):,.0f})
- Deductions Contested: ₹{s.deductions_claimed:,.0f}
- Itemised GST Repair Invoices Provided by Landlord: {'Yes' if s.itemised_bills_provided else 'NO (Arbitrary deductions without GST bills)'}
- Mandatory Net Refund Demanded: ₹{arith.net_refundable_amount:,.0f}
- Lease Status: {'Registered' if s.lease_registered else '11-Month / Stamp'}

STRICT BOUNDARY RULES FOR DEPOSIT ANALYSIS:
1. This dispute is EXCLUSIVELY about security deposit return and arbitrary deductions upon move-out.
2. Under NO circumstance mention rent increases, rent hikes, 30% hikes, or 90-day rent revision notices.
3. Statutory Grounds: Model Tenancy Act 2021 Section 11 (2-month deposit benchmark), Karnataka Rent Act 1999 Sections 15/16 (advance holding/receipts), and Indian Contract Act Section 73 (prohibiting arbitrary deductions for wear & tear without itemised GST invoices).
4. Exact Math: The excess holding is {arith.excess_deposit_months} months = ₹{arith.excess_deposit_months * (s.monthly_rent or 0):,.0f}. The full refundable amount demanded is ₹{arith.net_refundable_amount:,.0f}. Do NOT confuse excess months with total deposit."""
    elif s.case_type == "rent_hike":
        profile_text = f"""DISPUTE TYPE: UNILATERAL RENT HIKE DISPUTE (Ongoing Tenancy)
- Current Monthly Rent: ₹{s.current_rent:,.0f}
- Proposed Revised Rent: ₹{s.proposed_rent:,.0f} (Increase: {arith.rent_increase_percent}%)
- Notice Period Given: {arith.notice_gap_days} days (Statutory Requirement: 90 days minimum, Shortfall: {arith.shortfall_days} days)
- Notice Channel: {s.notice_channel or 'Informal (WhatsApp / Verbal)'}
- Lease Status: {'Registered' if s.lease_registered else '11-Month / Stamp'}

STRICT BOUNDARY RULES FOR RENT HIKE ANALYSIS:
1. This dispute is EXCLUSIVELY about an unlawful rent hike and deficient notice period.
2. Under NO circumstance mention security deposit deductions or move-out refund.
3. Statutory Grounds: Sections 7 & 9 of Karnataka Rent Act, 1999 mandate at least 90 days' formal notice prior to rent revision."""
    else:
        profile_text = f"DISPUTE TYPE: EMERGENCY / HARASSMENT (Section 27 Karnataka Rent Act)"

    prompt = f"""You are a Karnataka tenancy law expert. Analyze the case below using ONLY the provided statutory chunks. Return JSON with keys: case_type, confidence (0-1), violations (list with issue, statutory_basis, kb_chunk_id, is_verified, summary), citations (list), recommended_demand (string), warning_unverified_sources (list), insufficient_context (bool), guidance_message (string).

{profile_text}

STATUTORY CONTEXT (Retrieved from Karnataka Housing Law Base):
{chunk_context}

INSTRUCTION: Base your analysis strictly on the dispute facts and Karnataka housing statutes cited above. Do not invent new statutes. Adhere strictly to the BOUNDARY RULES above."""

    # 5. Call Groq LLM via LangChain (with graceful fallback if no API key)
    try:
        from langchain_groq import ChatGroq
        from langchain_core.output_parsers import JsonOutputParser
        from langchain_core.prompts import ChatPromptTemplate
        import os

        api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY or ""
        if api_key:
            parser = JsonOutputParser()
            llm = ChatGroq(model=settings.GROQ_MODEL or "llama-3.3-70b-versatile", temperature=0.0, api_key=api_key, request_timeout=5, max_retries=1)
            prompt_template = ChatPromptTemplate.from_template("{input}")
            chain = prompt_template | llm | parser
            result = chain.invoke({"input": prompt})
        else:
            # Fallback: deterministic analysis (same as before) when no LLM key is configured
            result = _fallback_analysis(s, arith, retrieved_chunks, unverified_ids, chunk_context)
    except Exception as e:
        # If LLM fails for any reason, fall back to deterministic analysis
        result = _fallback_analysis(s, arith, retrieved_chunks, unverified_ids, chunk_context)

    # 6. Convert result to structured LegalAnalysis (handle both LLM JSON and fallback dict)
    violations: List[LegalViolation] = []
    citations: List[str] = []
    if isinstance(result, dict):
        if "violations" in result and isinstance(result["violations"], list):
            for v in result["violations"]:
                if isinstance(v, LegalViolation):
                    violations.append(v)
                    citations.append(v.statutory_basis)
                elif isinstance(v, dict):
                    default_chunk = retrieved_chunks[0] if retrieved_chunks else None
                    stat_basis = v.get("statutory_basis") or (f"{default_chunk.act} - {default_chunk.section}" if default_chunk else "Verified Karnataka Statute")
                    chunk_id = v.get("kb_chunk_id") or (default_chunk.id if default_chunk else "KB-VERIFIED")
                    chunk_ver = v.get("is_verified", True)
                    violations.append(LegalViolation(
                        issue=v.get("issue", "Unknown violation"),
                        statutory_basis=stat_basis,
                        kb_chunk_id=chunk_id,
                        is_verified=chunk_ver,
                        summary=v.get("summary", "")
                    ))
                    citations.append(stat_basis)
        else:
            # Fallback structure
            violations = result.get("violations", [])
            citations = result.get("citations", [])

    unverified_ids_result = result.get("warning_unverified_sources") if isinstance(result, dict) else unverified_ids

    s.analysis = LegalAnalysis(
        case_type=s.case_type or "deposit",
        arithmetic=arith,
        violations=violations if violations else [],
        recommended_demand=result.get("recommended_demand", "Consult a lawyer or legal aid cell.") if isinstance(result, dict) else "Consult a lawyer or legal aid cell.",
        confidence=result.get("confidence", 0.85) if isinstance(result, dict) else 0.85,
        citations=citations if citations else [],
        warning_unverified_sources=unverified_ids_result if isinstance(unverified_ids_result, list) else unverified_ids,
        insufficient_context=result.get("insufficient_context", False) if isinstance(result, dict) else False,
        guidance_message=result.get("guidance_message", None) if isinstance(result, dict) else None,
    )
    return s.model_dump()


def _fallback_analysis(s, arith, retrieved_chunks, unverified_ids, chunk_context) -> dict:
    """Deterministic fallback when LLM is unavailable or fails."""
    violations: List[LegalViolation] = []
    citations: List[str] = []
    kb = KnowledgeBase.get_instance()
    if s.case_type == "deposit":
        dep_chunk = kb.get_chunk("KB-DEP-001")
        if dep_chunk and arith.deposit_months and arith.deposit_months > 2.0:
            citations.append("Model Tenancy Act, 2021 Sec 11; Karnataka Rent Act, 1999 Sec 15/16")
            violations.append(LegalViolation(
                issue=f"Excessive Security Deposit ({arith.deposit_months} months held vs 2-month legal benchmark)",
                statutory_basis="Model Tenancy Act, 2021 Sec 11; Karnataka Rent Act, 1999 Sec 15/16",
                kb_chunk_id=dep_chunk.id,
                is_verified=dep_chunk.verified,
                summary=f"Landlord collected ₹{s.deposit_paid:,.0f} ({arith.deposit_months} months), exceeding the 2-month residential benchmark under Model Tenancy Act Section 11 and Karnataka Rent Act Section 15/16. ₹{arith.excess_deposit_months * (s.monthly_rent or 0):,.0f} represents excess advance holding."
            ))
        wtr_chunk = kb.get_chunk("KB-WTR-002")
        if wtr_chunk and (s.deductions_claimed or 0) > 0:
            citations.append(f"{wtr_chunk.act} - {wtr_chunk.section}")
            violations.append(LegalViolation(
                issue="Unlawful Deduction for Ordinary Wear and Tear / Lack of Itemised GST Invoices",
                statutory_basis=f"{wtr_chunk.act} - {wtr_chunk.section}",
                kb_chunk_id=wtr_chunk.id,
                is_verified=wtr_chunk.verified,
                summary=f"Landlord is withholding Γé╣{s.deductions_claimed:,.0f} without furnishing itemised GST-compliant repair invoices. Normal wear, tear, and aging paint cannot be deducted arbitrarily."
            ))
        rec_demand = f"Immediate refund of full security deposit amount Γé╣{arith.net_refundable_amount:,.0f} within 7 days, failing which lawful interest at 12% p.a. and formal petition before the Rent Controller / Court of Small Causes."
    elif s.case_type == "rent_hike":
        rnt_chunk = kb.get_chunk("KB-RNT-003")
        if rnt_chunk:
            citations.append(f"{rnt_chunk.act} - {rnt_chunk.section}")
            if arith.statutory_90_day_met is False:
                violations.append(LegalViolation(
                    issue=f"Deficient Notice Period ({arith.notice_gap_days} days provided vs 90 days mandatory)",
                    statutory_basis=f"{rnt_chunk.act} - {rnt_chunk.section}",
                    kb_chunk_id=rnt_chunk.id,
                    is_verified=rnt_chunk.verified,
                    summary=f"Notice served allows only {arith.notice_gap_days} days prior to the effective date. A minimum 90-day statutory notice is mandated before revision can take legal effect (Shortfall: {arith.shortfall_days} days)."
                ))
        rec_demand = f"Demand written confirmation that the rent increase is explicitly authorized by the registered lease agreement and complies with Sections 7 and 9 of the Karnataka Rent Act, 1999. If the lease is fixed-term and does not permit unilateral hikes, reject the increase. Additionally, require the landlord to re-issue the notice via registered post or formal legal notice if the current channel (e.g., WhatsApp) lacks formal acknowledgment, and verify the correct Rent Controller jurisdiction for the specific Bengaluru PIN before any filing."
    else:
        rec_demand = "Emergency relief under Section 27 of Karnataka Rent Act."
    return {
        "violations": violations,
        "citations": [v.statutory_basis for v in violations],
        "recommended_demand": rec_demand,
        "confidence": 0.92,
        "warning_unverified_sources": [cid for cid in unverified_ids],
        "insufficient_context": False,
        "guidance_message": None
    }


def confirm_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Halts for user approval before document generation."""
    s = NavigatorState(**state)
    s.current_step = "confirm"
    return s.model_dump()


def generate_notice_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generates the legal Demand Notice (.docx format) with vault re-insertion at render time."""
    from backend.pdf_gen import generate_demand_notice_docx
    from backend.notice_orchestrator import orchestrate_notice

    s = NavigatorState(**state)
    s.current_step = "generate_notice"

    if not s.user_confirmed:
        return s.model_dump()

    # 1. Orchestrate dynamic notice content using LangChain + sanitizer guardrails
    orchestrated = orchestrate_notice(s)
    s.orchestrated_notice = orchestrated.dict() if hasattr(orchestrated, 'dict') else orchestrated.model_dump()

    # 2. Render to DOCX
    docx_filename = f"demand_notice_{s.session_id}.docx"
    docx_path = settings.DATA_DIR / docx_filename

    generate_demand_notice_docx(
        state=s,
        output_path=docx_path
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
