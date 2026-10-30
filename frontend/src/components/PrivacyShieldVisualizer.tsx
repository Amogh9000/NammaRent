'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, RefreshCw, Key } from 'lucide-react';
import { MaskResponse } from '@/types/api';

interface PrivacyShieldVisualizerProps {
  sessionId: string;
  tenantName?: string;
  landlordName?: string;
  propertyAddress?: string;
  pinCode?: string;
}

export const PrivacyShieldVisualizer: React.FC<PrivacyShieldVisualizerProps> = ({
  sessionId,
  tenantName = '',
  landlordName = '',
  propertyAddress = '',
  pinCode = '',
}) => {
  const [inputText, setInputText] = useState(
    'Tenant Aarav Sharma paid ₹1,20,000 security deposit for Flat 402, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru - 560038. Contact landlord Suresh Reddy at 9845012345 or suresh@bengalururentals.com regarding the 15-09-2024 handover.'
  );
  const [maskData, setMaskData] = useState<MaskResponse | null>(null);
  const [isMasking, setIsMasking] = useState(false);

  const performRealMasking = async (textToMask: string) => {
    if (!textToMask.trim()) {
      setMaskData(null);
      return;
    }
    setIsMasking(true);
    try {
      const res = await fetch('/api/mask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          text: textToMask,
          tenant_name: tenantName || 'Aarav Sharma',
          landlord_name: landlordName || 'Suresh Reddy',
          property_address: propertyAddress || 'Flat 402, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru',
          pin_code: pinCode || '560038',
        }),
      });
      if (res.ok) {
        const data: MaskResponse = await res.json();
        setMaskData(data);
      }
    } catch (err) {
      console.error('Masking error:', err);
    } finally {
      setIsMasking(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      performRealMasking(inputText);
    }, 350);
    return () => clearTimeout(timer);
  }, [inputText, tenantName, landlordName, propertyAddress, pinCode]);

  return (
    <div className="w-full rounded-3xl border border-slate-200/60 bg-white p-7 sm:p-8 shadow-soft-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] font-heading flex items-center gap-2">
              Privacy Shield Visualizer
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live /api/mask
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic Presidio tokenization running locally before model invocation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {maskData && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-[#F4F6FB] px-3 py-1 rounded-full border border-slate-200">
              <Key className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{maskData.anonymized_count} PII Tokens Locked</span>
            </div>
          )}
          <button
            onClick={() => performRealMasking(inputText)}
            disabled={isMasking}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Refresh masking"
          >
            <RefreshCw className={`w-4 h-4 ${isMasking ? 'animate-spin text-[#2563EB]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
        {/* Left: Raw Text with Sensitive PII */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5 text-rose-600">
              <Eye className="w-3.5 h-3.5" /> Raw Input (Held in Local Memory Vault)
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Never transmitted raw</span>
          </div>
          <div className="relative">
            <textarea
              id="privacy-shield-raw-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={5}
              placeholder="Enter text containing names, phones, addresses..."
              className="w-full text-xs font-mono rounded-2xl bg-[#F4F6FB] border border-slate-200 text-[#0F172A] p-4 focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-xs"
            />
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() =>
                setInputText(
                  'Tenant Priya Nair (Phone: 9845099888, Aadhaar: 5412 8899 1234) disputes landlord Vinod Kumar deducting ₹45,000 at Indiranagar 100ft Rd, Bengaluru 560038.'
                )
              }
              className="text-[11px] font-medium text-slate-600 hover:text-[#2563EB] bg-[#F4F6FB] border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              Preset: Aadhaar & Phone
            </button>
            <button
              onClick={() =>
                setInputText(
                  'Landlord M. Gopal threatens to cut off power supply at Flat 101, 4th Cross, Koramangala 5th Block, Bengaluru 560095 if rent hike to ₹50,000 is not accepted.'
                )
              }
              className="text-[11px] font-medium text-slate-600 hover:text-[#2563EB] bg-[#F4F6FB] border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              Preset: Harassment / Address
            </button>
          </div>
        </div>

        {/* Right: What the AI Actually Sees */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Outgoing Masked Payload (Model View)
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Guard: Re-scan active</span>
          </div>

          <div className="relative h-[115px] overflow-y-auto rounded-2xl bg-[#0F172A] border border-slate-800 p-4 text-xs font-mono text-sky-300 leading-relaxed shadow-inner">
            {isMasking ? (
              <div className="flex items-center gap-2 text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Tokenizing via Presidio...</span>
              </div>
            ) : maskData ? (
              <div className="whitespace-pre-wrap break-words">
                {maskData.masked_text}
              </div>
            ) : (
              <span className="text-slate-500">Enter text to see live token replacement...</span>
            )}
          </div>

          {/* Tokens Tag Bar */}
          {maskData && Object.keys(maskData.placeholders_detected).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Protected:</span>
              {Object.entries(maskData.placeholders_detected).map(([placeholder, type]) => (
                <span
                  key={placeholder}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-[#EFF6FF] border border-blue-200 text-[#2563EB] px-2.5 py-0.5 rounded-full font-medium"
                >
                  <Lock className="w-2.5 h-2.5 text-[#2563EB]" />
                  {placeholder}
                  <span className="text-slate-400 text-[9px]">({type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
