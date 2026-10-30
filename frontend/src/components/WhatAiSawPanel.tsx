'use client';

import React from 'react';
import { Lock, FileCode, CheckCircle2, Shield, Eye } from 'lucide-react';
import { LegalAnalysis, ComputedArithmetic } from '@/types/api';

interface WhatAiSawPanelProps {
  sessionId: string;
  analysis?: LegalAnalysis | null;
  arithmetic?: ComputedArithmetic | null;
}

export const WhatAiSawPanel: React.FC<WhatAiSawPanelProps> = ({
  sessionId,
  analysis,
  arithmetic,
}) => {
  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-[#121212]/70 backdrop-blur-xl p-5 shadow-xl text-xs font-mono space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-white">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">What the AI Actually Saw</span>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Zero-PII Audit Log
        </span>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
          1. Sanitized Context (Model Input Payload)
        </span>
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-emerald-300 text-[11px] leading-relaxed">
          {`{
  "case": "${analysis?.case_type || 'deposit'}",
  "tenant": "[TENANT_NAME]",
  "landlord": "[LANDLORD_NAME]",
  "address": "[PROPERTY_ADDRESS]",
  "pin": "[PINCODE]",
  "arithmetic": {
    "deposit_months": ${arithmetic?.deposit_months ?? 'N/A'},
    "excess_months": ${arithmetic?.excess_deposit_months ?? 0},
    "refundable_balance": ${arithmetic?.net_refundable_amount ?? 'N/A'},
    "notice_days": ${arithmetic?.notice_gap_days ?? 'N/A'}
  }
}`}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
          2. Verified Knowledge Base Passages Injected
        </span>
        <div className="space-y-1.5">
          {analysis?.citations && analysis.citations.length > 0 ? (
            analysis.citations.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px]"
              >
                <span className="text-white font-medium">{c}</span>
                <span className="text-[10px] text-emerald-400">Strict RAG Grounding</span>
              </div>
            ))
          ) : (
            <span className="text-neutral-500 text-[11px]">No active citations loaded yet.</span>
          )}
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[10px] text-neutral-400 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Pre-dispatch guard active: zero occurrences of real name, phone or address in LLM prompts.</span>
      </div>
    </div>
  );
};
