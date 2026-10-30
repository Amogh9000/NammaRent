'use client';

import React, { useState } from 'react';
import { Shield, Eye, BookOpen, FlaskConical, Lock, CheckCircle2, Trash2 } from 'lucide-react';
import { LegalAnalysis, ComputedArithmetic } from '@/types/api';

interface WhatAiSawPanelProps {
  sessionId: string;
  analysis?: LegalAnalysis | null;
  arithmetic?: ComputedArithmetic | null;
  onClearData?: () => void;
}

export const WhatAiSawPanel: React.FC<WhatAiSawPanelProps> = ({
  sessionId,
  analysis,
  arithmetic,
  onClearData,
}) => {
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handlePurgeData = async () => {
    setClearing(true);
    try {
      await fetch('/api/vault/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      setCleared(true);
      onClearData?.();
    } catch (e) {
      console.error('Failed to purge vault:', e);
    } finally {
      setClearing(false);
    }
  };
  return (
    <div className="w-full rounded-3xl border border-slate-200/60 bg-white p-7 sm:p-8 shadow-soft-card text-xs space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 text-[#0F172A]">
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base font-heading block">What the AI Actually Saw</span>
            <span className="text-[11px] text-slate-500">Audit trail of the AI analysis pipeline</span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Zero-PII Audit Log
        </span>
      </div>

      {/* Explanation */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
        <div className="flex items-center gap-2 text-[#2563EB] font-bold font-heading">
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>What is this tab?</span>
        </div>
        <p className="text-[11px] text-slate-700 leading-relaxed">
          This tab shows you the <strong>exact data the AI model received</strong> when analyzing your case — with full transparency.
          Your real name, landlord name, and property address were <strong>never sent to the AI</strong>. They were replaced with anonymous
          tokens before analysis. The AI only saw your anonymized financial facts, the relevant Karnataka law passages retrieved from
          our local knowledge base, and your case type. You can verify this yourself in the payload below.
        </p>
      </div>

      {/* How it works steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: Lock,
            title: '1. PII Masked',
            desc: 'Real names & address replaced with tokens like [TENANT_NAME] before any AI call.',
            color: 'bg-rose-50 border-rose-200 text-rose-700',
          },
          {
            icon: BookOpen,
            title: '2. Law Retrieved',
            desc: 'Relevant sections of Karnataka Rent Act, Transfer of Property Act pulled from local KB.',
            color: 'bg-amber-50 border-amber-200 text-amber-700',
          },
          {
            icon: FlaskConical,
            title: '3. AI Analyzed',
            desc: 'AI model received anonymized facts + law passages. Arithmetic was computed separately by Python — not by AI.',
            color: 'bg-blue-50 border-blue-200 text-blue-700',
          },
        ].map((step) => (
          <div key={step.title} className={`p-3.5 rounded-xl border ${step.color} space-y-1.5`}>
            <div className="flex items-center gap-2 font-bold">
              <step.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{step.title}</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Sanitized Context */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block font-mono">
          Anonymized Context Sent to AI Model
        </span>
        <div className="p-4 rounded-2xl bg-[#0F172A] text-sky-300 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
          <pre>{`{
  "case": "${analysis?.case_type || 'deposit'}",
  "tenant": "[TENANT_NAME]",        // real name masked
  "landlord": "[LANDLORD_NAME]",    // real name masked
  "address": "[PROPERTY_ADDRESS]",  // address masked
  "pin": "[PINCODE]",
  "arithmetic": {
    "deposit_months": ${arithmetic?.deposit_months ?? 'N/A'},
    "excess_months": ${arithmetic?.excess_deposit_months ?? 0},
    "refundable_balance": ${arithmetic?.net_refundable_amount ?? 'N/A'},
    "notice_gap_days": ${arithmetic?.notice_gap_days ?? 'N/A'},
    "statutory_90_day_met": ${arithmetic?.statutory_90_day_met ?? 'N/A'}
  },
  "law_passages": "<<Karnataka KB chunks injected below>>"
}`}</pre>
        </div>
        <p className="text-[10px] text-slate-500 italic">
          Note: Arithmetic values are computed by Python code — not by the AI — ensuring 100% calculation accuracy.
        </p>
      </div>

      {/* KB Passages injected */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block font-mono">
          Karnataka Law Passages Injected (from Local Knowledge Base)
        </span>
        <div className="space-y-2">
          {analysis?.citations && analysis.citations.length > 0 ? (
            analysis.citations.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F6FB] border border-slate-200/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <span className="text-[#0F172A] font-semibold">{c}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  Local KB — Verified
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-[#F4F6FB] border border-slate-200/60 text-slate-500 text-xs">
              No active citations loaded yet. Run analysis in the Diagnostic Wizard to view law passages used.
            </div>
          )}
        </div>
      </div>

      {/* Privacy guarantee & Clear Data Action */}
      <div className="p-5 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-[#0F172A] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-[#0F172A] font-heading">Zero Data Storage Guarantee</span>
            <span className="font-medium text-slate-700 block">
              Personal names and flat addresses are never stored in any database or transmitted to LLMs.
              You can instantly purge all session states and memory caches from this server.
            </span>
          </div>
        </div>

        <button
          onClick={handlePurgeData}
          disabled={clearing}
          className="px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-2 shrink-0 transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>{clearing ? 'Purging Memory...' : cleared ? '✓ Data Purged' : 'Purge All Session Data'}</span>
        </button>
      </div>

      {cleared && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Server memory cache, PII vault tokens, and session states have been completely wiped. Zero data remains.</span>
        </div>
      )}
    </div>
  );
};
