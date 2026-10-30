'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, FileText, CheckCircle, AlertTriangle, ShieldCheck, Printer } from 'lucide-react';
import { LegalAnalysis } from '@/types/api';

interface LegalDocumentPreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  sessionId: string;
  analysis?: LegalAnalysis | null;
}

export const LegalDocumentPreviewer: React.FC<LegalDocumentPreviewerProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  sessionId,
  analysis,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#141414] border border-neutral-800 shadow-paper overflow-hidden"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#121212]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Legal Demand Notice Preview</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Grounded in Transfer of Property Act & Karnataka Tenancy Practice Rules
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                id="download-demand-notice-btn"
                href={pdfUrl}
                download={`Namma_Demand_Notice_${sessionId.slice(0, 8)}.pdf`}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors shadow-subtle-glow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Notice</span>
              </a>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Paper Document Preview Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-neutral-950 flex justify-center">
            <div className="w-full max-w-2xl bg-white text-neutral-900 rounded-sm shadow-2xl p-8 sm:p-12 font-serif text-[13px] leading-relaxed select-text border border-neutral-300">
              {/* Formal Letterhead Header */}
              <div className="text-center pb-4 mb-6 border-b-2 border-neutral-900">
                <h2 className="text-lg font-bold tracking-tight text-neutral-950 uppercase font-sans">
                  Formal Legal Demand Notice
                </h2>
                <p className="text-[11px] font-sans font-semibold text-neutral-600 tracking-wider uppercase mt-0.5">
                  Issued under Transfer of Property Act, 1882 & Karnataka Tenancy Regulations
                </p>
              </div>

              {/* Notice Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans mb-6">
                <div>
                  <span className="font-bold block text-neutral-700">FROM:</span>
                  <span className="font-semibold text-neutral-900">Former Tenant (Details Protected)</span>
                  <br />
                  <span>Bengaluru Urban District, Karnataka</span>
                </div>
                <div>
                  <span className="font-bold block text-neutral-700">TO:</span>
                  <span className="font-semibold text-neutral-900">Lessor / Property Owner</span>
                  <br />
                  <span>Bengaluru, Karnataka</span>
                </div>
              </div>

              <div className="text-xs font-sans font-bold text-neutral-800 mb-4 pb-2 border-b border-neutral-200">
                DATE: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} |
                MODE: Registered Post A.D. & Formal Written Notice
              </div>

              {/* Subject */}
              <div className="text-xs font-sans font-bold text-neutral-950 mb-4 bg-neutral-100 p-2.5 rounded border border-neutral-300">
                SUBJECT: URGENT LEGAL DEMAND FOR IMMEDIATE REFUND OF SECURITY DEPOSIT WITH INTEREST & SUBMISSION OF
                ITEMISED GST INVOICES
              </div>

              {/* Verification Status Warning in Preview */}
              {analysis && analysis.warning_unverified_sources && analysis.warning_unverified_sources.length > 0 && (
                <div className="p-3 mb-4 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-sans leading-tight">
                  <span className="font-bold block">⚠️ STATUTE VERIFICATION NOTICE:</span>
                  The statutory citations ({analysis.warning_unverified_sources.join(', ')}) contain gazette verification
                  placeholders. Advocate review is advised before filing in the Court of Small Causes.
                </div>
              )}

              {/* Statement of Facts */}
              <div className="space-y-2 mb-4 font-sans text-xs">
                <span className="font-bold block text-neutral-900 uppercase">Statement of Facts:</span>
                <p>
                  1. That the Tenant peacefully vacated and handed over vacant physical possession of the tenancy premises with all utility dues cleared.
                </p>
                <p>
                  2. That the advance security deposit paid at commencement exceeds the recognized 2-month residential benchmark under the Model Tenancy framework.
                </p>
                <p>
                  3. That you have unlawfully withheld sums citing arbitrary deductions for painting and ordinary wear-and-tear without furnishing itemised, GST-compliant repair invoices.
                </p>
              </div>

              {/* Legal Grounds */}
              <div className="space-y-2 mb-6 font-sans text-xs">
                <span className="font-bold block text-neutral-900 uppercase">Legal Grounds & Statutory Violations:</span>
                {analysis?.violations.map((v, i) => (
                  <div key={i} className="pl-3 border-l-2 border-neutral-900 text-neutral-800">
                    <span className="font-bold">{v.issue}</span> ({v.statutory_basis} [Citation: {v.kb_chunk_id}])
                    <p className="text-[11px] text-neutral-700 mt-0.5">{v.summary}</p>
                  </div>
                ))}
              </div>

              {/* Specific Demand */}
              <div className="p-3 bg-neutral-100 rounded border border-neutral-300 font-sans text-xs mb-6">
                <span className="font-bold block text-neutral-900">SPECIFIC DEMAND:</span>
                <p className="text-neutral-800 mt-1">
                  You are hereby called upon to pay and remit the full refundable balance directly into the Tenant's bank account
                  within <b>SEVEN (7) DAYS</b> of receipt of this notice, failing which formal legal proceedings shall be initiated.
                </p>
              </div>

              {/* Signature Block */}
              <div className="pt-6 border-t border-neutral-300 grid grid-cols-2 text-xs font-sans">
                <div>
                  <p>Yours faithfully,</p>
                  <div className="h-10" />
                  <p className="font-bold">[Tenant Signature]</p>
                </div>
                <div className="text-right text-neutral-500 text-[10px]">
                  Copy to: Legal Counsel Record File<br />
                  Court of Small Causes, Bengaluru
                </div>
              </div>

              {/* Running Mandatory Footer */}
              <div className="mt-8 pt-3 border-t border-neutral-200 text-center text-[10px] text-neutral-500 font-sans">
                Generated by an AI assistant. Not legal advice. Verify before sending.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
