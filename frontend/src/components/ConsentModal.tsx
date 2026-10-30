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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#121212] border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Privacy-First Architecture</h2>
              <span className="text-xs font-mono text-emerald-400">Zero Cloud PII Storage</span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-neutral-300 leading-relaxed font-sans">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block mb-0.5">Local Token Replacement (Presidio)</span>
                Your names, phone numbers, and addresses are replaced with stable tokens (e.g., [TENANT_NAME]) on this machine
                prior to any AI analysis.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <EyeOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block mb-0.5">Strict Hard Guard</span>
                Outgoing prompts are continuously re-scanned. If any vault value is detected, the request is immediately aborted.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block mb-0.5">Instant Data Wipe</span>
                You can permanently purge your in-memory session vault and generated documents at any time using the "Clear My Data" button.
              </div>
            </div>
          </div>

          <button
            id="accept-consent-btn"
            onClick={handleAccept}
            className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors shadow-subtle-glow cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>I Understand & Consent to Local Evaluation</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
