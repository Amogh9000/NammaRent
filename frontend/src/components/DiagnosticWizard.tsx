'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calculator,
  ShieldCheck,
  Scale,
  Sparkles,
  Info,
} from 'lucide-react';
import { StepRequest, StepResponse, LegalAnalysis } from '@/types/api';

interface DiagnosticWizardProps {
  sessionId: string;
  onNoticeReady: (pdfUrl: string, analysis: LegalAnalysis) => void;
  onTriggerEmergency: (pin: string) => void;
}

export const DiagnosticWizard: React.FC<DiagnosticWizardProps> = ({
  sessionId,
  onNoticeReady,
  onTriggerEmergency,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StepResponse | null>(null);

  // Only issue type + lease option are collected; everything else is placeholder
  const [caseType, setCaseType] = useState<'deposit' | 'rent_hike' | 'harassment'>('deposit');
  const [leaseRegistered, setLeaseRegistered] = useState<boolean>(true);
  const [itemisedBillsProvided, setItemisedBillsProvided] = useState<boolean>(false);

  const handleNext = async () => {
    if (caseType === 'harassment') {
      onTriggerEmergency('560038');
      return;
    }

    // Advance wizard step
    if (stepIndex < 3) {
      setStepIndex((prev) => prev + 1);
    } else if (stepIndex === 3) {
      // Execute evaluation via /api/step
      setLoading(true);
      try {
        const payload: StepRequest = {
          session_id: sessionId,
          case_type: caseType,
          tenant_name: '[Tenant Name]',
          landlord_name: '[Landlord / Owner Name]',
          property_address: '[Property Address]',
          pin_code: '[Bengaluru PIN]',
          lease_registered: leaseRegistered,
          ...(caseType === 'deposit'
            ? {
                monthly_rent: 35000,
                deposit_paid: 210000,
                deductions_claimed: 55000,
                deduction_reasons: '[Stated Deduction Reason — e.g. painting, wear-and-tear]',
                move_out_date: '[Move-Out Date]',
                itemised_bills_provided: itemisedBillsProvided,
              }
            : {
                current_rent: 40000,
                proposed_rent: 52000,
                notice_received_date: '[Notice Received Date]',
                effective_date: '[Effective Date]',
                notice_channel: '[WhatsApp / Email / Letter / Verbal]',
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
          setStepIndex(4); // Move to Analysis Review Step
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
          onNoticeReady(`/api/notice/${sessionId}`, data.analysis);
        }
      }
    } catch (err) {
      console.error('Confirmation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const springTransition = {
    type: 'spring',
    stiffness: 320,
    damping: 30,
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8 px-2">
        {['Dispute Type', 'Identities', 'Financials', 'Review Facts', 'Legal Findings'].map(
          (title, idx) => (
            <div key={title} className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-colors ${
                  stepIndex === idx
                    ? 'bg-emerald-500 text-black font-bold ring-4 ring-emerald-500/20'
                    : stepIndex > idx
                    ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
                }`}
              >
                {stepIndex > idx ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <span className="text-[10px] text-neutral-500 mt-1 hidden sm:block">{title}</span>
            </div>
          )
        )}
      </div>

      {/* Morphing Step Card */}
      <div className="relative rounded-3xl border border-neutral-800 bg-[#121212] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl overflow-hidden min-h-[420px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* STEP 0: Case Selection */}
          {stepIndex === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Step 1 of 4</span>
                <h2 className="text-2xl font-bold text-white mt-1">What issue are you facing?</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Select your primary tenancy dispute. The system applies specific Karnataka statutes.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {[
                  {
                    type: 'deposit',
                    title: 'Security Deposit Deductions or Delay',
                    desc: 'Landlord withholding deposit for painting, wear-and-tear, or refusing timely handover refund.',
                    badge: 'Karnataka Model Tenancy 2-Month Cap',
                  },
                  {
                    type: 'rent_hike',
                    title: 'Unlawful Rent Increase Notice',
                    desc: 'Arbitrary rent hike served with less than 90 days statutory advance notice.',
                    badge: 'Mandatory 90-Day Written Notice',
                  },
                  {
                    type: 'harassment',
                    title: 'Emergency: Power/Water Cut or Lockout',
                    desc: 'Landlord disconnected utilities or threatened illegal eviction. Immediate relief.',
                    badge: 'Section 27 Karnataka Rent Act Offence',
                  },
                ].map((item) => (
                  <div
                    key={item.type}
                    onClick={() => setCaseType(item.type as any)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      caseType === item.type
                        ? 'border-emerald-500/80 bg-emerald-500/5 shadow-subtle-glow'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-white">{item.title}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1: Parties & Premises */}
          {stepIndex === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
              className="space-y-5"
            >
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Step 2 of 4</span>
                <h2 className="text-2xl font-bold text-white mt-1">Parties & Property</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Registered directly into your in-memory vault. Never shared raw with models.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400">
                  <span className="block font-bold text-neutral-300">Tenant Name:</span> [Tenant Name]
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400">
                  <span className="block font-bold text-neutral-300">Landlord / Owner:</span> [Landlord Name]
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400 sm:col-span-2">
                  <span className="block font-bold text-neutral-300">Property Address:</span> [Property Address]
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400">
                  <span className="block font-bold text-neutral-300">PIN / Jurisdiction:</span> [Bengaluru PIN]
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5">Lease Formally Registered?</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setLeaseRegistered(true)} className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${leaseRegistered ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400'}`}>Registered</button>
                    <button type="button" onClick={() => setLeaseRegistered(false)} className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${!leaseRegistered ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400'}`}>11-Month / Stamp</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Financials & Arithmetic Facts */}
          {stepIndex === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
              className="space-y-4"
            >
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Step 3 of 4</span>
                <h2 className="text-2xl font-bold text-white mt-1">Financial Facts & Timeline</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Passed directly to deterministic Python arithmetic routines.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Financial Facts</h3>
                  <p className="text-[11px] text-neutral-400">Placeholder profile used for statutory arithmetic. Replace with actual values when ready.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="block text-[10px] text-neutral-500">MONTHLY RENT</span>
                    ₹35,000 — baseline residential benchmark
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="block text-[10px] text-neutral-500">SECURITY DEPOSIT</span>
                    ₹210,000 (6 months) — exceeds 2-month cap
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="block text-[10px] text-neutral-500">DEDUCTION CLAIMED</span>
                    ₹55,000 — painting / cleaning / wear
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <span className="block text-[10px] text-neutral-500">MOVE-OUT DATE</span>
                    30 Sep 2026
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-800">
                  <label className="block text-xs font-bold text-neutral-300 mb-2">Did landlord provide itemised, GST-compliant repair invoices?</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setItemisedBillsProvided(true)} className={`flex-1 py-2 rounded-xl text-xs font-medium border ${itemisedBillsProvided ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400'}`}>Yes — Invoices Attached</button>
                    <button type="button" onClick={() => setItemisedBillsProvided(false)} className={`flex-1 py-2 rounded-xl text-xs font-medium border ${!itemisedBillsProvided ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400'}`}>No — Arbitrary Deductions</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Summary before Python/LLM Execution */}
          {stepIndex === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
              className="space-y-4"
            >
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Step 4 of 4</span>
                <h2 className="text-2xl font-bold text-white mt-1">Review & Local Mask Verification</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Confirm facts. All PII will pass through local Presidio tokenization before statutory analysis.
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between border-b border-neutral-900 pb-2">
                  <span className="text-neutral-500">Dispute Type:</span>
                  <span className="text-white uppercase">{caseType}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900 pb-2">
                  <span className="text-neutral-500">Tenant / Landlord:</span>
                  <span className="text-emerald-400">[Tenant Name] ➔ [Landlord Name]</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900 pb-2">
                  <span className="text-neutral-500">Property / PIN:</span>
                  <span className="text-white">[Property Address] — [Bengaluru PIN]</span>
                </div>
                <div className="flex justify-between border-b border-neutral-900 pb-2">
                  <span className="text-neutral-500">Lease Registered:</span>
                  <span className="text-white">{leaseRegistered ? 'Registered' : '11-Month / Stamp'}</span>
                </div>
                {caseType === 'deposit' ? (
                  <>
                    <div className="flex justify-between border-b border-neutral-900 pb-2">
                      <span className="text-neutral-500">Deposit / Rent:</span>
                      <span className="text-white">[Deposit Amount] / [Monthly Rent]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Deduction Contested:</span>
                      <span className="text-rose-400 font-bold">[Withheld Amount]</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-neutral-900 pb-2">
                      <span className="text-neutral-500">Rent Revision:</span>
                      <span className="text-white">[Current Rent] ➔ [Proposed Rent]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Notice Mode:</span>
                      <span className="text-white uppercase">[Notice Channel]</span>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Deterministic pipeline ready. Strict citation grounding will be enforced.</span>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Legal Findings & Demand Notice Approval */}
          {stepIndex === 4 && analysisResult && analysisResult.analysis && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTransition}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Analysis Complete</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">Statutory Violations & Demand</h2>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  Confidence {Math.round(analysisResult.analysis.confidence * 100)}%
                </div>
              </div>

              {/* Strict Python Arithmetic Banner */}
              {analysisResult.arithmetic && (
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {analysisResult.arithmetic.deposit_months != null && (
                    <div>
                      <span className="text-neutral-500 block">Deposit Ratio:</span>
                      <span className="text-white font-bold">{analysisResult.arithmetic.deposit_months} Months Rent</span>
                    </div>
                  )}
                  {analysisResult.arithmetic.excess_deposit_months != null && (
                    <div>
                      <span className="text-neutral-500 block">Excess Advance:</span>
                      <span className="text-amber-400 font-bold">
                        {analysisResult.arithmetic.excess_deposit_months} Months
                      </span>
                    </div>
                  )}
                  {analysisResult.arithmetic.net_refundable_amount != null && (
                    <div>
                      <span className="text-neutral-500 block">Mandatory Refund:</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{Number(analysisResult.arithmetic.net_refundable_amount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {analysisResult.arithmetic.rent_increase_percent != null && (
                    <div>
                      <span className="text-neutral-500 block">Proposed Hike:</span>
                      <span className="text-rose-400 font-bold">{analysisResult.arithmetic.rent_increase_percent}%</span>
                    </div>
                  )}
                  {analysisResult.arithmetic.notice_gap_days != null && (
                    <div>
                      <span className="text-neutral-500 block">Notice Period:</span>
                      <span className={analysisResult.arithmetic.statutory_90_day_met ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                        {analysisResult.arithmetic.notice_gap_days} Days ({analysisResult.arithmetic.statutory_90_day_met ? 'Valid' : 'Shortfall'})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Unverified KB Warning Alert */}
              {analysisResult.analysis.warning_unverified_sources &&
                analysisResult.analysis.warning_unverified_sources.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Statutory Source Verification Pending Gazette:</span>
                      <span className="text-amber-300/80">
                        Citations {analysisResult.analysis.warning_unverified_sources.join(', ')} contain gazette verification placeholders.
                        The PDF Demand Notice will carry an advocate review banner.
                      </span>
                    </div>
                  </div>
                )}

              {/* Grounded Violations List */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {analysisResult.analysis.violations.map((v, i) => (
                  <div key={i} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">{v.issue}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400">
                        {v.statutory_basis ? v.statutory_basis.split(' - ')[0] : 'Verified Statute'}
                      </span>
                    </div>
                    <p className="text-neutral-400 leading-relaxed text-[11px]">{v.summary}</p>
                  </div>
                ))}
              </div>

              {/* Recommended Demand */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/20 text-xs">
                <span className="font-semibold text-emerald-400 block mb-1">Recommended Formal Demand:</span>
                <p className="text-neutral-300 leading-relaxed">{analysisResult.analysis.recommended_demand}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        <div className="pt-6 border-t border-neutral-800 flex items-center justify-between gap-3 mt-4">
          {stepIndex > 0 && stepIndex < 4 ? (
            <button
              onClick={() => setStepIndex((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
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
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors ml-auto cursor-pointer"
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
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors ml-auto cursor-pointer"
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
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors ml-auto cursor-pointer"
            >
              {loading ? (
                <span>Generating DOCX Notice...</span>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Approve & Generate DOCX Notice</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
