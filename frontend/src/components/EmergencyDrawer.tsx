'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  Building,
  MapPin,
  Zap,
  Droplets,
  Shield,
  Landmark,
  Scale,
  CheckCircle2,
  PhoneForwarded,
} from 'lucide-react';
import { EmergencyInfo } from '@/types/api';

interface EmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPin?: string;
}

const QUICK_PINS = [
  { pin: '560038', label: 'Indiranagar' },
  { pin: '560019', label: 'Basavanagudi' },
  { pin: '560066', label: 'Whitefield' },
  { pin: '560102', label: 'HSR Layout' },
  { pin: '560036', label: 'KR Puram' },
  { pin: '560064', label: 'Yelahanka' },
  { pin: '560100', label: 'Electronic City' },
  { pin: '560001', label: 'MG Road' },
];

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({
  isOpen,
  onClose,
  initialPin = '560038',
}) => {
  const [pinCode, setPinCode] = useState(initialPin);
  const [emergencyData, setEmergencyData] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmergencyContacts = async (pin: string) => {
    const trimmed = pin.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin_code: trimmed,
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

  const handleQuickPinSelect = (quickPin: string) => {
    setPinCode(quickPin);
    fetchEmergencyContacts(quickPin);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchEmergencyContacts(pinCode);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-lg h-full bg-[#FFFFFF] border-l border-slate-200 shadow-2xl flex flex-col justify-between p-6 sm:p-7 overflow-y-auto"
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] font-heading tracking-tight">
                    Emergency Distress Triage
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-500">
                      Bengaluru Urban & Rural Verified Directory
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close emergency triage"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statutory Protection Banner */}
            <div className="mt-4 p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-700 font-heading">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Section 27 Karnataka Rent Act, 1999</span>
              </div>
              <p className="leading-relaxed text-rose-800 text-[11px]">
                Landlords are strictly prohibited from severing water, electricity, or locking tenants out.
                Doing so is an unlawful criminal offence punishable under law. Contact jurisdictional authorities below.
              </p>
            </div>

            {/* PIN Code Lookup */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#0F172A] font-heading uppercase tracking-wider">
                  Jurisdiction PIN Code
                </label>
                <span className="text-[11px] text-slate-500">Enter any 6-digit postal code</span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. 560038 or 560019"
                    maxLength={6}
                    className="w-full text-sm font-semibold rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-blue-500/10 transition-colors"
                  />
                </div>
                <button
                  onClick={() => fetchEmergencyContacts(pinCode)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors disabled:opacity-75 shadow-xs shrink-0 flex items-center gap-1.5"
                >
                  {loading ? 'Locating...' : 'Lookup Office'}
                </button>
              </div>

              {/* Quick Area Filter Pills */}
              <div className="mt-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Popular Hubs:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PINS.map((item) => (
                    <button
                      key={item.pin}
                      onClick={() => handleQuickPinSelect(item.pin)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                        pinCode === item.pin
                          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.label} ({item.pin})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Authority Details Card */}
            {emergencyData && (
              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200/90 space-y-3">
                  {/* Division & Locality Pill */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {emergencyData.division && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200/60 px-2 py-0.5 rounded-md">
                        {emergencyData.division}
                      </span>
                    )}
                    {emergencyData.locality && (
                      <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        📍 {emergencyData.locality}
                      </span>
                    )}
                  </div>

                  {/* Authority Title */}
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB] shrink-0 mt-0.5">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#0F172A] font-heading leading-tight flex items-center gap-1.5">
                        <span>{emergencyData.authority_name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </h3>
                      {emergencyData.court_jurisdiction && (
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{emergencyData.court_jurisdiction}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 text-slate-600 text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/70">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{emergencyData.office_address}</span>
                  </div>

                  {/* Call Actions */}
                  <div className="pt-1 flex flex-wrap gap-2">
                    {emergencyData.phone && (
                      <a
                        href={`tel:${emergencyData.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-3.5 py-2 rounded-lg transition-colors shadow-xs"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Call Office: {emergencyData.phone}</span>
                      </a>
                    )}
                    {emergencyData.alt_phone && (
                      <a
                        href={`tel:${emergencyData.alt_phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg transition-colors"
                      >
                        <PhoneForwarded className="w-3 h-3 text-slate-400" />
                        <span>Alt: {emergencyData.alt_phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Legal Guidance Note */}
                  {emergencyData.guidance && (
                    <div className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-200/60">
                      <span className="font-semibold text-slate-700">Relief Guidance: </span>
                      {emergencyData.guidance}
                    </div>
                  )}
                </div>

                {/* Direct Emergency Hotlines */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                      Universal 24x7 Bengaluru Hotlines
                    </span>
                    <span className="text-[10px] text-slate-600">Toll-free / Direct Dial</span>
                  </div>

                  <a
                    href="tel:112"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] block font-heading">
                          Karnataka Police Emergency (112)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Immediate dispatch for unlawful lock-out, threats & assault
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                      112
                    </span>
                  </a>

                  <a
                    href="tel:1912"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] block font-heading">
                          BESCOM Electricity Helpline (1912)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Report illegal landlord power cutoff & meter disconnection
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      1912
                    </span>
                  </a>

                  <a
                    href="tel:1916"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] block font-heading">
                          BWSSB Water Board Helpline (1916)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Report illegal main valve closure & water cutoff
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] border border-blue-200 px-2.5 py-1 rounded-lg">
                      1916
                    </span>
                  </a>

                  <a
                    href="tel:15100"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] block font-heading">
                          NALSA National Legal Aid Helpline (15100)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          24x7 toll-free free legal counsel and tenant aid
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                      15100
                    </span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer Guidance */}
          <div className="pt-4 border-t border-slate-200 mt-6">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If facing physical intimidation, lock-outs, or severed utilities, prioritize personal safety and contact
              112 immediately. Under Karnataka law, landlords cannot take the law into their own hands.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
