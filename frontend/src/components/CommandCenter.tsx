'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Scale, AlertCircle, ArrowRight, Lock, CheckCircle2, PhoneCall } from 'lucide-react';
import { KBChunk } from '@/types/api';

interface CommandCenterProps {
  onStartEvaluation: () => void;
  onOpenEmergency: () => void;
  onSelectStatute?: (chunk: KBChunk) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  onStartEvaluation,
  onOpenEmergency,
  onSelectStatute,
}) => {
  const [statutes, setStatutes] = useState<KBChunk[]>([]);
  const [loadingStatutes, setLoadingStatutes] = useState(true);

  useEffect(() => {
    fetch('/api/statutes')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: KBChunk[]) => {
        setStatutes(data);
        setLoadingStatutes(false);
      })
      .catch(() => {
        // Fallback default KB chunks if backend is starting
        setStatutes([
          {
            id: 'KB-DEP-001',
            title: 'Security Deposit Cap (2 Months)',
            act: 'Model Tenancy Framework & Karnataka Tenancy Practice Rules',
            section: 'Section 11',
            verified: false,
            source_url: 'https://dpal.karnataka.gov.in/',
            plain_summary: 'Residential security deposits cannot exceed 2 months rent. Refund mandatory on handover.',
          },
          {
            id: 'KB-WTR-002',
            title: 'Wear & Tear vs Damage & Itemised Bills',
            act: 'Transfer of Property Act',
            section: 'Section 108(m)',
            verified: false,
            source_url: 'https://www.indiacode.nic.in/',
            plain_summary: 'Normal wear, tear, and aging paint cannot be deducted without itemised GST invoices.',
          },
          {
            id: 'KB-RNT-003',
            title: 'Mandatory 90-Day Advance Notice for Rent Revisions',
            act: 'Karnataka Tenancy Guidelines',
            section: 'Section 12',
            verified: false,
            source_url: 'https://mohua.gov.in/',
            plain_summary: 'Any rent increase requires 90 days prior written notice before becoming enforceable.',
          },
          {
            id: 'KB-UTL-006',
            title: 'Prohibition on Disconnection of Essential Utilities',
            act: 'Karnataka Rent Act, 1999',
            section: 'Section 27',
            verified: false,
            source_url: 'https://dpal.karnataka.gov.in/',
            plain_summary: 'Landlords cannot cut off water, electricity, or lock premises. Direct offence.',
          },
        ]);
        setLoadingStatutes(false);
      });
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 pt-12 pb-20">
      {/* Statute Ticker Banner */}
      <div className="w-full mb-10 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 shrink-0 uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>Karnataka Statutes</span>
          </div>
          <div className="h-3.5 w-px bg-neutral-700 shrink-0" />
          <div className="overflow-x-auto whitespace-nowrap flex gap-4 text-xs text-neutral-400 no-scrollbar">
            {statutes.map((s, idx) => (
              <span
                key={s.id || idx}
                onClick={() => onSelectStatute && onSelectStatute(s)}
                className="inline-flex items-center gap-2 cursor-pointer hover:text-neutral-200 transition-colors"
              >
                <span className="font-mono text-[10px] text-neutral-500 bg-neutral-800/80 px-1.5 py-0.5 rounded">
                  {s.id}
                </span>
                <span className="font-medium text-neutral-300">{s.title}:</span>
                <span className="text-neutral-400 truncate max-w-xs">{s.plain_summary}</span>
                {idx < statutes.length - 1 && <span className="text-neutral-600 ml-2">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono mb-6">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Zero-Leak Local Masking Engine</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">Bengaluru Urban Jurisdiction</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
          Your Rights as a Bengaluru Tenant,{' '}
          <span className="bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-600 bg-clip-text text-transparent">
            Mathematically Defended.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed mb-10 max-w-2xl mx-auto">
          Deterministic legal aid grounded in the Karnataka Rent Act & Model Tenancy framework.
          Evaluate deposits, challenge unlawful rent hikes, and generate binding Demand Notices with zero cloud PII leakage.
        </p>

        {/* Primary Magnetic CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            id="evaluate-lease-btn"
            onClick={onStartEvaluation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2.5 shadow-subtle-glow hover:bg-neutral-100 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Evaluate Your Lease</span>
            <ArrowRight className="w-4 h-4 text-neutral-700" />
          </motion.button>

          <button
            id="emergency-triage-btn"
            onClick={onOpenEmergency}
            className="w-full sm:w-auto px-6 py-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-rose-400" />
            <span>Emergency Triage (Power / Water Cut)</span>
          </button>
        </div>
      </motion.div>

      {/* Technical Brutalism Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 pt-10 border-t border-neutral-800/80">
        <div className="p-5 rounded-2xl bg-[#121212]/80 border border-neutral-800/80 backdrop-blur-xl">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 font-mono text-xs font-bold">
            01
          </div>
          <h3 className="text-sm font-semibold text-white mb-1.5">Presidio-Shielded Intake</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Names, phones, and addresses are replaced with stable typed placeholders locally before model dispatch.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#121212]/80 border border-neutral-800/80 backdrop-blur-xl">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 font-mono text-xs font-bold">
            02
          </div>
          <h3 className="text-sm font-semibold text-white mb-1.5">Strict Python Arithmetic</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Deposit ratios, notice-gap days, and statutory caps are calculated in code—never hallucinated by generative models.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#121212]/80 border border-neutral-800/80 backdrop-blur-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 font-mono text-xs font-bold">
            03
          </div>
          <h3 className="text-sm font-semibold text-white mb-1.5">ReportLab Notice Generator</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Real names are re-inserted only at render time. Produces an advocate-ready legal notice citing Karnataka statutes.
          </p>
        </div>
      </div>
    </div>
  );
};
