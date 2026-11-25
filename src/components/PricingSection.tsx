import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';

interface PricingSectionProps {
  onCandidateStart: () => void;
  onCompanyStart: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onCandidateStart, onCompanyStart }) => {
  return (
    <section id="pricing-section" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-indigo-700">India&apos;s Lowest Hiring Charges</p>
        <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
          Free for every job seeker. 94% cheaper for verified Indian companies.
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Candidates never pay registration, interview, or placement fees. Companies pay a minimal verification charge so every job post is genuine.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Candidate Forever Free */}
        <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-white p-6">
          <div>
            <div className="text-xs font-semibold text-emerald-700">For Job Seekers</div>
            <h3 className="mt-1 font-display text-xl font-bold text-slate-900">Candidate Access</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-slate-900 tabular-nums">₹0</span>
              <span className="text-xs text-slate-500">Forever Free</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>OTP-only login with Mobile Number or Email</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Upfront monthly salary, PF/ESIC &amp; shift timetable</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Premium Match Algorithm across all sectors</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Free built-in online video interviews</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={onCandidateStart}
            className="mt-8 w-full rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Login with OTP (Free)
          </button>
        </div>

        {/* Employer Pay Per Post */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <div className="text-xs font-semibold text-slate-500">For Growing Teams</div>
            <h3 className="mt-1 font-display text-xl font-bold text-slate-900">Single Verified Post</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-slate-900 tabular-nums">₹99</span>
              <span className="text-xs text-slate-500">per vacancy · 30 days</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
                <span>GSTIN &amp; CIN verified company badge</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
                <span>Unlimited matched candidate applications</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
                <span>Built-in online interview scheduling &amp; video room</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
                <span>94% lower than ₹1,650 legacy job boards</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={onCompanyStart}
            className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Verify Company &amp; Post for ₹99
          </button>
        </div>

        {/* Employer Unlimited Monthly */}
        <div className="flex flex-col justify-between rounded-xl border border-indigo-700 bg-slate-900 p-6 text-white">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>For BPO &amp; High-Volume Hiring</span>
            </div>
            <h3 className="mt-1 font-display text-xl font-bold">Unlimited Monthly</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold tabular-nums">₹299</span>
              <span className="text-xs text-slate-300">per month · all sectors</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Unlimited job vacancies across BPO, IT, Sales &amp; Ops</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Priority ranking via JobSarathi Match Algorithm</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Unlimited online video interview rooms + GST invoice</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>Immediate 48-hour joiner filter unlocked</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={onCompanyStart}
            className="mt-8 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Start Unlimited Hiring (₹299/mo)
          </button>
        </div>
      </div>
    </section>
  );
};
