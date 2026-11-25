import React, { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqSectionProps {
  onCandidateStart: () => void;
  onCompanyStart: () => void;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'candidate-free',
    question: 'Is JobSarathi (formerly SafalJobs) really free for candidates?',
    answer:
      'Yes—₹0 forever for every job seeker. Mobile or Email OTP login, resume setup, match score ranking, Job Alerts, 1-click applications, and online video interviews are completely free. Revenue comes solely from our low ₹99 per post or ₹299/month employer verification plans, so candidates are never asked for registration, interview, or placement fees.',
  },
  {
    id: 'company-verification',
    question: 'How is company verification handled?',
    answer:
      'Every employer must pass corporate KYC verification before publishing any vacancy. We verify the company’s 15-character GSTIN, CIN or business registration number, official work email, HR mobile contact, and physical office address. You can inspect each employer’s verified GSTIN directly inside the Job Details view before applying.',
  },
  {
    id: 'salary-timetable-transparency',
    question: 'Are the upfront salary, PF/ESIC, and shift timetable details binding?',
    answer:
      'Yes. Unlike portals that hide pay behind "Best in Industry", JobSarathi requires companies to publish a clear monthly salary band, in-hand estimate, statutory benefits (PF/ESIC/bonuses), exact IST shift hours, and weekly offs upfront so you never face surprise pay cuts or unannounced night shifts.',
  },
  {
    id: 'online-interviews',
    question: 'How do built-in online video interviews work?',
    answer:
      'Once an employer shortlists your application, they schedule a slot in the JobSarathi Online Video Room—no travel fare or external apps required. Both you and the HR manager see the agreed salary band, shift timetable, and your resume side-by-side during the call for faster same-day hiring decisions.',
  },
  {
    id: 'scam-protection',
    question: 'How does JobSarathi prevent fake job scams or paid agents?',
    answer:
      'We strictly block unregistered middlemen and consultancies that demand security deposits, uniform charges, or paid training fees. Every live job is tied to a GSTIN-verified employer account and a transparent ₹99/₹299 GST invoice trail, ensuring real hiring teams on the other side.',
  },
  {
    id: 'match-and-alerts',
    question: 'How do the Match Algorithm and Job Alerts work?',
    answer:
      'JobSarathi scores each role from 0 to 99% across four clear factors: your skills (40 pts), shift timetable fit (20 pts), expected monthly salary (20 pts), and sector/city match (20 pts). Inside your Candidate Portal, you can also toggle free Email or SMS Job Alerts to get notified as soon as matching roles go live.',
  },
];

export const FaqSection: React.FC<FaqSectionProps> = ({ onCandidateStart, onCompanyStart }) => {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq-section" aria-labelledby="faq-heading" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold text-indigo-700">Candidate &amp; Hiring Trust</p>
            <h2
              id="faq-heading"
              className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance"
            >
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Clear answers on zero candidate fees, GSTIN company KYC checks, upfront shift timetables, and online interviews.
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-800">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>Zero Candidate Fee Guarantee · Verified Employers Only</span>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                Founder&apos;s Pledge
              </span>
              <p className="mt-1 leading-relaxed">
                &ldquo;Every job on JobSarathi must show real monthly pay and exact IST shift hours upfront—never hidden behind vague promises.&rdquo;
              </p>
              <p className="mt-1.5 font-display font-bold text-slate-900">
                — Waris Sabri, Founder &amp; Owner
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onCandidateStart}
                className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 whitespace-nowrap"
              >
                Candidate OTP Login (₹0)
              </button>
              <button
                type="button"
                onClick={onCompanyStart}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                Company KYC Check
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openId === item.id;
                const panelId = `faq-panel-${item.id}`;
                return (
                  <div key={item.id}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-700"
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-xs font-semibold text-slate-400 tabular-nums">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <span className="text-sm font-semibold text-slate-900 sm:text-base">
                            {item.question}
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-indigo-700' : ''
                          }`}
                        />
                      </button>
                    </h3>
                    {isOpen && (
                      <div
                        id={panelId}
                        className="px-5 pb-5 pl-12 text-sm leading-relaxed text-slate-600"
                      >
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
