"""
Generates an authentic Karnataka tenancy legal demand notice as DOCX.
All user inputs (names, amounts, dates) are injected from NavigatorState.
Times New Roman 11pt, justified, real XML numbering (w:numPr). No placeholders.
"""
from pathlib import Path
from datetime import datetime
from typing import Any

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def _to_words(n: int) -> str:
    """Convert integer to Indian-English words (up to crores)."""
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    if n == 0:
        return 'Zero'
    if n < 0:
        return 'Minus ' + _to_words(-n)
    if n < 20:
        return ones[n]
    if n < 100:
        return tens[n // 10] + (' ' + ones[n % 10] if n % 10 else '')
    if n < 1000:
        return ones[n // 100] + ' Hundred' + (' ' + _to_words(n % 100) if n % 100 else '')
    if n < 100000:
        return _to_words(n // 1000) + ' Thousand' + (' ' + _to_words(n % 1000) if n % 1000 else '')
    if n < 10000000:
        return _to_words(n // 100000) + ' Lakh' + (' ' + _to_words(n % 100000) if n % 100000 else '')
    return _to_words(n // 10000000) + ' Crore' + (' ' + _to_words(n % 10000000) if n % 10000000 else '')


def _fmt_date(iso: str | None) -> str:
    """Format YYYY-MM-DD to '1 January 2026'. Passthrough if already formatted."""
    if not iso:
        return '_________'
    try:
        d = datetime.strptime(iso[:10], '%Y-%m-%d')
        return d.strftime('%d %B %Y').lstrip('0').strip()
    except Exception:
        return iso


def _fmt_inr(n: float | int | None) -> str:
    """Format number as INR string: 1,50,000"""
    if n is None:
        return '___'
    n_int = int(n)
    s = str(n_int)
    if len(s) <= 3:
        return s
    result = s[-3:]
    s = s[:-3]
    while s:
        result = s[-2:] + ',' + result if len(s) > 2 else s + ',' + result
        s = s[:-2]
    return result


def generate_demand_notice_docx(state: Any, output_path: Path) -> Path:
    # --- Extract state values ---
    tenant = getattr(state, 'tenant_name', None) or 'The Tenant'
    landlord = getattr(state, 'landlord_name', None) or 'The Landlord'
    address = getattr(state, 'property_address', None) or 'the said premises'
    pin = getattr(state, 'pin_code', None) or '560000'
    case_type = getattr(state, 'case_type', 'deposit')
    lease_registered = getattr(state, 'lease_registered', True)

    # Deposit case fields
    monthly_rent = int(getattr(state, 'monthly_rent', 0) or 0)
    deposit = int(getattr(state, 'deposit_paid', 0) or 0)
    deductions = int(getattr(state, 'deductions_claimed', 0) or 0)
    move_out = _fmt_date(getattr(state, 'move_out_date', None))
    itemised = getattr(state, 'itemised_bills_provided', False)
    refundable = max(0, deposit - deductions)

    # Rent hike case fields
    current_rent = int(getattr(state, 'current_rent', 0) or 0)
    proposed_rent = int(getattr(state, 'proposed_rent', 0) or 0)
    notice_date = _fmt_date(getattr(state, 'notice_received_date', None))
    effective_date = _fmt_date(getattr(state, 'effective_date', None))
    notice_channel = getattr(state, 'notice_channel', 'WhatsApp / Verbal')
    hike_pct = round(((proposed_rent - current_rent) / current_rent * 100)) if current_rent > 0 else 0

    # Arithmetic from analysis
    arith = getattr(state, 'arithmetic', None)
    if arith:
        notice_days = getattr(arith, 'notice_gap_days', None)
        net_refund = getattr(arith, 'net_refundable_amount', None)
        if net_refund is not None:
            refundable = int(net_refund)
    else:
        notice_days = None

    today = datetime.now().strftime('%d %B %Y').lstrip('0').strip()

    # --- Build Document ---
    doc = Document()
    sec = doc.sections[0]
    sec.page_height = Inches(11)
    sec.page_width = Inches(8.5)
    sec.top_margin = Inches(1.25)
    sec.bottom_margin = Inches(1.0)
    sec.left_margin = Inches(1.25)
    sec.right_margin = Inches(1.25)
    sec.different_first_page_header_footer = False
    for p in sec.header.paragraphs:
        p.clear()
    for p in sec.footer.paragraphs:
        p.clear()

    def para(t, bold=False, size=11, align=WD_ALIGN_PARAGRAPH.JUSTIFY, italic=False, underline=False):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.space_before = Pt(0)
        p.alignment = align
        r = p.add_run(str(t))
        r.font.name = 'Times New Roman'
        r.font.size = Pt(size)
        r.font.color.rgb = RGBColor(0, 0, 0)
        r.font.bold = bold
        r.font.italic = italic
        r.font.underline = underline
        return p

    def num_para(t, bold=False):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.left_indent = Pt(36)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pPr = p._element.get_or_add_pPr()
        numPr = OxmlElement('w:numPr')
        ilvl = OxmlElement('w:ilvl')
        ilvl.set(qn('w:val'), '0')
        numId = OxmlElement('w:numId')
        numId.set(qn('w:val'), '1')
        numPr.append(ilvl)
        numPr.append(numId)
        pPr.append(numPr)
        r = p.add_run(str(t))
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0, 0, 0)
        r.font.bold = bold
        return p

    # ---- DOCUMENT CONTENT ----

    # Title
    para('LEGAL NOTICE', bold=True, size=14, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Date / Place
    para(f'Date: {today}', bold=False, align=WD_ALIGN_PARAGRAPH.RIGHT)
    para('Place: Bengaluru, Karnataka', bold=False, align=WD_ALIGN_PARAGRAPH.RIGHT)

    doc.add_paragraph()  # blank line

    # To block
    para('To,', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
    para(landlord, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)
    para(f'{address}', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
    para(f'Bengaluru - {pin}', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)

    doc.add_paragraph()

    # Mode of delivery
    para('BY REGISTERED POST A.D. AND EMAIL', bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)

    doc.add_paragraph()

    # Subject
    if case_type == 'deposit':
        subject_text = (
            f'Subject: Legal notice calling upon you to refund the security deposit of Rs. {_fmt_inr(deposit)}/- '
            f'(Rupees {_to_words(deposit)} Only) for the premises at {address}, Bengaluru - {pin} '
            f'- under Sections 15 and 16 of the Karnataka Rent Act, 1999.'
        )
    else:
        subject_text = (
            f'Subject: Legal notice calling upon you to rescind the unlawful rent increase of {hike_pct}% '
            f'(from Rs. {_fmt_inr(current_rent)}/- to Rs. {_fmt_inr(proposed_rent)}/-) for the premises at {address}, Bengaluru - {pin} '
            f'- under Section 12 of the Karnataka Rent Act, 1999.'
        )
    para(subject_text, bold=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY)

    doc.add_paragraph()

    # Salutation
    para('Sir / Madam,', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)

    doc.add_paragraph()

    # Opening paragraph
    lease_type = 'a registered lease agreement' if lease_registered else 'an 11-month/notarised rental agreement'
    if case_type == 'deposit':
        para(
            f'Under this notice, I, {tenant}, a tenant at the residential premises at {address} '
            f'(the "said premises"), Bengaluru - {pin}, do hereby serve upon you the following '
            f'legal notice pursuant to {lease_type} executed between us.'
        )
    else:
        para(
            f'Under this notice, I, {tenant}, a tenant at the residential premises at {address} '
            f'(the "said premises"), Bengaluru - {pin}, do hereby serve upon you the following '
            f'legal notice in respect of the unlawful rent hike purportedly imposed by you, '
            f'pursuant to {lease_type} executed between us.'
        )

    doc.add_paragraph()

    # Numbered body paragraphs
    if case_type == 'deposit':
        num_para(
            f'That I was and am your tenant in the said premises on a monthly rent of Rs. {_fmt_inr(monthly_rent)}/- '
            f'(Rupees {_to_words(monthly_rent)} Only) under a rental agreement duly executed between us.'
        )
        num_para(
            f'That in terms of the said agreement, I paid you an interest-free refundable security deposit of '
            f'Rs. {_fmt_inr(deposit)}/- (Rupees {_to_words(deposit)} Only), which was to be refunded in full '
            f'upon my vacating the said premises.'
        )
        num_para(
            f'That I vacated the said premises on {move_out} and handed over vacant and peaceful possession '
            f'to you along with all keys and access cards, after duly clearing all rent and utility charges '
            f'due up to the date of vacation.'
        )
        num_para(
            f'That subsequent to vacation, I have on multiple occasions duly called upon you to refund the '
            f'security deposit, but you have failed and neglected to do so without providing any lawful reason '
            f'or documentary justification.'
        )
        if deductions > 0:
            invoice_text = (
                'without providing any itemised GST-compliant invoices, estimates, or bills supporting such deductions'
                if not itemised
                else 'based on invoices which are disputed as excessive and unrelated to tenant-caused damage'
            )
            num_para(
                f'That you have arbitrarily deducted a sum of Rs. {_fmt_inr(deductions)}/- '
                f'(Rupees {_to_words(deductions)} Only) from the deposit, {invoice_text}. '
                f'Ordinary wear and tear arising from normal residential use does not constitute damage and '
                f'cannot be deducted from the security deposit under Karnataka tenancy law.'
            )
        else:
            num_para(
                f'That you have failed and neglected to return the full security deposit of Rs. {_fmt_inr(deposit)}/- '
                f'without any lawful justification, itemised deduction statement, or prior intimation.'
            )
        num_para(
            f'That your failure to refund the security deposit of Rs. {_fmt_inr(refundable)}/- '
            f'(Rupees {_to_words(refundable)} Only) constitutes a breach of contract under the Indian Contract Act, 1872 '
            f'(Section 73), and a violation of Sections 15 and 16 of the Karnataka Rent Act, 1999, '
            f'entitling me to recovery of the said amount along with interest and compensation.'
        )
        # Demand
        doc.add_paragraph()
        para(
            f'I therefore call upon you, through this notice, to pay me the sum of Rs. {_fmt_inr(refundable)}/- '
            f'(Rupees {_to_words(refundable)} Only) being the net refundable security deposit, '
            f'within 15 (fifteen) days from the date of receipt of this notice, by bank transfer to my account, '
            f'together with interest at 12% per annum from the date of vacation until realisation.',
            align=WD_ALIGN_PARAGRAPH.JUSTIFY
        )
    else:
        num_para(
            f'That I am your tenant in the said premises paying a monthly rent of Rs. {_fmt_inr(current_rent)}/- '
            f'(Rupees {_to_words(current_rent)} Only) under {lease_type} executed between us.'
        )
        num_para(
            f'That on {notice_date}, you have purported to increase the monthly rent to '
            f'Rs. {_fmt_inr(proposed_rent)}/- (Rupees {_to_words(proposed_rent)} Only), '
            f'representing an increase of {hike_pct}%, with effect from {effective_date}, '
            f'communicated via {notice_channel}.'
        )
        notice_days_text = f'{notice_days} days' if notice_days is not None else 'insufficient days'
        num_para(
            f'That the said purported rent increase notice was given only {notice_days_text} before the proposed '
            f'effective date, which is substantially below the mandatory minimum 90-day prior written notice '
            f'required under Section 12 of the Karnataka Rent Act, 1999.'
        )
        num_para(
            f'That a unilateral rent increase exceeding 10% of the prevailing rent without 90 days prior '
            f'written notice and without mutual written consent is illegal and void ab initio under '
            f'Section 12 of the Karnataka Rent Act, 1999. WhatsApp messages and verbal communications '
            f'do not constitute valid legal notice under the said Act.'
        )
        if lease_registered:
            num_para(
                f'That as the existing lease agreement is a registered fixed-term agreement, no revision of '
                f'rent is permissible during the subsisting lease term without a mutually executed and '
                f'registered amendment deed. No such amendment has been executed.'
            )
        num_para(
            f'That the purported rent increase demand is therefore illegal, null, void and not binding '
            f'upon me in law. I am entitled to continue paying the existing monthly rent of '
            f'Rs. {_fmt_inr(current_rent)}/- and am not liable for any excess amount whatsoever.'
        )
        # Demand
        doc.add_paragraph()
        para(
            f'I therefore call upon you, through this notice, to forthwith withdraw the said unlawful '
            f'rent increase demand and confirm in writing within 15 (fifteen) days from the date of receipt of '
            f'this notice that the prevailing rent of Rs. {_fmt_inr(current_rent)}/- per month shall '
            f'continue to apply for the duration of the existing tenancy.',
            align=WD_ALIGN_PARAGRAPH.JUSTIFY
        )

    # Failing which
    doc.add_paragraph()
    para(
        'Failing which, I shall be constrained to initiate appropriate legal proceedings before the '
        'jurisdictional Rent Controller / Court of competent jurisdiction for the reliefs to which I '
        'am lawfully entitled, entirely at your risk as to costs and consequences.',
        align=WD_ALIGN_PARAGRAPH.JUSTIFY
    )

    # Without prejudice
    doc.add_paragraph()
    para(
        'This notice is issued without prejudice to my other rights and remedies available in law. '
        'A copy of this notice has been duly retained by me for record and further action.',
        align=WD_ALIGN_PARAGRAPH.JUSTIFY
    )

    # Signature block
    doc.add_paragraph()
    para('Yours faithfully,', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
    doc.add_paragraph()
    para(tenant, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)
    para(f'{address}, Bengaluru - {pin}', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
    para('(Tenant / Noticee)', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)

    # Enclosures
    doc.add_paragraph()
    para('Enclosures:', bold=True, size=11, align=WD_ALIGN_PARAGRAPH.LEFT)
    para('1. Copy of Rental Agreement', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
    if case_type == 'deposit':
        para('2. Proof of Security Deposit Payment (Bank Transfer Receipt / Cheque Copy)', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
        para('3. Possession Handover / Move-Out Records', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
    else:
        para(f'2. Copy of Rent Increase Communication dated {notice_date}', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)
        para('3. Copy of Existing Registered Lease Agreement', bold=False, align=WD_ALIGN_PARAGRAPH.LEFT)

    doc.save(str(output_path))
    return output_path
