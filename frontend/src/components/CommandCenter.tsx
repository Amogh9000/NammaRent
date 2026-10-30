'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Paperclip,
  Info,
  Mic,
  Send,
  Plus,
  Scale,
  Shield,
  FileCheck,
  CheckCircle2,
  ChevronDown,
  Building,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { KBChunk } from '@/types/api';

interface CommandCenterProps {
  onStartEvaluation: (text?: string) => void;
  onOpenEmergency: () => void;
  onSelectStatute?: (chunk: KBChunk) => void;
}

const EXAMPLE_SITUATIONS = [
  'Landlord is withholding ₹55,000 from my security deposit for painting without itemised GST invoices...',
  'Received a WhatsApp message demanding a 25% rent increase starting next month without 90 days notice...',
  'Owner is refusing to refund my ₹2,10,000 deposit after vacating flat in Indiranagar on 30 September...',
];

const STATUTORY_SOURCES = [
  'Karnataka Rent Act, 1999',
  'Transfer of Property Act, 1882 (Section 108)',
  'Model Tenancy Act Framework',
  'Karnataka Tenancy Practice Rules',
  'Indian Contract Act, 1872 (Section 73)',
  'Bengaluru Urban Rent Authority',
  'Section 27 Utility Protection Doctrine',
];

const STEPS_DATA = [
  {
    num: '01',
    title: 'Describe Your Tenancy Dispute',
    desc: 'Input your rental disagreement, withheld deposit sum, or notice timeline in plain everyday English.',
  },
  {
    num: '02',
    title: 'Zero-Leak Client Masking',
    desc: 'Local Presidio tokenization substitutes names, numbers, and addresses with typed mathematical placeholders in memory.',
  },
  {
    num: '03',
    title: 'Statutory Benchmark Grounding',
    desc: 'Your situation is matched against verified Karnataka Rent Act sections, 2-month caps, and wear-and-tear doctrines.',
  },
  {
    num: '04',
    title: 'Deterministic Python Arithmetic',
    desc: 'Deposit ratios, statutory 90-day notice periods, and mandatory refund balances are computed in code—never hallucinated.',
  },
  {
    num: '05',
    title: 'Statutory Violation Audit',
    desc: 'Review grounded contraventions, cited sections, and legal defenses calculated strictly for Bengaluru Urban jurisdiction.',
  },
  {
    num: '06',
    title: 'Advocate-Ready Notice Generation',
    desc: 'Download a formally formatted DOCX or PDF legal demand notice ready for delivery to your landlord or legal counsel.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Can a landlord in Bengaluru deduct painting charges automatically?',
    a: 'No. Under Section 108(m) of the Transfer of Property Act, 1882, a tenant is not liable for normal wear and tear resulting from ordinary habitation. Any deductions require itemised, GST-compliant repair invoices and documented proof of tenant-caused structural damage.',
  },
  {
    q: 'What is the statutory limit on security deposits in Karnataka?',
    a: 'Under the Model Tenancy framework and prevailing Karnataka Tenancy Practice rules, residential security deposits are capped at 2 months of monthly rent. Withholding 6 to 10 months advance rent is unlawful and contestable.',
  },
  {
    q: 'How much advance written notice is required before rent increases?',
    a: 'Landlords must serve at least 90 days prior written notice before any revised rent becomes enforceable. Sudden hikes communicated informally via WhatsApp or verbal messages are legally invalid until the statutory notice duration is respected.',
  },
  {
    q: 'What should I do if the landlord disconnects water or electricity?',
    a: 'Section 27 of the Karnataka Rent Act, 1999 strictly criminalizes the severance of essential utilities. Landlords cannot cut power or water to force eviction. You have the right to immediate police intervention via 112 and emergency Rent Controller restoration orders.',
  },
  {
    q: 'How does Namma Tenant Navigator protect my personal privacy?',
    a: 'All personal information (names, phone numbers, exact flat addresses) is anonymized locally in your browser memory before any analytical processing. Real identities are only re-injected into the final legal notice document rendered on your machine.',
  },
  {
    q: 'Is the generated demand notice legally binding?',
    a: 'The generated legal demand notice cites specific applicable sections of the Karnataka Rent Act, 1999, Transfer of Property Act, 1882, and Indian Contract Act, 1872. It is structured in formal advocate format and can be served via registered post or legal counsel.',
  },
];

export const CommandCenter: React.FC<CommandCenterProps> = ({
  onStartEvaluation,
  onOpenEmergency,
}) => {
  const [inputText, setInputText] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  // Typing animation for placeholder
  useEffect(() => {
    let currentIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      const fullText = EXAMPLE_SITUATIONS[currentIdx];

      if (!isDeleting) {
        setPlaceholderText(fullText.substring(0, charIdx + 1));
        charIdx++;
        if (charIdx === fullText.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, 2400);
          return;
        }
        timeoutId = setTimeout(tick, 35);
      } else {
        setPlaceholderText(fullText.substring(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) {
          isDeleting = false;
          currentIdx = (currentIdx + 1) % EXAMPLE_SITUATIONS.length;
          timeoutId = setTimeout(tick, 500);
          return;
        }
        timeoutId = setTimeout(tick, 18);
      }
    };

    timeoutId = setTimeout(tick, 800);
    return () => clearTimeout(timeoutId);
  }, []);

  // Track active step on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!stepsContainerRef.current) return;
      const stepElements = stepsContainerRef.current.querySelectorAll('.step-card');
      const triggerY = window.innerHeight * 0.45;

      stepElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom >= triggerY) {
          setActiveStep(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleHeroSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onStartEvaluation(inputText);
  };

  return (
    <div className="w-full">
      {/* 2. Hero Section: full-width blue-to-off-white gradient */}
      <section className="relative w-full pt-16 sm:pt-24 pb-36 sm:pb-44 bg-gradient-to-b from-[#93B4F5] via-[#C8DCFC] to-[#F4F6FB] overflow-hidden">
        {/* Stepped Pixel Pattern along edges (pure CSS divs, low contrast) */}
        <div aria-hidden="true" className="absolute left-0 top-12 flex flex-col gap-3 pointer-events-none opacity-40 select-none">
          <div className="w-10 h-10 bg-white/70 ml-2" />
          <div className="w-12 h-12 bg-white/50 ml-8" />
          <div className="w-8 h-8 bg-white/60 ml-4" />
          <div className="w-14 h-14 bg-white/40 ml-12" />
          <div className="w-10 h-10 bg-white/50 ml-6" />
        </div>
        <div aria-hidden="true" className="absolute right-0 top-8 flex flex-col gap-3 pointer-events-none opacity-40 select-none items-end">
          <div className="w-12 h-12 bg-white/60 mr-4" />
          <div className="w-14 h-14 bg-white/40 mr-12" />
          <div className="w-8 h-8 bg-white/70 mr-6" />
          <div className="w-10 h-10 bg-white/50 mr-10" />
          <div className="w-12 h-12 bg-white/40 mr-2" />
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Centered very large bold headline in near-black, no highlighted word, no gradient, no badge */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#0F172A] leading-[1.08] mb-6">
            Your tenancy rights, mathematically defended.
          </h1>

          {/* Short subline (2 lines max) */}
          <p className="text-base sm:text-lg md:text-xl text-[#334155] font-normal max-w-2xl mx-auto leading-relaxed">
            Deterministic legal aid for Bengaluru renters. Calculate statutory deposit refunds, contest arbitrary deductions, and generate enforceable notices.
          </p>
        </div>
      </section>

      {/* 3. Hero Input Card (The Main CTA) - Overlapping the bottom of the hero */}
      <section className="relative z-20 max-w-3xl mx-auto px-4 -mt-24 sm:-mt-28">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/60 shadow-soft-blue">
          {/* Small blue pill tag at top-left of the card */}
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              Lease & Dispute Diagnostic
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Karnataka Rent Act 1999 Grounded
            </span>
          </div>

          {/* Large textarea with typing-animated placeholder */}
          <form onSubmit={handleHeroSubmit}>
            <div className="relative mb-5">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={placeholderText}
                rows={4}
                className="w-full text-sm sm:text-base text-[#0F172A] placeholder-slate-400 bg-transparent resize-none border-0 focus:ring-0 focus:outline-none p-0 leading-relaxed font-sans"
              />
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {/* Left icons: attach and info */}
              <div className="flex items-center gap-2 text-slate-400">
                <button
                  type="button"
                  onClick={() => onStartEvaluation(inputText)}
                  title="Attach Agreement / Receipt info"
                  className="p-2 rounded-full hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Deterministic calculation under Karnataka Rent Act"
                  className="p-2 rounded-full hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Right: mic icon and square blue send/arrow button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  title="Voice input"
                  className="p-2 rounded-full text-slate-400 hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  id="hero-input-submit-btn"
                  title="Run Evaluation"
                  className="w-11 h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition-all shadow-sm cursor-pointer group"
                >
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Emergency triage secondary text link under card */}
        <div className="text-center mt-4">
          <button
            type="button"
            id="emergency-secondary-link"
            onClick={onOpenEmergency}
            className="text-xs text-slate-500 hover:text-[#2563EB] transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
            <span>Facing immediate power or water cutoff? <strong className="font-semibold text-rose-600 underline">Launch Emergency 112 Triage</strong></span>
          </button>
        </div>
      </section>

      {/* 4. Trust Strip: slim horizontal strip of plain text sources in grey, infinite slow marquee */}
      <section className="w-full py-10 mt-14 overflow-hidden border-y border-slate-200/50 bg-[#F4F6FB]">
        <div className="relative w-full overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {STATUTORY_SOURCES.concat(STATUTORY_SOURCES).map((src, i) => (
              <span key={i} className="inline-flex items-center gap-4">
                <span>{src}</span>
                <span className="text-slate-300">•</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Value Section: rounded-3xl light-blue-tint card (#EFF6FF, NOT dark) */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-[#EFF6FF] rounded-3xl p-8 sm:p-14 border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] block mb-3 font-mono">
              The Bengaluru Tenancy Problem
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F172A] leading-tight mb-4">
              Arbitrary painting deductions and notice shortfalls cost tenants thousands every month.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              Landlords routinely deduct painting and deep-cleaning without itemised invoices. Namma Tenant Navigator verifies your agreement against statutory benchmarks, enforces the 2-month deposit cap, and generates formal notices to reclaim your money.
            </p>
            <button
              onClick={() => onStartEvaluation()}
              className="px-6 py-3 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
            >
              Start Free Assessment
            </button>
          </div>

          {/* Simple flat blue SVG illustration (blue tints only) */}
          <div className="w-64 h-64 shrink-0 flex items-center justify-center p-4">
            <svg
              viewBox="0 0 240 240"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="20" y="20" width="200" height="200" rx="24" fill="#DBEAFE" />
              {/* Document Outline */}
              <rect x="55" y="45" width="130" height="150" rx="12" fill="#FFFFFF" stroke="#93B4F5" strokeWidth="2" />
              {/* Document Text Lines */}
              <rect x="75" y="70" width="70" height="8" rx="4" fill="#2563EB" />
              <rect x="75" y="90" width="90" height="6" rx="3" fill="#93B4F5" />
              <rect x="75" y="105" width="85" height="6" rx="3" fill="#93B4F5" />
              <rect x="75" y="120" width="60" height="6" rx="3" fill="#93B4F5" />
              {/* Seal Stamp */}
              <circle cx="145" cy="155" r="24" fill="#2563EB" />
              <circle cx="145" cy="155" r="20" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M137 155L143 161L155 149" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* 6. Steps Section: 6 numbered steps (01 to 06) vertical stack on right, sticky illustration on left */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center md:text-left mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] block mb-2 font-mono">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            From dispute to enforceable demand in 6 steps.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Left: Sticky illustration area on desktop, hidden or stacked on mobile */}
          <div className="hidden md:block md:col-span-5">
            <div className="sticky top-28 p-8 rounded-3xl bg-white border border-slate-200/60 shadow-soft-card">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center text-[#2563EB] mb-6">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2 font-heading">
                Step {STEPS_DATA[activeStep]?.num}
              </h3>
              <p className="text-sm font-semibold text-[#2563EB] mb-4">
                {STEPS_DATA[activeStep]?.title}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {STEPS_DATA[activeStep]?.desc}
              </p>
              <div className="p-4 rounded-2xl bg-[#F4F6FB] border border-slate-200/60 font-mono text-[11px] text-slate-600">
                <span className="block text-[#2563EB] font-bold mb-1">CURRENT PIPELINE STATUS:</span>
                Active legal parsing • Karnataka Urban Rulebook Grounded
              </div>
            </div>
          </div>

          {/* Right: Vertical stack of white rounded-2xl cards (01 to 06) */}
          <div ref={stepsContainerRef} className="md:col-span-7 space-y-4">
            {STEPS_DATA.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.num}
                  className={`step-card p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/60 transition-all duration-300 ${
                    isActive
                      ? 'opacity-100 shadow-soft-card border-blue-200'
                      : 'opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-sm font-bold text-[#2563EB] shrink-0 pt-0.5">
                      {step.num}
                    </span>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-[#0F172A] mb-1.5 font-heading">
                        {step.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Numbers Section: 3 large stats in near-black, huge heading font, small slate caption */}
      <section className="max-w-5xl mx-auto px-4 py-20 border-t border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-soft-card">
            <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0F172A] block mb-2 font-heading tracking-tight">
              2 Months
            </span>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Maximum statutory residential deposit cap under Karnataka practice rules
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-soft-card">
            <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0F172A] block mb-2 font-heading tracking-tight">
              90 Days
            </span>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Mandatory advance written notice required prior to any rent revision
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-soft-card">
            <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0F172A] block mb-2 font-heading tracking-tight">
              7 Statutes
            </span>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Codified legal benchmarks from Karnataka Rent Act & Transfer of Property Act
            </p>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section: Two columns */}
      <section className="max-w-5xl mx-auto px-4 py-20 border-t border-slate-200/60" id="faq-section">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Left Column: Big FAQs heading, one line of text, navy pill button */}
          <div className="md:col-span-4">
            <div className="sticky top-28">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] block mb-2 font-mono">
                Questions & Answers
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mb-3 font-heading">
                FAQs
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                Clear legal facts on security deposits, deductions, and tenancy protection in Bengaluru.
              </p>
              <button
                onClick={() => onStartEvaluation()}
                className="px-6 py-3 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white text-xs font-semibold tracking-wide transition-colors"
              >
                Evaluate My Dispute
              </button>
            </div>
          </div>

          {/* Right Column: Accordion of rounded-2xl cream/white rows */}
          <div className="md:col-span-8 space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200/60 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm sm:text-base text-[#0F172A] hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <span
                      className={`w-6 h-6 rounded-full bg-[#F4F6FB] flex items-center justify-center shrink-0 text-slate-600 transition-transform duration-200 ${
                        isOpen ? 'rotate-45 text-[#2563EB]' : ''
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Footer: LIGHT. Background #EAF0FB with ink text */}
      <footer className="w-full bg-[#EAF0FB] border-t border-slate-200/80 mt-20 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 pb-12 border-b border-slate-200">
            {/* Large Wordmark Left */}
            <div className="max-w-sm">
              <span className="text-xl sm:text-2xl font-extrabold text-[#0F172A] block font-heading tracking-tight mb-2">
                Namma Tenant Navigator
              </span>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Bengaluru Urban Tenancy Aid. Grounded in the Karnataka Rent Act, 1999 and Transfer of Property Act, 1882.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Zero Cloud PII Storage</span>
              </div>
            </div>

            {/* Contact / Legal links in 2 columns right */}
            <div className="grid grid-cols-2 gap-10 text-xs">
              <div className="space-y-2.5">
                <span className="font-bold uppercase tracking-wider text-[#0F172A] block text-[11px]">
                  Statutory Aid
                </span>
                <p
                  onClick={() => onStartEvaluation()}
                  className="text-slate-600 hover:text-[#2563EB] cursor-pointer"
                >
                  Deposit Cap Calculator
                </p>
                <p
                  onClick={() => onStartEvaluation()}
                  className="text-slate-600 hover:text-[#2563EB] cursor-pointer"
                >
                  90-Day Notice Audit
                </p>
                <p
                  onClick={onOpenEmergency}
                  className="text-slate-600 hover:text-rose-600 cursor-pointer"
                >
                  Emergency 112 Triage
                </p>
                <p
                  onClick={() => onStartEvaluation()}
                  className="text-slate-600 hover:text-[#2563EB] cursor-pointer"
                >
                  Demand Notice Generator
                </p>
              </div>

              <div className="space-y-2.5">
                <span className="font-bold uppercase tracking-wider text-[#0F172A] block text-[11px]">
                  Legal Frameworks
                </span>
                <p className="text-slate-600">Karnataka Rent Act 1999</p>
                <p className="text-slate-600">Transfer of Property Act 1882</p>
                <p className="text-slate-600">Model Tenancy Act</p>
                <p className="text-slate-600">Indian Contract Act 1872</p>
              </div>
            </div>
          </div>

          {/* Small disclaimer text in slate + optional language toggle pill */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} Namma Tenant Navigator. Open legal defense platform. Informational tool, not formal attorney legal advice.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
              <span>English</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-400">ಕನ್ನಡ (Beta)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
