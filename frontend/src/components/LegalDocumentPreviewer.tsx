'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, FileText, Stamp } from 'lucide-react';
import { LegalAnalysis } from '@/types/api';
import { UserFormData } from '@/components/DiagnosticWizard';

interface LegalDocumentPreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  sessionId: string;
  analysis?: LegalAnalysis | null;
  userData?: UserFormData | null;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '_________';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  } catch {
    return iso;
  }
}

function inr(n: number | undefined): string {
  if (!n) return '___';
  return n.toLocaleString('en-IN');
}

// Basic number to words
function toWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (!n || n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
  if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
}

export const LegalDocumentPreviewer: React.FC<LegalDocumentPreviewerProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  sessionId,
  analysis,
  userData,
}) => {
  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const tenant = userData?.tenantName || '[TENANT NAME]';
  const landlord = userData?.landlordName || '[LANDLORD NAME]';
  const address = userData?.propertyAddress || '[PROPERTY ADDRESS]';
  const pin = userData?.pinCode || '[PIN CODE]';
  const deposit = userData?.depositPaid || 0;
  const rent = userData?.monthlyRent || 0;
  const deductions = userData?.deductionsClaimed || 0;
  const refundable = analysis?.arithmetic?.net_refundable_amount ?? Math.max(0, deposit - deductions);
  const moveOut = formatDate(userData?.moveOutDate);
  const caseType = userData?.caseType || 'deposit';
  const currentRent = userData?.currentRent || 0;
  const proposedRent = userData?.proposedRent || 0;
  const noticeDate = formatDate(userData?.noticeReceivedDate);
  const effectiveDate = formatDate(userData?.effectiveDate);
  const hikePercent = currentRent > 0 ? Math.round(((proposedRent - currentRent) / currentRent) * 100) : 0;

  const isDepositCase = caseType === 'deposit';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200/60 shadow-soft-blue overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] font-heading">Legal Demand Notice — Filled Preview</h3>
                <p className="text-xs text-slate-500">
                  Karnataka Rent Act, 1999 · Transfer of Property Act, 1882 · Indian Contract Act, 1872
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                id="download-demand-notice-btn"
                href={pdfUrl}
                download={`Namma_Demand_Notice_${sessionId.slice(0, 8)}.docx`}
                className="px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download DOCX</span>
              </a>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Paper Document Preview */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-[#F4F6FB] flex justify-center items-start">
            <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-soft-card border border-slate-200/80 overflow-hidden">
              {/* Document Header Bar */}
              <div className="bg-[#0F172A] text-white px-8 py-4 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-blue-300 shrink-0" />
                <span className="text-xs font-semibold tracking-widest uppercase text-blue-200">Karnataka Tenant Legal Notice — Generated by Namma Tenant</span>
              </div>

              {/* Document Body */}
              <div className="p-8 sm:p-12 font-serif text-[13px] leading-[1.8] select-text space-y-4 max-h-[calc(90vh-12rem)] overflow-y-auto">

                {/* Title */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-extrabold tracking-widest text-[#0F172A] uppercase font-sans border-b-2 border-[#0F172A] pb-2 inline-block">
                    Legal Notice
                  </h2>
                </div>

                {/* Date / Place */}
                <div className="text-right text-[12px] text-slate-600 font-sans space-y-0.5">
                  <p><span className="font-semibold">Date:</span> {today}</p>
                  <p><span className="font-semibold">Place:</span> Bengaluru, Karnataka</p>
                </div>

                {/* To Block */}
                <div className="mt-4 text-[13px] font-sans space-y-0.5">
                  <p className="font-bold">To,</p>
                  <p className="font-semibold text-[#0F172A]">{landlord}</p>
                  <p className="text-slate-700">{address}</p>
                  <p className="text-slate-700">Bengaluru — {pin}</p>
                </div>

                {/* Mode */}
                <p className="font-sans font-bold text-[12px] text-slate-700 uppercase tracking-wide mt-1">
                  By Registered Post A.D. and Email
                </p>

                {/* Subject */}
                <div className="mt-2 p-3 bg-slate-50 border-l-4 border-[#0F172A] rounded-r-lg font-sans">
                  <p className="font-bold text-[#0F172A] text-[12px] leading-snug">
                    {isDepositCase
                      ? `Subject: Legal notice calling upon you to refund the security deposit of Rs. ${inr(deposit)}/- (Rupees ${toWords(deposit)} Only) for the premises at ${address} — under Sections 15 and 16 of the Karnataka Rent Act, 1999.`
                      : `Subject: Legal notice calling upon you to rescind the unlawful rent increase of ${hikePercent}% (from Rs. ${inr(currentRent)}/- to Rs. ${inr(proposedRent)}/-) for the premises at ${address} — under Section 12 of the Karnataka Rent Act, 1999.`
                    }
                  </p>
                </div>

                {/* Salutation */}
                <p className="font-sans mt-2">Sir / Madam,</p>

                {/* Opening */}
                <p className="font-sans">
                  Under this notice, I, <strong>{tenant}</strong>, residing at <strong>{address}</strong>, do hereby serve upon you the following in respect of the residential premises at <strong>{address}</strong> (PIN: <strong>{pin}</strong>).
                </p>

                {/* Numbered Paragraphs */}
                {isDepositCase ? (
                  <ol className="list-decimal list-outside ml-5 space-y-3 font-sans">
                    <li>
                      That I was your tenant in the residential premises bearing address <strong>{address}</strong> on a monthly rent of Rs. <strong>{inr(rent)}/-</strong> (Rupees {toWords(rent)} Only), under a rental agreement duly executed between us.
                    </li>
                    <li>
                      That in terms of the said agreement, I paid you an interest-free refundable security deposit of Rs. <strong>{inr(deposit)}/-</strong> (Rupees {toWords(deposit)} Only), which was to be refunded to me on my vacating the said premises.
                    </li>
                    <li>
                      That I vacated the said premises on <strong>{moveOut}</strong> and handed over vacant and peaceful possession to you along with all keys, after clearing all rent and utility charges due up to that date.
                    </li>
                    <li>
                      That I have duly requested you on multiple occasions to refund the security deposit, but you have failed to do so without any lawful reason or supporting documentation.
                    </li>
                    <li>
                      That {deductions > 0
                        ? `you have arbitrarily deducted a sum of Rs. ${inr(deductions)}/- (Rupees ${toWords(deductions)} Only) from the deposit without providing itemised GST-compliant bills, repair estimates, or any proof of damage beyond ordinary wear and tear. Such deductions are unlawful under Karnataka tenancy law.`
                        : `you have failed to refund the full security deposit of Rs. ${inr(deposit)}/- without any legally valid reason or itemised deduction statement.`
                      }
                    </li>
                    <li>
                      That under the Karnataka Rent Act, 1999 (Sections 15 and 16), and the Indian Contract Act, 1872 (Section 73), a landlord is legally obligated to refund the full security deposit upon termination of tenancy, less only such deductions as are supported by documentary evidence. Your failure to do so entitles me to recover the refundable amount of Rs. <strong>{inr(refundable)}/-</strong> (Rupees {toWords(refundable)} Only) along with interest and compensation.
                    </li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-outside ml-5 space-y-3 font-sans">
                    <li>
                      That I am your tenant residing at the premises at <strong>{address}</strong> (PIN: <strong>{pin}</strong>), paying a monthly rent of Rs. <strong>{inr(currentRent)}/-</strong> (Rupees {toWords(currentRent)} Only) under a duly executed rental agreement.
                    </li>
                    <li>
                      That you have purported to increase the monthly rent to Rs. <strong>{inr(proposedRent)}/-</strong> (Rupees {toWords(proposedRent)} Only), representing an increase of <strong>{hikePercent}%</strong> over the existing rent, with effect from <strong>{effectiveDate}</strong>.
                    </li>
                    <li>
                      That you communicated the said purported rent increase to me on <strong>{noticeDate}</strong>, which is <strong>{analysis?.arithmetic?.notice_gap_days ?? '___'} days</strong> before the proposed effective date — well below the mandatory 90-day statutory notice period required under Section 12 of the Karnataka Rent Act, 1999.
                    </li>
                    <li>
                      That a rent increase exceeding 10% of the existing rent without a registered lease amendment or 90-day prior written notice violates Section 12 of the Karnataka Rent Act, 1999, and cannot be unilaterally imposed by a landlord.
                    </li>
                    <li>
                      That as the existing lease agreement is a fixed-term agreement, no unilateral revision of rent is permissible during the lease term without mutual written consent and a registered deed of amendment.
                    </li>
                    <li>
                      That the purported rent increase is therefore illegal, void ab initio, and not binding upon me in law. I am entitled to continue paying the existing rent of Rs. {inr(currentRent)}/- and am not liable to pay any excess amount demanded by you.
                    </li>
                  </ol>
                )}

                {/* Demand Paragraph */}
                <p className="font-sans mt-3">
                  {isDepositCase
                    ? <>I therefore call upon you, through this notice, to pay me the sum of Rs. <strong>{inr(refundable)}/-</strong> (Rupees {toWords(refundable)} Only) being the refundable security deposit amount, within <strong>15 (fifteen) days</strong> from the date of receipt of this notice, failing which I shall be constrained to initiate appropriate legal proceedings against you for recovery of the said amount along with interest and costs, entirely at your risk as to costs and consequences.</>
                    : <>I therefore call upon you, through this notice, to forthwith withdraw the said unlawful rent increase demand and confirm in writing that the existing rent of Rs. <strong>{inr(currentRent)}/-</strong> per month shall continue to apply until the expiry of the current lease term, failing which I shall be constrained to initiate appropriate legal proceedings before the Rent Controller / Court of competent jurisdiction, entirely at your risk as to costs and consequences.</>
                  }
                </p>

                {/* Without Prejudice */}
                <p className="font-sans">
                  This notice is issued without prejudice to my other rights and remedies available in law. A copy of this notice has been retained by me for record and further action.
                </p>

                {/* Signature */}
                <div className="mt-8 pt-6 border-t border-slate-200 font-sans space-y-1">
                  <p>Yours faithfully,</p>
                  <div className="mt-6 pt-2">
                    <p className="font-bold text-[#0F172A]">{tenant}</p>
                    <p className="text-slate-700">{address}, Bengaluru — {pin}</p>
                    <p className="text-slate-700 text-[11px] mt-1">(Tenant / Noticee)</p>
                  </div>
                </div>

                {/* Enclosures */}
                <div className="mt-4 pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-sans space-y-1">
                  <p className="font-semibold text-slate-700 text-[12px]">Enclosures:</p>
                  <p>1. Copy of Rental Agreement</p>
                  {isDepositCase && <p>2. Proof of Security Deposit Payment (Bank Transfer Receipt / Cheque Copy)</p>}
                  {isDepositCase && <p>3. Inventory / Possession Handover Records (if available)</p>}
                  {!isDepositCase && <p>2. Copy of Rent Increase Communication received on {noticeDate}</p>}
                  {!isDepositCase && <p>3. Existing Registered Lease Agreement</p>}
                </div>

                {/* Footer note */}
                <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-400 font-sans text-center">
                  Generated by Namma Tenant Navigator · Karnataka Statutory Grounding · Session {sessionId.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
