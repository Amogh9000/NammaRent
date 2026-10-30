'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, EyeOff, Check, Sparkles } from 'lucide-react';

interface ConsentModalProps {
  onConsentAccepted: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ onConsentAccepted }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('namma_consent_accepted');
    if (!hasConsented) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('namma_consent_accepted', 'true');
    setIsOpen(false);
    onConsentAccepted();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200/60 p-7 sm:p-9 shadow-soft-blue space-y-6"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] border border-blue-100 text-[#2563EB] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A] font-heading tracking-tight">Privacy-First Architecture</h2>
              <span className="text-xs font-semibold text-[#2563EB]">Zero Cloud PII Storage</span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-sans">
            <div className="p-4 rounded-2xl bg-[#F4F6FB] border border-slate-200/60 flex items-start gap-3">
              <Lock className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#0F172A] block mb-0.5">Local Token Replacement (Presidio)</span>
                Your names, phone numbers, and addresses are replaced with typed placeholders locally prior to any AI analysis.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F6FB] border border-slate-200/60 flex items-start gap-3">
              <EyeOff className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#0F172A] block mb-0.5">Strict Hard Guard</span>
                Outgoing prompts are continuously re-scanned. If any vault value is detected, the request is immediately aborted.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F6FB] border border-slate-200/60 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#0F172A] block mb-0.5">Instant Data Wipe</span>
                You can permanently purge your in-memory session vault and generated documents at any time.
              </div>
            </div>
          </div>

          <button
            id="accept-consent-btn"
            onClick={handleAccept}
            className="w-full py-3.5 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4 text-white" />
            <span>I Understand & Consent to Local Evaluation</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
