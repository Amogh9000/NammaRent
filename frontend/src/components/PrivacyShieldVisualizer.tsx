'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, AlertTriangle, Check, RefreshCw, Key } from 'lucide-react';
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
  const [autoMask, setAutoMask] = useState(true);

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
    <div className="w-full rounded-2xl border border-neutral-800 bg-[#121212]/90 backdrop-blur-xl p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Privacy Shield Visualizer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live /api/mask
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Deterministic Presidio tokenization running locally before model invocation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {maskData && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800">
              <Key className="w-3 h-3 text-emerald-400" />
              <span>{maskData.anonymized_count} PII Tokens Locked</span>
            </div>
          )}
          <button
            onClick={() => performRealMasking(inputText)}
            disabled={isMasking}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Refresh masking"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMasking ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {/* Left: Raw Text with Sensitive PII */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
            <span className="flex items-center gap-1.5 text-rose-400">
              <Eye className="w-3 h-3" /> Raw Input (Held in Local Memory Vault)
            </span>
            <span className="text-[10px] text-neutral-500">Never transmitted raw</span>
          </div>
          <div className="relative">
            <textarea
              id="privacy-shield-raw-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={5}
              placeholder="Enter text containing names, phones, addresses..."
              className="w-full text-xs font-mono rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 p-3.5 focus:outline-none focus:border-neutral-600 transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() =>
                setInputText(
                  'Tenant Priya Nair (Phone: 9845099888, Aadhaar: 5412 8899 1234) disputes landlord Vinod Kumar deducting ₹45,000 at Indiranagar 100ft Rd, Bengaluru 560038.'
                )
              }
              className="text-[11px] font-mono text-neutral-400 hover:text-emerald-400 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded hover:border-neutral-700 transition-colors"
            >
              Preset: Aadhaar & Phone
            </button>
            <button
              onClick={() =>
                setInputText(
                  'Landlord M. Gopal threatens to cut off power supply at Flat 101, 4th Cross, Koramangala 5th Block, Bengaluru 560095 if rent hike to ₹50,000 is not accepted.'
                )
              }
              className="text-[11px] font-mono text-neutral-400 hover:text-emerald-400 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded hover:border-neutral-700 transition-colors"
            >
              Preset: Harassment / Address
            </button>
          </div>
        </div>

        {/* Right: What the AI Actually Sees */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Lock className="w-3 h-3" /> Outgoing Masked Payload (Model View)
            </span>
            <span className="text-[10px] text-emerald-500/80">Guard: Re-scan active</span>
          </div>

          <div className="relative h-[115px] overflow-y-auto rounded-xl bg-neutral-950 border border-emerald-500/20 p-3.5 text-xs font-mono text-emerald-300/90 leading-relaxed">
            {isMasking ? (
              <div className="flex items-center gap-2 text-neutral-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Tokenizing via Presidio...</span>
              </div>
            ) : maskData ? (
              <div className="whitespace-pre-wrap break-words">
                {maskData.masked_text}
              </div>
            ) : (
              <span className="text-neutral-600">Enter text to see live token replacement...</span>
            )}
          </div>

          {/* Tokens Tag Bar */}
          {maskData && Object.keys(maskData.placeholders_detected).length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-neutral-500 uppercase font-mono">Protected:</span>
              {Object.entries(maskData.placeholders_detected).map(([placeholder, type]) => (
                <span
                  key={placeholder}
                  className="inline-flex items-center gap-1 text-[10px] font-mono bg-neutral-900 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full"
                >
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  {placeholder}
                  <span className="text-neutral-500 text-[8px]">({type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
