"""
FastAPI Server for Namma Tenant Navigator.
Exposes REST endpoints for Privacy Shield Masking, LangGraph Wizard,
Emergency Triage, Statute Ticker, PDF Demand Notice, and Data Vault Clearing.
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.config import settings
from backend.privacy import PrivacyEngine, MaskResult, PrivacyLeakException
from backend.retriever import KnowledgeBase, KBChunk
from backend.graph import (
    NavigatorState,
    triage_node,
    emergency_node,
    collect_facts_node,
    mask_node,
    retrieve_law_node,
    analyze_node,
    confirm_node,
    generate_notice_node,
    load_rent_authorities,
    LegalAnalysis,
    EmergencyInfo
)
from backend.pdf_gen import generate_demand_notice_pdf

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Agentic AI legal aid & tenant rights system grounded in Karnataka housing law.",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (paired with SessionVault in PrivacyEngine)
SESSION_STATES: Dict[str, NavigatorState] = {}


# --- Request & Response Models ---

class MaskRequest(BaseModel):
    session_id: str
    text: str
    tenant_name: Optional[str] = None
    landlord_name: Optional[str] = None
    property_address: Optional[str] = None
    pin_code: Optional[str] = None

class MaskResponse(BaseModel):
    masked_text: str
    placeholders_detected: Dict[str, str]
    anonymized_count: int
    vault_items_count: int

class StepRequest(BaseModel):
    session_id: str
    case_type: Optional[str] = None
    tenant_name: Optional[str] = None
    landlord_name: Optional[str] = None
    property_address: Optional[str] = None
    pin_code: Optional[str] = None
    lease_registered: Optional[bool] = None
    
    # Deposit
    monthly_rent: Optional[float] = None
    deposit_paid: Optional[float] = None
    deductions_claimed: Optional[float] = None
    deduction_reasons: Optional[str] = None
    move_out_date: Optional[str] = None
    itemised_bills_provided: Optional[bool] = None

    # Rent Hike
    current_rent: Optional[float] = None
    proposed_rent: Optional[float] = None
    notice_received_date: Optional[str] = None
    effective_date: Optional[str] = None
    notice_channel: Optional[str] = None

    # Chat / answer to follow-up
    user_input: Optional[str] = None
    confirm_generation: Optional[bool] = None

class StepResponse(BaseModel):
    session_id: str
    current_step: str
    case_type: Optional[str]
    missing_fields: List[str]
    follow_up_question: Optional[str]
    arithmetic: Optional[Dict[str, Any]]
    analysis: Optional[LegalAnalysis]
    emergency_info: Optional[EmergencyInfo]
    notice_ready: bool = False
    notice_pdf_url: Optional[str] = None

class EmergencyRequest(BaseModel):
    pin_code: Optional[str] = None
    distress_keyword: Optional[str] = None

class ClearVaultRequest(BaseModel):
    session_id: str


# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "kb_chunks_loaded": len(KnowledgeBase.get_instance().chunks)
    }

@app.get("/api/statutes", response_model=List[KBChunk])
def get_statutes():
    """Returns all statute chunks from the knowledge base for the UI ticker."""
    kb = KnowledgeBase.get_instance()
    return kb.get_all_chunks()

@app.post("/api/mask", response_model=MaskResponse)
def mask_payload(req: MaskRequest):
    """
    Real PII masking endpoint.
    Passes text through Presidio and custom Indian recognizers.
    Registers known names in the local vault with stable placeholders.
    """
    engine = PrivacyEngine.get_instance()
    vault = engine.register_known_entities(
        session_id=req.session_id,
        tenant_name=req.tenant_name,
        landlord_name=req.landlord_name,
        property_address=req.property_address,
        pin_code=req.pin_code
    )

    mask_res = engine.mask(req.text, req.session_id)

    return MaskResponse(
        masked_text=mask_res.masked_text,
        placeholders_detected=mask_res.placeholders_detected,
        anonymized_count=mask_res.anonymized_count,
        vault_items_count=len(vault.placeholder_to_real)
    )

@app.post("/api/emergency", response_model=EmergencyInfo)
def triage_emergency(req: EmergencyRequest):
    """
    Emergency triage triggered by distress keywords or direct call.
    Looks up PIN in rent_authorities.json; returns local authority & helplines.
    """
    fake_state = {
        "session_id": "emergency-query",
        "case_type": "harassment",
        "pin_code": req.pin_code,
        "messages": [{"content": req.distress_keyword or "utility cutoff"}]
    }
    res = emergency_node(fake_state)
    return res["emergency_info"]

@app.post("/api/step", response_model=StepResponse)
def process_wizard_step(req: StepRequest):
    """
    Advances the LangGraph state machine deterministically.
    Loops fact collection until required inputs are complete,
    computes Python arithmetic, validates KB citations, and generates analysis.
    """
    session_id = req.session_id
    current = SESSION_STATES.get(session_id)
    
    if current is None:
        current = NavigatorState(session_id=session_id)

    # Merge incoming parameters into state
    req_data = req.model_dump(exclude_unset=True)
    for field, val in req_data.items():
        if val is not None and hasattr(current, field):
            setattr(current, field, val)

    engine = PrivacyEngine.get_instance()
    engine.register_known_entities(
        session_id=session_id,
        tenant_name=current.tenant_name,
        landlord_name=current.landlord_name,
        property_address=current.property_address,
        pin_code=current.pin_code
    )

    state_dict = current.model_dump()

    # 1. Triage
    state_dict = triage_node(state_dict)
    if state_dict.get("case_type") == "harassment":
        state_dict = emergency_node(state_dict)
        updated_state = NavigatorState(**state_dict)
        SESSION_STATES[session_id] = updated_state
        return StepResponse(
            session_id=session_id,
            current_step="emergency",
            case_type="harassment",
            missing_fields=[],
            follow_up_question=None,
            arithmetic=None,
            analysis=None,
            emergency_info=updated_state.emergency_info,
            notice_ready=False
        )

    # 2. Collect Facts
    state_dict = collect_facts_node(state_dict)
    if state_dict.get("missing_fields"):
        updated_state = NavigatorState(**state_dict)
        SESSION_STATES[session_id] = updated_state
        return StepResponse(
            session_id=session_id,
            current_step="collect_facts",
            case_type=state_dict.get("case_type"),
            missing_fields=state_dict.get("missing_fields", []),
            follow_up_question=state_dict.get("follow_up_question"),
            arithmetic=None,
            analysis=None,
            emergency_info=None,
            notice_ready=False
        )

    # 3. Mask
    state_dict = mask_node(state_dict)

    # 4. Retrieve Law
    state_dict = retrieve_law_node(state_dict)

    # 5. Analyze
    try:
        state_dict = analyze_node(state_dict)
    except PrivacyLeakException as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 6. Confirm or Generate Notice
    if req.confirm_generation or current.user_confirmed:
        state_dict["user_confirmed"] = True
        state_dict = confirm_node(state_dict)
        state_dict = generate_notice_node(state_dict)

    updated_state = NavigatorState(**state_dict)
    SESSION_STATES[session_id] = updated_state

    return StepResponse(
        session_id=session_id,
        current_step=updated_state.current_step,
        case_type=updated_state.case_type,
        missing_fields=updated_state.missing_fields,
        follow_up_question=updated_state.follow_up_question,
        arithmetic=updated_state.arithmetic.model_dump() if updated_state.arithmetic else None,
        analysis=updated_state.analysis,
        emergency_info=None,
        notice_ready=updated_state.notice_generated,
        notice_pdf_url=updated_state.notice_pdf_url
    )

@app.post("/api/confirm")
def confirm_analysis(req: StepRequest):
    """Explicit endpoint to confirm analysis and trigger PDF generation."""
    req.confirm_generation = True
    return process_wizard_step(req)

@app.get("/api/notice/{session_id}")
def download_notice(session_id: str):
    """Serves the generated PDF Demand Notice for instant download."""
    state = SESSION_STATES.get(session_id)
    if not state:
        # Check if sample or existing PDF file is on disk
        pdf_file = settings.DATA_DIR / f"demand_notice_{session_id}.pdf"
        if not pdf_file.exists():
            raise HTTPException(status_code=404, detail="Demand notice not found for this session.")
        return FileResponse(
            path=pdf_file,
            filename=f"Namma_Demand_Notice_{session_id[:8]}.pdf",
            media_type="application/pdf"
        )

    pdf_file = settings.DATA_DIR / f"demand_notice_{session_id}.pdf"
    if not pdf_file.exists():
        # Generate on the fly
        generate_demand_notice_pdf(state, pdf_file)

    return FileResponse(
        path=pdf_file,
        filename=f"Namma_Demand_Notice_{session_id[:8]}.pdf",
        media_type="application/pdf"
    )

@app.post("/api/vault/clear")
def clear_vault(req: ClearVaultRequest):
    """
    Clear My Data: Wipes the session vault in PrivacyEngine,
    removes session state from memory, and deletes any temporary PDFs.
    """
    session_id = req.session_id
    engine = PrivacyEngine.get_instance()
    engine.clear_vault(session_id)

    if session_id in SESSION_STATES:
        del SESSION_STATES[session_id]

    pdf_file = settings.DATA_DIR / f"demand_notice_{session_id}.pdf"
    if pdf_file.exists():
        try:
            pdf_file.unlink()
        except Exception:
            pass

    return {
        "status": "success",
        "message": "Vault wiped. All PII, session states, and generated notices deleted permanently."
    }

@app.post("/api/upload-lease")
async def upload_lease_file(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Extracts text locally, masks all PII via Presidio, and returns masked text preview.
    Never sends raw document text over the wire.
    """
    contents = await file.read()
    filename = file.filename or "lease_agreement.txt"

    # Extract text locally
    if filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(contents))
            extracted_text = " ".join([page.extract_text() or "" for page in reader.pages])
        except Exception:
            extracted_text = contents.decode("utf-8", errors="ignore")
    else:
        extracted_text = contents.decode("utf-8", errors="ignore")

    engine = PrivacyEngine.get_instance()
    mask_res = engine.mask(extracted_text, session_id)

    return {
        "filename": filename,
        "extracted_chars": len(extracted_text),
        "masked_preview": mask_res.masked_text[:2000],
        "placeholders_detected": mask_res.placeholders_detected,
        "anonymized_count": mask_res.anonymized_count
    }
