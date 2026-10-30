/**
 * API Contract Types for Namma Tenant Navigator
 * Generated from backend OpenAPI specification.
 */

export interface KBChunk {
  id: string;
  title: string;
  act: string;
  section: string;
  verified: boolean;
  source_url: string;
  plain_summary: string;
  statute_text?: string;
  score?: number | null;
}

export interface MaskRequest {
  session_id: string;
  text: string;
  tenant_name?: string | null;
  landlord_name?: string | null;
  property_address?: string | null;
  pin_code?: string | null;
}

export interface MaskResponse {
  masked_text: string;
  placeholders_detected: Record<string, string>;
  anonymized_count: number;
  vault_items_count: number;
}

export interface ComputedArithmetic {
  deposit_months?: number | null;
  excess_deposit_months?: number | null;
  net_refundable_amount?: number | null;
  disputed_deductions?: number | null;
  rent_increase_percent?: number | null;
  notice_gap_days?: number | null;
  statutory_90_day_met?: boolean | null;
  shortfall_days?: number | null;
}

export interface LegalViolation {
  issue: string;
  statutory_basis: string;
  kb_chunk_id: string;
  is_verified: boolean;
  summary: string;
}

export interface LegalAnalysis {
  case_type: string;
  arithmetic?: ComputedArithmetic | null;
  violations: LegalViolation[];
  recommended_demand: string;
  confidence: number;
  citations: string[];
  warning_unverified_sources?: string[];
  insufficient_context?: boolean;
  guidance_message?: string | null;
}

export interface EmergencyInfo {
  pin_code?: string | null;
  authority_name: string;
  office_address: string;
  phone: string;
  police_emergency: string;
  bescom_helpline: string;
  bwssb_helpline: string;
  guidance: string;
  notes?: string | null;
  locality?: string | null;
  division?: string | null;
  court_jurisdiction?: string | null;
  alt_phone?: string | null;
  mobile?: string | null;
}

export interface StepRequest {
  session_id: string;
  case_type?: 'deposit' | 'rent_hike' | 'harassment' | null;
  tenant_name?: string | null;
  landlord_name?: string | null;
  property_address?: string | null;
  pin_code?: string | null;
  lease_registered?: boolean | null;
  
  // Deposit
  monthly_rent?: number | null;
  deposit_paid?: number | null;
  deductions_claimed?: number | null;
  deduction_reasons?: string | null;
  move_out_date?: string | null;
  itemised_bills_provided?: boolean | null;

  // Rent Hike
  current_rent?: number | null;
  proposed_rent?: number | null;
  notice_received_date?: string | null;
  effective_date?: string | null;
  notice_channel?: string | null;

  user_input?: string | null;
  confirm_generation?: boolean | null;
}

export interface StepResponse {
  session_id: string;
  current_step: string;
  case_type?: string | null;
  missing_fields: string[];
  follow_up_question?: string | null;
  arithmetic?: ComputedArithmetic | null;
  analysis?: LegalAnalysis | null;
  emergency_info?: EmergencyInfo | null;
  notice_ready: boolean;
  notice_pdf_url?: string | null;
}

export interface EmergencyRequest {
  pin_code?: string | null;
  distress_keyword?: string | null;
}

export interface ClearVaultRequest {
  session_id: string;
}
