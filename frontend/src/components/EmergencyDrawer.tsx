'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PhoneCall, ShieldAlert, AlertTriangle, Building, MapPin, Zap, Droplets, Shield } from 'lucide-react';
import { EmergencyInfo } from '@/types/api';

interface EmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPin?: string;
}

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({
  isOpen,
  onClose,
  initialPin = '560038',
}) => {
  const [pinCode, setPinCode] = useState(initialPin);
  const [emergencyData, setEmergencyData] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmergencyContacts = async (pin: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin_code: pin,
          distress_keyword: 'utility cut-off / lock-out',
        }),
      });
      if (res.ok) {
        const data: EmergencyInfo = await res.json();
        setEmergencyData(data);
      }
    } catch (err) {
      console.error('Emergency lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmergencyContacts(pinCode);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-md h-full bg-[#121212] border-l border-neutral-800 shadow-2xl flex flex-col justify-between p-6 overflow-y-auto"
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                <h2 className="text-base font-bold text-white tracking-tight">Emergency Distress Triage</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Statutory Protection Banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                Section 27 Karnataka Rent Act, 1999
              </span>
              <p className="leading-relaxed text-rose-200/90 text-[11px]">
                Landlords are strictly prohibited from cutting off water, electricity, or locking tenants out. Doing so is an
                unlawful offence warranting immediate police intervention and Rent Controller injunction.
              </p>
            </div>

            {/* PIN Code Lookup */}
            <div className="mt-5">
              <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                Bengaluru Jurisdiction PIN Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="560038"
                  maxLength={6}
                  className="flex-1 text-xs font-mono rounded-xl bg-neutral-950 border border-neutral-800 p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={() => fetchEmergencyContacts(pinCode)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-semibold text-xs transition-colors"
                >
                  {loading ? 'Locating...' : 'Lookup'}
                </button>
              </div>
            </div>

            {/* Authority Details */}
            {emergencyData && (
              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{emergencyData.authority_name}</span>
                  </div>
                  <div className="flex items-start gap-2 text-neutral-400 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                    <span>{emergencyData.office_address}</span>
                  </div>
                  {emergencyData.phone ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs pt-1">
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{emergencyData.phone}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-1 rounded">
                      ⚠️ Phone pending verified gazette update. Dial 112 below for immediate officer dispatch.
                    </div>
                  )}
                </div>

                {/* Direct Emergency Hotlines */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">
                    Emergency Hotlines (24x7 Bengaluru)
                  </span>

                  <a
                    href="tel:112"
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">Karnataka Police Emergency</span>
                        <span className="text-[10px] text-neutral-400">Immediate dispatch for threats / lockout</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400">112</span>
                  </a>

                  <a
                    href="tel:1912"
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">BESCOM Electricity Helpline</span>
                        <span className="text-[10px] text-neutral-400">Report illegal power meter disconnection</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">1912</span>
                  </a>

                  <a
                    href="tel:1916"
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">BWSSB Water Board Helpline</span>
                        <span className="text-[10px] text-neutral-400">Report unlawful water valve tampering</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-400">1916</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer Guidance */}
          <div className="pt-4 border-t border-neutral-800">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              If facing physical intimidation, lock-outs, or severed utilities, prioritize personal safety and contact 112
              immediately.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
