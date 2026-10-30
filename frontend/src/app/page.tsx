'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Trash2,
  Lock,
  PhoneCall,
  Scale,
  Sparkles,
  RefreshCw,
  CheckCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

import { CommandCenter } from '@/components/CommandCenter';
import { DiagnosticWizard } from '@/components/DiagnosticWizard';
import { PrivacyShieldVisualizer } from '@/components/PrivacyShieldVisualizer';
import { LegalDocumentPreviewer } from '@/components/LegalDocumentPreviewer';
import { EmergencyDrawer } from '@/components/EmergencyDrawer';
import { ConsentModal } from '@/components/ConsentModal';
import { WhatAiSawPanel } from '@/components/WhatAiSawPanel';
import { LegalAnalysis, KBChunk } from '@/types/api';

export default function Home() {
  const [sessionId, setSessionId] = useState('');
  const [viewMode, setViewMode] = useState<'command' | 'wizard'>('command');
  const [activeTab, setActiveTab] = useState<'wizard' | 'privacy' | 'audit'>('wizard');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [emergencyPin, setEmergencyPin] = useState('560038');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [latestAnalysis, setLatestAnalysis] = useState<LegalAnalysis | null>(null);
  const [clearToast, setClearToast] = useState(false);

  useEffect(() => {
    // Generate or retrieve session ID
    let sid = sessionStorage.getItem('namma_session_id');
    if (!sid) {
      sid = 'session-' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('namma_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  const handleClearData = async () => {
    if (!sessionId) return;
    try {
      await fetch('/api/vault/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      // Generate fresh session
      const newSid = 'session-' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('namma_session_id', newSid);
      setSessionId(newSid);
      setLatestAnalysis(null);
      setPdfUrl('');
      setViewMode('command');
      setClearToast(true);
      setTimeout(() => setClearToast(false), 3000);
    } catch (err) {
      console.error('Clear error:', err);
    }
  };

  const handleNoticeReady = (url: string, analysis: LegalAnalysis) => {
    setPdfUrl(url);
    setLatestAnalysis(analysis);
    setIsPreviewOpen(true);
  };

  const handleTriggerEmergency = (pin: string) => {
    setEmergencyPin(pin || '560038');
    setIsEmergencyOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F7] flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* First-Run Privacy Consent */}
      <ConsentModal onConsentAccepted={() => { }} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-[#0A0A0A]/80 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div
            onClick={() => setViewMode('command')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-px flex items-center justify-center">
              <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center">
                <Scale className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Namma Tenant Navigator
              </span>
              <span className="text-[10px] font-mono text-neutral-400 block -mt-0.5">
                Karnataka Housing Law & Rights
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="emergency-header-btn"
              onClick={() => setIsEmergencyOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <PhoneCall className="w-3 h-3 text-rose-400" />
              <span className="hidden sm:inline">Emergency 112</span>
            </button>

            <button
              id="clear-data-btn"
              onClick={handleClearData}
              title="Wipe all in-memory vault tokens and files"
              className="px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-rose-500/40 bg-neutral-900/80 text-neutral-400 hover:text-rose-400 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear My Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Toast for Clear Data */}
        <AnimatePresence>
          {clearToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-16 right-6 z-50 p-3 rounded-xl bg-emerald-500 text-black font-semibold text-xs flex items-center gap-2 shadow-2xl"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Vault Cleared. Session data erased permanently.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'command' ? (
          <div className="space-y-12">
            <CommandCenter
              onStartEvaluation={() => setViewMode('wizard')}
              onOpenEmergency={() => setIsEmergencyOpen(true)}
            />

            {/* Embedded Live Privacy Shield Demo */}
            <div className="max-w-5xl mx-auto">
              <div className="mb-3 px-1 flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                  Live Local Shield Demo
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">Real /api/mask Endpoint</span>
              </div>
              <PrivacyShieldVisualizer
                sessionId={sessionId}
                tenantName="Aarav Sharma"
                landlordName="Suresh Reddy"
                propertyAddress="12th Main, HAL 2nd Stage, Indiranagar, Bengaluru"
                pinCode="560038"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Wizard Navigation Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 max-w-2xl mx-auto pb-4 border-b border-neutral-800/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('wizard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${activeTab === 'wizard'
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                    }`}
                >
                  Diagnostic Wizard
                </button>
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${activeTab === 'privacy'
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                    }`}
                >
                  Privacy Shield Visualizer
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${activeTab === 'audit'
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                    }`}
                >
                  What the AI Saw
                </button>
              </div>

              {pdfUrl && (
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Generated Notice</span>
                </button>
              )}
            </div>

            {/* Active Sub-Tab View */}
            {activeTab === 'wizard' && (
              <DiagnosticWizard
                sessionId={sessionId}
                onNoticeReady={handleNoticeReady}
                onTriggerEmergency={handleTriggerEmergency}
              />
            )}

            {activeTab === 'privacy' && (
              <div className="max-w-3xl mx-auto">
                <PrivacyShieldVisualizer sessionId={sessionId} />
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="max-w-2xl mx-auto">
                <WhatAiSawPanel
                  sessionId={sessionId}
                  analysis={latestAnalysis}
                  arithmetic={latestAnalysis?.arithmetic}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Emergency Drawer (Distress Triage) */}
      <EmergencyDrawer
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        initialPin={emergencyPin}
      />

      {/* Legal Demand Notice Preview Modal */}
      <LegalDocumentPreviewer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={pdfUrl}
        sessionId={sessionId}
        analysis={latestAnalysis}
      />

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 bg-[#0A0A0A] px-4 py-6 mt-16 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Namma Tenant Navigator © Bengaluru Urban Legal Aid</span>
          <span className="text-neutral-600">
            Grounded in Karnataka Rent Act, 1999 & Transfer of Property Act, 1882. Not legal advice.
          </span>
        </div>
      </footer>
    </main>
  );
}
