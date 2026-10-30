'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Scale,
  Sparkles,
  Calendar,
  Info,
  BookOpen,
} from 'lucide-react';
import { StepRequest, StepResponse, LegalAnalysis } from '@/types/api';
import { CountUpValue } from '@/components/ui/CountUpValue';

interface DiagnosticWizardProps {
  sessionId: string;
  onNoticeReady: (pdfUrl: string, analysis: LegalAnalysis, userData: UserFormData) => void;
  onTriggerEmergency: (pin: string) => void;
  onAnalysisComplete?: (analysis: LegalAnalysis) => void;
}

export interface UserFormData {
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  pinCode: string;
  monthlyRent: number;
  depositPaid: number;
  deductionsClaimed: number;
  moveOutDate: string;
  noticeReceivedDate: string;
  effectiveDate: string;
  caseType: string;
  leaseRegistered: boolean;
  currentRent: number;
  proposedRent: number;
}

// Format ISO date string YYYY-MM-DD to "01 January 2026"
function formatDateDisplay(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Number to words (basic, for amounts up to crores)
function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
  return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '');
}

const DatePicker: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}> = ({ label, value, onChange, hint }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
        {hint && <span className="ml-1 text-slate-400 normal-case font-normal">{hint}</span>}
      </label>
      {value && (
        <span className="text-[11px] text-[#2563EB] font-bold">
          {formatDateDisplay(value)}
        </span>
      )}
    </div>
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] text-sm font-medium focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs [color-scheme:light] cursor-pointer"
      />
    </div>
  </div>
);

export const DiagnosticWizard: React.FC<DiagnosticWizardProps> = ({
  sessionId,
  onNoticeReady,
  onTriggerEmergency,
  onAnalysisComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StepResponse | null>(null);

  // Form states — pre-filled as editable defaults
  const [caseType, setCaseType] = useState<'deposit' | 'rent_hike' | 'harassment'>('deposit');
  const [tenantName, setTenantName] = useState('Ananya Rao');
  const [landlordName, setLandlordName] = useState('Suresh Kumar');
  const [propertyAddress, setPropertyAddress] = useState('Flat 402, Indiranagar, Bengaluru');
  const [pinCode, setPinCode] = useState('560038');
  const [leaseRegistered, setLeaseRegistered] = useState<boolean>(true);

  // Deposit fields
  const [monthlyRent, setMonthlyRent] = useState<number>(35000);
  const [depositPaid, setDepositPaid] = useState<number>(210000);
  const [deductionsClaimed, setDeductionsClaimed] = useState<number>(55000);
  const [moveOutDate, setMoveOutDate] = useState<string>('2026-09-30');
  const [itemisedBillsProvided, setItemisedBillsProvided] = useState<boolean>(false);

  // Rent hike fields
  const [currentRent, setCurrentRent] = useState<number>(35000);
  const [proposedRent, setProposedRent] = useState<number>(45500);
  const [noticeReceivedDate, setNoticeReceivedDate] = useState<string>('2026-09-15');
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-10-01');
  const [noticeChannel, setNoticeChannel] = useState<string>('WhatsApp / Verbal');

  const getUserFormData = (): UserFormData => ({
    tenantName,
    landlordName,
    propertyAddress,
    pinCode,
    monthlyRent: caseType === 'rent_hike' ? currentRent : monthlyRent,
    depositPaid,
    deductionsClaimed,
    moveOutDate,
    noticeReceivedDate,
    effectiveDate,
    caseType,
    leaseRegistered,
    currentRent,
    proposedRent,
  });

  const handleNext = async () => {
    if (caseType === 'harassment') {
      onTriggerEmergency(pinCode || '560038');
      return;
    }

    if (stepIndex < 3) {
      setStepIndex((prev) => prev + 1);
    } else if (stepIndex === 3) {
      setLoading(true);
      try {
        const payload: StepRequest = {
          session_id: sessionId,
          case_type: caseType,
          tenant_name: tenantName,
          landlord_name: landlordName,
          property_address: propertyAddress,
          pin_code: pinCode,
          lease_registered: leaseRegistered,
          ...(caseType === 'deposit'
            ? {
                monthly_rent: monthlyRent,
                deposit_paid: depositPaid,
                deductions_claimed: deductionsClaimed,
                deduction_reasons: 'Painting, cleaning, general wear and tear',
                move_out_date: moveOutDate,
                itemised_bills_provided: itemisedBillsProvided,
              }
            : {
                current_rent: currentRent,
                proposed_rent: proposedRent,
                notice_received_date: noticeReceivedDate,
                effective_date: effectiveDate,
                notice_channel: noticeChannel,
              }),
        };

        const res = await fetch('/api/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data: StepResponse = await res.json();
          setAnalysisResult(data);
          if (data.analysis) {
            onAnalysisComplete?.(data.analysis);
          }
          setStepIndex(4);
        }
      } catch (err) {
        console.error('Step execution error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirmAndGenerateNotice = async () => {
    setLoading(true);
    try {
      const payload: StepRequest = {
        session_id: sessionId,
        confirm_generation: true,
      };
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data: StepResponse = await res.json();
        if (data.analysis) {
          onNoticeReady(`/api/notice/${sessionId}`, data.analysis, getUserFormData());
        }
      }
    } catch (err) {
      console.error('Confirmation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ['Dispute Type', 'Parties & Premises', 'Financial Facts', 'Review Facts', 'Legal Findings'];

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step Numbers Bar */}
      <div className="flex items-center justify-between mb-8 px-2">
        {stepTitles.map((title, idx) => (
          <div key={title} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                stepIndex === idx
                  ? 'bg-[#0F172A] text-white shadow-sm ring-4 ring-slate-200/60 font-bold'
                  : stepIndex > idx
                  ? 'bg-[#EFF6FF] text-[#2563EB] border border-blue-200 font-bold'
                  : 'bg-white text-slate-400 border border-slate-200'
              }`}
            >
              {stepIndex > idx ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
            </div>
            <span
              className={`text-[11px] font-medium mt-1.5 hidden sm:block ${
                stepIndex === idx ? 'text-[#0F172A] font-bold' : 'text-slate-500'
              }`}
            >
              {title}
            </span>
          </div>
        ))}
      </div>

      {/* Main Rounded Card */}
      <div className="p-7 sm:p-10 rounded-3xl bg-white border border-slate-200/60 shadow-soft-card">
        <AnimatePresence mode="wait">
          {/* STEP 0: Category Selection */}
          {stepIndex === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Step 01</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1 font-heading">Select Dispute Category</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Choose your primary rental disagreement under Karnataka jurisdiction.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-1">
                {[
                  {
                    id: 'deposit',
                    title: 'Security Deposit Withheld / Arbitrary Deductions',
                    desc: 'Landlord refusing to refund deposit upon handover or making arbitrary painting/cleaning deductions without GST invoices.',
                    badge: 'Karnataka Rent Act 1999',
                  },
                  {
                    id: 'rent_hike',
                    title: 'Unlawful Rent Increase (>10% or <90 Days Notice)',
                    desc: 'Arbitrary rent escalation without statutory 90-day prior written notice or exceeding agreed guidelines.',
                    badge: 'Section 12 Notice Rule',
                  },
                  {
                    id: 'harassment',
                    title: 'Illegal Utility Cutoff or Lockout Threat',
                    desc: 'Emergency cutoff of water, electricity, or physical lock tampering. Direct offence under Section 27.',
                    badge: 'Emergency 112 Triage',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCaseType(item.id as any)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      caseType === item.id
                        ? 'border-[#2563EB] bg-[#EFF6FF] shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-base text-[#0F172A] font-heading">{item.title}</span>
                      <span className="text-[11px] font-semibold text-[#2563EB] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1: Parties & Premises */}
          {stepIndex === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Step 02</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1 font-heading">Parties & Property Details</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Stored strictly in your local session. Identities are tokenized prior to statutory analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Tenant Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Enter Tenant Name"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-medium focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Landlord / Owner Name
                  </label>
                  <input
                    type="text"
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    placeholder="Enter Landlord Name"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-medium focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Rented Property Address
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="Complete Flat/House Address in Bengaluru"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-medium focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Bengaluru PIN Code
                  </label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="e.g. 560038"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-medium focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Lease Registration Status
                  </label>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLeaseRegistered(true)}
                      className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-all ${
                        leaseRegistered
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Registered Lease
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaseRegistered(false)}
                      className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-all ${
                        !leaseRegistered
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      11-Month / Notarized
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Financial Facts & Timeline */}
          {stepIndex === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Step 03</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1 font-heading">Financial Facts & Timeline</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Passed to deterministic calculation routines for statutory benchmark comparison.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F4F6FB] border border-slate-200/70 space-y-5">
                {caseType === 'deposit' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Monthly Rent (₹)
                        </label>
                        <input
                          type="number"
                          value={monthlyRent}
                          onChange={(e) => setMonthlyRent(Number(e.target.value))}
                          placeholder="35000"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-semibold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Security Deposit Paid (₹)
                        </label>
                        <input
                          type="number"
                          value={depositPaid}
                          onChange={(e) => setDepositPaid(Number(e.target.value))}
                          placeholder="210000"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-semibold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Contested Deductions (₹)
                        </label>
                        <input
                          type="number"
                          value={deductionsClaimed}
                          onChange={(e) => setDeductionsClaimed(Number(e.target.value))}
                          placeholder="55000"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-rose-200 text-rose-700 placeholder-slate-400 text-sm font-semibold focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all shadow-xs"
                        />
                      </div>

                      <DatePicker
                        label="Move-Out Date"
                        value={moveOutDate}
                        onChange={setMoveOutDate}
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <label className="block text-xs font-bold text-[#0F172A] mb-2">
                        Did landlord provide itemised, GST-compliant repair invoices?
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setItemisedBillsProvided(true)}
                          className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-all ${
                            itemisedBillsProvided
                              ? 'border-[#2563EB] bg-white text-[#2563EB] shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Yes — Invoices Attached
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemisedBillsProvided(false)}
                          className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-all ${
                            !itemisedBillsProvided
                              ? 'border-[#2563EB] bg-white text-[#2563EB] shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          No — Arbitrary Deductions
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Current Monthly Rent (₹)
                        </label>
                        <input
                          type="number"
                          value={currentRent}
                          onChange={(e) => setCurrentRent(Number(e.target.value))}
                          placeholder="35000"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder-slate-400 text-sm font-semibold focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Proposed Rent (₹)
                        </label>
                        <input
                          type="number"
                          value={proposedRent}
                          onChange={(e) => setProposedRent(Number(e.target.value))}
                          placeholder="45500"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-rose-200 text-rose-700 placeholder-slate-400 text-sm font-semibold focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all shadow-xs"
                        />
                      </div>

                      <DatePicker
                        label="Notice Received Date"
                        value={noticeReceivedDate}
                        onChange={setNoticeReceivedDate}
                        hint="(Date you received rent hike notice)"
                      />

                      <DatePicker
                        label="Proposed Effective Date"
                        value={effectiveDate}
                        onChange={setEffectiveDate}
                        hint="(Date landlord wants hike to start)"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <label className="block text-xs font-bold text-[#0F172A] mb-2">
                        How was the notice delivered?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['WhatsApp / Verbal', 'Email', 'Registered Post', 'In-Person / Handwritten'].map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setNoticeChannel(ch)}
                            className={`py-2 px-4 rounded-xl text-xs font-semibold border transition-all ${
                              noticeChannel === ch
                                ? 'border-[#2563EB] bg-white text-[#2563EB] shadow-xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Review & Mask Verification */}
          {stepIndex === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Step 04</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1 font-heading">Review Facts & Verify</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Confirm inputs. Data will be analyzed locally under Karnataka statutory benchmarks.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F4F6FB] border border-slate-200/80 p-6 space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-slate-500 font-medium">Dispute Category:</span>
                  <span className="text-[#0F172A] font-bold uppercase">{caseType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-slate-500 font-medium">Parties:</span>
                  <span className="text-[#2563EB] font-bold">{tenantName} ➔ {landlordName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-slate-500 font-medium">Property / PIN:</span>
                  <span className="text-[#0F172A] font-semibold">{propertyAddress} ({pinCode})</span>
                </div>
                {caseType === 'deposit' ? (
                  <>
                    <div className="flex justify-between border-b border-slate-200/80 pb-3">
                      <span className="text-slate-500 font-medium">Deposit / Monthly Rent:</span>
                      <span className="text-[#0F172A] font-semibold">₹{depositPaid.toLocaleString()} / ₹{monthlyRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-3">
                      <span className="text-slate-500 font-medium">Contested Deduction:</span>
                      <span className="text-rose-600 font-bold">₹{deductionsClaimed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Move-Out Date:</span>
                      <span className="text-[#0F172A] font-semibold">{formatDateDisplay(moveOutDate)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-slate-200/80 pb-3">
                      <span className="text-slate-500 font-medium">Current / Proposed Rent:</span>
                      <span className="text-[#0F172A] font-semibold">₹{currentRent.toLocaleString()} → ₹{proposedRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-3">
                      <span className="text-slate-500 font-medium">Hike Percentage:</span>
                      <span className="text-rose-600 font-bold">{currentRent > 0 ? Math.round(((proposedRent - currentRent) / currentRent) * 100) : 0}%</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-3">
                      <span className="text-slate-500 font-medium">Notice Received:</span>
                      <span className="text-[#0F172A] font-semibold">{formatDateDisplay(noticeReceivedDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Effective From:</span>
                      <span className="text-[#0F172A] font-semibold">{formatDateDisplay(effectiveDate)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* What the AI will do — info callout */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm font-heading">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>What happens when you click "Analyze Against Karnataka Law"?</span>
                </div>
                <div className="text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                  <p>
                    <span className="font-semibold text-[#0F172A]">Step 1 — Law Retrieval:</span> The system searches our local Karnataka legal knowledge base (Karnataka Rent Act 1999, Transfer of Property Act 1882, Indian Contract Act 1872) using your case details.
                  </p>
                  <p>
                    <span className="font-semibold text-[#0F172A]">Step 2 — Arithmetic:</span> Exact calculations are run — deposit months vs. statutory 2-month limit, notice gap vs. 90-day rule, excess deduction amounts.
                  </p>
                  <p>
                    <span className="font-semibold text-[#0F172A]">Step 3 — Analysis:</span> An AI model is shown only your anonymized facts + the retrieved law passages. It identifies violations, explains what works and what doesn&apos;t under the law, and recommends a formal demand position.
                  </p>
                  <p className="text-slate-500 italic text-[10px]">
                    Your real name and address are never sent to the AI — they are replaced with tokens like [TENANT_NAME] before analysis.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-[#0F172A] text-xs flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0 text-[#2563EB]" />
                <span className="font-medium text-slate-700">Deterministic pipeline ready. Strict citation grounding will be enforced.</span>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Legal Findings & Demand Notice Approval */}
          {stepIndex === 4 && analysisResult && analysisResult.analysis && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider">Step 05 — Analysis Complete</span>
                  <h2 className="text-2xl font-extrabold text-[#0F172A] mt-0.5 font-heading">Statutory Findings & Demands</h2>
                </div>
                <div className="px-3.5 py-1 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#2563EB] text-xs font-bold font-mono">
                  Confidence {Math.round(analysisResult.analysis.confidence * 100)}%
                </div>
              </div>

              {/* Strict Arithmetic Summary - Filtered by dispute type */}
              {analysisResult.arithmetic && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs font-mono">
                  {caseType === 'deposit' && (
                    <>
                      {analysisResult.arithmetic.deposit_months != null && (
                        <div className="p-3.5 rounded-2xl bg-[#F4F6FB] border border-slate-200/70">
                          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">DEPOSIT RATIO</span>
                          <span className="text-[#0F172A] font-bold text-sm">
                            <CountUpValue value={Number(analysisResult.arithmetic.deposit_months)} suffix=" Months Rent" decimals={1} />
                          </span>
                        </div>
                      )}
                      {analysisResult.arithmetic.excess_deposit_months != null && (
                        <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-blue-200">
                          <span className="text-[#2563EB] block text-[10px] font-bold uppercase mb-1">EXCESS ADVANCE</span>
                          <span className="text-[#1D4ED8] font-bold text-sm">
                            <CountUpValue value={Number(analysisResult.arithmetic.excess_deposit_months)} suffix=" Months" decimals={1} />
                          </span>
                        </div>
                      )}
                      {analysisResult.arithmetic.net_refundable_amount != null && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                          <span className="text-emerald-700 block text-[10px] font-bold uppercase mb-1">MANDATORY REFUND</span>
                          <span className="text-emerald-800 font-bold text-sm">
                            <CountUpValue value={Number(analysisResult.arithmetic.net_refundable_amount)} prefix="₹" />
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {caseType === 'rent_hike' && (
                    <>
                      {analysisResult.arithmetic.rent_increase_percent != null && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                          <span className="text-rose-700 block text-[10px] font-bold uppercase mb-1">PROPOSED HIKE</span>
                          <span className="text-rose-800 font-bold text-sm">
                            <CountUpValue value={Number(analysisResult.arithmetic.rent_increase_percent)} suffix="%" decimals={1} />
                          </span>
                        </div>
                      )}
                      {analysisResult.arithmetic.notice_gap_days != null && (
                        <div className="p-3.5 rounded-2xl bg-[#F4F6FB] border border-slate-200/70">
                          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">NOTICE PERIOD</span>
                          <span className={analysisResult.arithmetic.statutory_90_day_met ? 'text-emerald-700 font-bold text-sm' : 'text-rose-700 font-bold text-sm'}>
                            <CountUpValue value={Number(analysisResult.arithmetic.notice_gap_days)} suffix=" Days" />
                          </span>
                        </div>
                      )}
                      {analysisResult.arithmetic.shortfall_days != null && analysisResult.arithmetic.shortfall_days > 0 && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                          <span className="text-amber-700 block text-[10px] font-bold uppercase mb-1">NOTICE SHORTFALL</span>
                          <span className="text-amber-800 font-bold text-sm">
                            <CountUpValue value={Number(analysisResult.arithmetic.shortfall_days)} suffix=" Days" />
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Unverified Gazette Warning */}
              {analysisResult.analysis.warning_unverified_sources &&
                analysisResult.analysis.warning_unverified_sources.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold block">Statutory Source Verification Note:</span>
                      <span className="text-amber-800">
                        Citations {analysisResult.analysis.warning_unverified_sources.join(', ')} contain gazette verification placeholders.
                        The formal notice will carry statutory citations.
                      </span>
                    </div>
                  </div>
                )}

              {/* Violations List */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {analysisResult.analysis.violations.map((v, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[#0F172A] text-sm font-heading">{v.issue}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#2563EB]">
                        {v.statutory_basis ? v.statutory_basis.split(' - ')[0] : 'Verified Statute'}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-xs">{v.summary}</p>
                  </div>
                ))}
              </div>

              {/* Recommended Demand */}
              <div className="p-5 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-xs">
                <span className="font-bold text-[#2563EB] block text-sm mb-1 font-heading">Recommended Formal Demand:</span>
                <p className="text-slate-700 leading-relaxed font-medium">{analysisResult.analysis.recommended_demand}</p>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Primary Action Buttons */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between gap-3 mt-8">
          {stepIndex > 0 && stepIndex < 4 ? (
            <button
              onClick={() => setStepIndex((prev) => prev - 1)}
              className="px-5 py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {stepIndex < 3 && (
            <button
              id="wizard-next-btn"
              onClick={handleNext}
              className="px-7 py-3 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white font-semibold text-xs flex items-center gap-2 transition-all ml-auto cursor-pointer shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {stepIndex === 3 && (
            <button
              id="run-analysis-btn"
              onClick={handleNext}
              disabled={loading}
              className="px-7 py-3 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white font-semibold text-xs flex items-center gap-2 transition-all ml-auto cursor-pointer shadow-sm disabled:opacity-75"
            >
              {loading ? (
                <span>Executing Deterministic Analysis...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze Against Karnataka Law</span>
                </>
              )}
            </button>
          )}

          {stepIndex === 4 && (
            <button
              id="confirm-generate-pdf-btn"
              onClick={handleConfirmAndGenerateNotice}
              disabled={loading}
              className="px-7 py-3 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white font-semibold text-xs flex items-center gap-2 transition-all ml-auto cursor-pointer shadow-sm disabled:opacity-75"
            >
              {loading ? (
                <span>Generating Legal Notice...</span>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Approve & Generate Legal Notice</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
