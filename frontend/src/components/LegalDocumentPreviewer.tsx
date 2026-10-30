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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-neutral-300 shadow-lg"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-300 bg-[#eaeaea]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Legal Demand Notice Preview</h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Grounded in Transfer of Property Act & Karnataka Tenancy Practice Rules
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                id="download-demand-notice-btn"
                href={pdfUrl}
                download={`Namma_Demand_Notice_${sessionId.slice(0, 8)}.docx`}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors shadow-subtle-glow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download DOCX Notice</span>
              </a>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-neutral-600 hover:text-black hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Paper Document Preview Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-neutral-100 flex justify-center items-start">
            <div className="w-full max-w-2xl bg-white text-neutral-900 rounded-sm shadow-md p-8 sm:p-12 font-serif text-[13px] leading-relaxed select-text border border-neutral-300 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="text-center pb-2 mb-4">
                <h2 className="text-xl font-extrabold tracking-tight text-black uppercase font-sans">Legal Notice</h2>
              </div>
              <div className="text-right mb-1">
                <p className="text-[11px] font-sans font-medium text-neutral-700">Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-[11px] font-sans font-medium text-neutral-700">Place: Bengaluru</p>
              </div>
              <div className="my-3">
                <p className="font-medium">To,</p>
                <p>[LANDLORD NAME]</p>
                <p>[LANDLORD ADDRESS LINE 1]</p>
                <p>[LANDLORD ADDRESS LINE 2], Bengaluru - [PIN CODE]</p>
              </div>
              <p className="font-bold text-sm mb-3">Subject: Legal notice calling upon you to refund the security deposit of Rs. [DEPOSIT AMOUNT]/- (Rupees [DEPOSIT AMOUNT IN WORDS] only) for the premises at [PROPERTY ADDRESS]. — under Sections 15 and 16 of the Karnataka Rent Act, 1999.</p>
              <p>Sir/Madam,</p>
              <p>Under this notice, I, [TENANT NAME], residing at [TENANT CURRENT ADDRESS], do hereby serve upon you the following in respect of the residential premises at [PROPERTY ADDRESS] (PIN: [BENGALURU PIN]).</p>
              {["That I was your tenant in the residential premises bearing address [PROPERTY ADDRESS] (the “said premises”) from [LEASE START DATE] to [MOVE-OUT DATE], on a monthly rent of Rs. [MONTHLY RENT]/- (Rupees [MONTHLY RENT IN WORDS] only), under a rental agreement dated [AGREEMENT DATE].","That in terms of the said agreement, I paid you an interest-free refundable security deposit of Rs. [DEPOSIT AMOUNT]/- (Rupees [DEPOSIT AMOUNT IN WORDS] only) on [DEPOSIT PAYMENT DATE] by [MODE OF PAYMENT], which was to be refunded to me on my vacating the said premises.","That I vacated the said premises on [MOVE-OUT DATE] and handed over vacant and peaceful possession to you along with all keys, after clearing all rent and utility charges due up to that date.","That I requested you to refund the deposit on [DATE OF FIRST REQUEST] and again on [DATE OF SECOND REQUEST], but you have neither refunded it nor given any reasonable explanation for withholding it.","That you have not furnished any itemised statement of deductions, nor any bills or proof of damage. Ordinary wear and tear arising from normal use of the said premises cannot be deducted from the deposit, and you have no lawful ground to retain it.","That your failure to refund the deposit is a breach of the rental agreement, entitling me to recover the amount along with compensation under Section 73 of the Indian Contract Act, 1872."].map((t,i)=><p key={i} className="mb-1">{i+1}. {t}</p>)}
              <p className="mt-2">I therefore call upon you, through this notice, to pay me Rs. [REFUNDABLE AMOUNT]/- (Rupees [REFUNDABLE AMOUNT IN WORDS] only) within 7 (seven) days from the receipt of this notice, by transfer to my bank account [ACCOUNT DETAILS], together with interest at [INTEREST RATE]% per annum from the date of this notice until realisation, and Rs. [NOTICE COST]/- towards the cost of this notice.</p>
              <p>Failing which, I shall be constrained to initiate appropriate legal proceedings against you for recovery of the said amount along with interest and costs, entirely at your risk as to costs and consequences.</p>
              <p>This notice is issued without prejudice to my other rights and remedies available in law. A copy of this notice has been retained by me for record and further action.</p>
              <div className="mt-4 pt-2 border-t border-neutral-300">
                <p className="font-bold">Yours faithfully,</p>
                <p className="font-bold">[TENANT NAME]</p>
                <p>[TENANT CURRENT ADDRESS]</p>
                <p>Mobile: [TENANT MOBILE]</p>
                <p>Email: [TENANT EMAIL]</p>
                <p className="mt-1 text-xs text-neutral-500">Enclosures: 1. Copy of rental agreement dated [AGREEMENT DATE]. 2. Proof of payment of security deposit.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
