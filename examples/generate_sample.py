"""
Script to generate examples/sample_notice.pdf for a realistic Bengaluru deposit dispute scenario.
Scenario:
- Tenant: Rahul Nair
- Landlord: S. Venkatraman
- Property: #402, Palm Grove Heights, 100ft Road, Indiranagar, Bengaluru - 560038
- Rent: ₹35,000 / month
- Deposit Paid: ₹2,10,000 (6 months rent)
- Deductions Claimed: ₹60,000 (standard painting + deep cleaning fee)
- Itemised bills provided: No
- Move out date: 2026-09-30
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.graph import NavigatorState, triage_node, collect_facts_node, mask_node, retrieve_law_node, analyze_node, confirm_node, generate_notice_node
from backend.pdf_gen import generate_demand_notice_pdf
from backend.privacy import PrivacyEngine
from backend.config import settings

def main():
    session_id = "sample-deposit-dispute-blr"
    engine = PrivacyEngine.get_instance()
    
    # Pre-register real names in local vault
    engine.register_known_entities(
        session_id=session_id,
        tenant_name="Rahul Nair",
        landlord_name="S. Venkatraman",
        property_address="#402, Palm Grove Heights, 100ft Road, Indiranagar, Bengaluru",
        pin_code="560038"
    )

    state_dict = {
        "session_id": session_id,
        "tenant_name": "Rahul Nair",
        "landlord_name": "S. Venkatraman",
        "property_address": "#402, Palm Grove Heights, 100ft Road, Indiranagar, Bengaluru",
        "pin_code": "560038",
        "case_type": "deposit",
        "monthly_rent": 35000.0,
        "deposit_paid": 210000.0,
        "deductions_claimed": 60000.0,
        "deduction_reasons": "Arbitrary 1-month rent deduction for repainting and deep cleaning",
        "move_out_date": "2026-09-30",
        "itemised_bills_provided": False,
        "lease_registered": True,
        "user_confirmed": True
    }

    # Run through graph nodes deterministically
    s1 = triage_node(state_dict)
    s2 = collect_facts_node(s1)
    s3 = mask_node(s2)
    s4 = retrieve_law_node(s3)
    s5 = analyze_node(s4)
    s6 = confirm_node(s5)
    
    output_pdf = settings.EXAMPLES_DIR / "sample_notice.pdf"
    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    
    state_obj = NavigatorState(**s6)
    generate_demand_notice_pdf(state_obj, output_pdf)
    print(f"Successfully generated sample PDF notice at: {output_pdf}")
    print(f"File size: {output_pdf.stat().st_size} bytes")

if __name__ == "__main__":
    main()
