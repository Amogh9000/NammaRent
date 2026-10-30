'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  PhoneCall,
  FileText,
  Menu,
  X,
  ArrowRight,
  Trash2,
} from 'lucide-react';

import { CommandCenter } from '@/components/CommandCenter';
import { DiagnosticWizard, UserFormData } from '@/components/DiagnosticWizard';
import { LegalDocumentPreviewer } from '@/components/LegalDocumentPreviewer';
import { EmergencyDrawer } from '@/components/EmergencyDrawer';
import { ConsentModal } from '@/components/ConsentModal';
import { WhatAiSawPanel } from '@/components/WhatAiSawPanel';
import { LegalAnalysis } from '@/types/api';

export default function Home() {
  const [sessionId, setSessionId] = useState('');
  const [viewMode, setViewMode] = useState<'command' | 'wizard'>('command');
  const [activeTab, setActiveTab] = useState<'wizard' | 'audit'>('wizard');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [emergencyPin, setEmergencyPin] = useState('560038');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [latestAnalysis, setLatestAnalysis] = useState<LegalAnalysis | null>(null);
  const [latestFormData, setLatestFormData] = useState<UserFormData | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let sid = sessionStorage.getItem('namma_session_id');
    if (!sid) {
      sid = 'session-' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('namma_session_id', sid);
    }
    setSessionId(sid);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNoticeReady = (url: string, analysis: LegalAnalysis, userData: UserFormData) => {
    setPdfUrl(url);
    setLatestAnalysis(analysis);
    setLatestFormData(userData);
    setIsPreviewOpen(true);
  };

  const handleTriggerEmergency = (pin: string) => {
    setEmergencyPin(pin || '560038');
    setIsEmergencyOpen(true);
  };

  const handleClearSession = async () => {
    try {
      await fetch('/api/vault/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (e) {
      console.error('Vault wipe error:', e);
    }
    sessionStorage.removeItem('namma_session_id');
    const newSid = 'session-' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('namma_session_id', newSid);
    setSessionId(newSid);
    setLatestAnalysis(null);
    setLatestFormData(null);
    setPdfUrl('');
  };

  const scrollToFaq = () => {
    if (viewMode !== 'command') {
      setViewMode('command');
    }
    setTimeout(() => {
      const el = document.getElementById('faq-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <main className="min-h-screen bg-[#F4F6FB] text-[#475569] flex flex-col justify-between selection:bg-[#DBEAFE] selection:text-[#1D4ED8]">
      {/* First-Run Privacy Consent */}
      <ConsentModal onConsentAccepted={() => {}} />

      {/* 1. Nav: Logo left, 3 plain text links center, navy pill button right */}
      <nav
        aria-label="Main Navigation"
        className={`z-50 transition-all duration-300 ${
          isScrolled
            ? 'fixed top-3 left-1/2 -translate-x-1/2 max-w-4xl w-[92%] sm:w-auto bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-full px-5 py-2.5 shadow-nav-pill'
            : 'w-full max-w-6xl mx-auto px-4 sm:px-8 py-5'
        }`}
      >
        <div className="flex items-center justify-between gap-6">
          {/* Logo Left */}
          <div
            onClick={() => setViewMode('command')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white group-hover:bg-[#2563EB] transition-colors">
              <Scale className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#0F172A] font-heading">
              Namma Tenant
            </span>
          </div>

          {/* 3 Plain Text Links Center (Desktop) */}
          <div className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#0F172A]">
            <span
              onClick={() => {
                if (viewMode !== 'command') setViewMode('command');
                window.scrollTo({ top: 500, behavior: 'smooth' });
              }}
              className="hover:text-[#2563EB] cursor-pointer transition-colors"
            >
              Statutory Rules
            </span>
            <span
              onClick={() => {
                if (viewMode !== 'command') setViewMode('command');
                window.scrollTo({ top: 1100, behavior: 'smooth' });
              }}
              className="hover:text-[#2563EB] cursor-pointer transition-colors"
            >
              How It Works
            </span>
            <span
              onClick={scrollToFaq}
              className="hover:text-[#2563EB] cursor-pointer transition-colors"
            >
              FAQ
            </span>
          </div>

          {/* Right Actions: Emergency 112 link + Navy Pill Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEmergencyOpen(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors hidden sm:inline-flex items-center gap-1 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>112 Triage</span>
            </button>

            <button
              id="nav-evaluate-pill-btn"
              onClick={() => setViewMode('wizard')}
              className="px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white text-xs font-semibold tracking-wide transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              Evaluate Lease
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 text-[#0F172A] md:hidden"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3 text-xs font-semibold text-[#0F172A] pb-2">
            <span
              onClick={() => {
                setViewMode('command');
                setMobileMenuOpen(false);
              }}
              className="hover:text-[#2563EB] cursor-pointer"
            >
              Home
            </span>
            <span
              onClick={() => {
                setViewMode('command');
                setMobileMenuOpen(false);
                scrollToFaq();
              }}
              className="hover:text-[#2563EB] cursor-pointer"
            >
              FAQs
            </span>
            <span
              onClick={() => {
                setIsEmergencyOpen(true);
                setMobileMenuOpen(false);
              }}
              className="text-rose-600 cursor-pointer"
            >
              Emergency 112 Triage
            </span>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 w-full">
        {viewMode === 'command' ? (
          <CommandCenter
            onStartEvaluation={() => setViewMode('wizard')}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
          />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Wizard Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('command')}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors"
                >
                  ← Back to Overview
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1" />
                <button
                  onClick={() => setActiveTab('wizard')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === 'wizard'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                  }`}
                >
                  Diagnostic Wizard
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTab === 'audit'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                  }`}
                >
                  What the AI Saw
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearSession}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Purge session cache and server memory"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear My Data</span>
                </button>

                {pdfUrl && (
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="px-4 py-1.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-blue-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Notice Document</span>
                  </button>
                )}
              </div>
            </div>

            {activeTab === 'wizard' && (
              <DiagnosticWizard
                sessionId={sessionId}
                onNoticeReady={handleNoticeReady}
                onTriggerEmergency={handleTriggerEmergency}
                onAnalysisComplete={(analysis) => setLatestAnalysis(analysis)}
              />
            )}

            {activeTab === 'audit' && (
              <WhatAiSawPanel
                sessionId={sessionId}
                analysis={latestAnalysis}
                arithmetic={latestAnalysis?.arithmetic}
                onClearData={handleClearSession}
              />
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
        userData={latestFormData}
      />
    </main>
  );
}
