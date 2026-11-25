import React, { useState } from 'react';
import { Building2, Calendar, CalendarDays, CheckCircle2, CreditCard, Download, FileText, IndianRupee, Plus, ShieldCheck, Users, Video } from 'lucide-react';
import { makeSlotKey, summarizeAvailability } from '../shared/availability';
import { formatINR } from '../shared/matching';
import { InterviewAvailabilityCalendar } from './InterviewAvailabilityCalendar';
import type {
  BillingInvoice,
  CompanyAccount,
  JobApplication,
  JobPosting,
  JoiningSpeed,
  Sector,
  ShiftType,
  WorkMode,
} from '../shared/types';

interface CompanyPortalProps {
  company: CompanyAccount;
  companyJobs: JobPosting[];
  applications: JobApplication[];
  invoices: BillingInvoice[];
  onPostJob: (payload: {
    postTitle: string;
    sector: Sector;
    city: string;
    locality: string;
    workMode: WorkMode;
    salaryMin: number;
    salaryMax: number;
    benefits: string;
    shiftType: ShiftType;
    timetable: string;
    workingDays: string;
    joiningSpeed: JoiningSpeed;
    experienceMin: number;
    experienceMax: number;
    openings: number;
    requiredSkills: string[];
    description: string;
    planId: 'single-99' | 'unlimited-299';
  }) => Promise<{ ok: boolean; error?: string; invoice?: BillingInvoice | null }>;
  onScheduleInterview: (
    applicationId: string,
    payload: { scheduledDate: string; scheduledTime: string; durationMins: number; notes: string }
  ) => Promise<boolean>;
  onJoinInterview: (application: JobApplication) => void;
  onDownloadResume: (application: JobApplication) => Promise<void>;
}

const SECTORS: Sector[] = [
  'BPO & Customer Support',
  'IT & Software',
  'Banking & Finance',
  'Sales & Retail',
  'Logistics & Operations',
  'Healthcare & Pharma',
  'Manufacturing & Engineering',
  'EdTech & Training',
];

export const CompanyPortal: React.FC<CompanyPortalProps> = ({
  company,
  companyJobs,
  applications,
  invoices,
  onPostJob,
  onScheduleInterview,
  onJoinInterview,
  onDownloadResume,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'post' | 'applicants' | 'billing'>('post');

  // Post Job Form state
  const [postTitle, setPostTitle] = useState('');
  const [sector, setSector] = useState<Sector>(company.sector || 'BPO & Customer Support');
  const [city, setCity] = useState(company.city || 'Gurugram');
  const [locality, setLocality] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>('On-site');
  const [salaryMin, setSalaryMin] = useState(22000);
  const [salaryMax, setSalaryMax] = useState(32000);
  const [benefits, setBenefits] = useState('PF + ESIC + Attendance Bonus');
  const [shiftType, setShiftType] = useState<ShiftType>('Day Shift');
  const [timetable, setTimetable] = useState('09:30 AM – 06:30 PM IST · Fixed Day');
  const [workingDays, setWorkingDays] = useState('5 Days / Week (Sat–Sun Off)');
  const [joiningSpeed, setJoiningSpeed] = useState<JoiningSpeed>('Immediate (48 hrs)');
  const [experienceMin, setExperienceMin] = useState(0);
  const [experienceMax, setExperienceMax] = useState(3);
  const [openings, setOpenings] = useState(10);
  const [skillsText, setSkillsText] = useState('Customer Support, Hindi Communication, English Communication, CRM');
  const [description, setDescription] = useState('');
  const [planId, setPlanId] = useState<'single-99' | 'unlimited-299'>('single-99');

  const [posting, setPosting] = useState(false);
  const [postFeedback, setPostFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schedule interview inline form state
  const [schedulingAppId, setSchedulingAppId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState(new Date().toISOString().slice(0, 10));
  const [schedTime, setSchedTime] = useState('03:30 PM IST');
  const [schedNotes, setSchedNotes] = useState('Online video round — keep resume & ID ready.');

  const hasActiveUnlimited =
    company.activePlan === 'unlimited-299' &&
    company.planExpiresAt &&
    new Date(company.planExpiresAt).getTime() > Date.now();

  const basePrice = hasActiveUnlimited && planId === 'single-99' ? 0 : planId === 'unlimited-299' ? 299 : 99;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalPayable = basePrice + gstAmount;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setPostFeedback(null);
    const requiredSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await onPostJob({
      postTitle,
      sector,
      city,
      locality: locality || city,
      workMode,
      salaryMin,
      salaryMax,
      benefits,
      shiftType,
      timetable,
      workingDays,
      joiningSpeed,
      experienceMin,
      experienceMax,
      openings,
      requiredSkills,
      description,
      planId,
    });

    setPosting(false);
    if (res.ok) {
      setPostFeedback({
        type: 'success',
        text: res.invoice
          ? `Job published live! GST Invoice ${res.invoice.id} (${formatINR(res.invoice.totalAmount)}) generated.`
          : 'Job published live under your ₹299/mo Unlimited Plan!',
      });
      setPostTitle('');
      setDescription('');
    } else {
      setPostFeedback({ type: 'error', text: res.error || 'Could not publish job.' });
    }
  };

  const handleConfirmSchedule = async (appId: string) => {
    const ok = await onScheduleInterview(appId, {
      scheduledDate: schedDate,
      scheduledTime: schedTime,
      durationMins: 20,
      notes: schedNotes,
    });
    if (ok) {
      setSchedulingAppId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Verified Company KYC Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>KYC Verified Employer</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono text-slate-600">GSTIN {company.gstin}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono text-slate-600">CIN {company.cinOrRegNo}</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
              {company.brandName} ({company.legalName})
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              {company.officeAddress}, {company.city} · HR: {company.hrName} ({company.hrDesignation}) · {company.officialEmail}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Current Hiring Plan</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-indigo-700">
              {hasActiveUnlimited ? '₹299/mo Unlimited Active' : 'Pay-Per-Post (₹99)'}
            </div>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="mt-6 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('post')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSubTab === 'post' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Post Vacancy (₹99)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('applicants')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSubTab === 'applicants' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Matched Applicants ({applications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('billing')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSubTab === 'billing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Jobs ({companyJobs.length}) &amp; GST Invoices
          </button>
        </div>
      </div>

      {activeSubTab === 'post' && (
        <form onSubmit={handlePublish} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Publish Transparent Job Vacancy
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Upfront salary, exact shift timetable, and post details are required so candidates can apply immediately.
              </p>
            </div>

            {postFeedback && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  postFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {postFeedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Post / Job Role Title *</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Customer Care Executive (Inbound Voice)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Industry Sector *</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as Sector)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Joining Speed *</label>
                <select
                  value={joiningSpeed}
                  onChange={(e) => setJoiningSpeed(e.target.value as JoiningSpeed)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                >
                  <option value="Immediate (48 hrs)">Immediate (48 hrs)</option>
                  <option value="Within 7 Days">Within 7 Days</option>
                  <option value="Within 15 Days">Within 15 Days</option>
                  <option value="Within 30 Days">Within 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Gurugram"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Work Mode *</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                >
                  <option value="On-site">On-site (Office)</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote (Work From Home)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Monthly Salary Min (₹) *</label>
                <input
                  type="number"
                  required
                  min={5000}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Monthly Salary Max (₹) *</label>
                <input
                  type="number"
                  required
                  min={salaryMin}
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Shift Type *</label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as ShiftType)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                >
                  <option value="Day Shift">Day Shift</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="Rotational Shift">Rotational Shift</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Exact Shift Timetable *</label>
                <input
                  type="text"
                  required
                  value={timetable}
                  onChange={(e) => setTimetable(e.target.value)}
                  placeholder="09:30 AM – 06:30 PM IST · Fixed Day"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Working Days &amp; Offs *</label>
                <input
                  type="text"
                  required
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  placeholder="5 Days / Week (Sat–Sun Off)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Openings &amp; Locality</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={openings}
                    onChange={(e) => setOpenings(Number(e.target.value) || 1)}
                    className="w-24 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-indigo-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Area / Hub (e.g. Cyber City)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Min Exp (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={experienceMin}
                  onChange={(e) => setExperienceMin(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Benefits (PF / ESIC / Cab)</label>
                <input
                  type="text"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Required Skills (comma-separated) *</label>
                <input
                  type="text"
                  required
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Role Details &amp; Online Interview Process *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe daily tasks, training support, and online video interview expectations..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Lowest-in-India Checkout Card */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-display text-base font-bold text-slate-900">
                India&apos;s Lowest Hiring Fee
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Candidates pay ₹0. Companies pay a flat transparent fee to eliminate fake listings.
              </p>

              <div className="mt-4 space-y-3">
                <label
                  className={`flex cursor-pointer items-start justify-between rounded-lg border p-3.5 transition-colors ${
                    planId === 'single-99' ? 'border-indigo-700 bg-indigo-50/50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="planId"
                      checked={planId === 'single-99'}
                      onChange={() => setPlanId('single-99')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-900">Single Verified Post</div>
                      <div className="text-xs text-slate-600">30 days live · Online interviews included</div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {hasActiveUnlimited ? '₹0' : '₹99'}
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-start justify-between rounded-lg border p-3.5 transition-colors ${
                    planId === 'unlimited-299' ? 'border-indigo-700 bg-indigo-50/50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="planId"
                      checked={planId === 'unlimited-299'}
                      onChange={() => setPlanId('unlimited-299')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-900">Unlimited Monthly</div>
                      <div className="text-xs text-slate-600">Unlimited jobs across all sectors for 30 days</div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-indigo-700 tabular-nums">₹299</span>
                </label>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Plan Charge</span>
                  <span className="font-mono tabular-nums">{formatINR(basePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span className="font-mono tabular-nums">{formatINR(gstAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                  <span>Total Payable</span>
                  <span className="font-mono tabular-nums">{formatINR(totalPayable)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={posting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {posting ? 'Publishing Job...' : `Pay ${formatINR(totalPayable)} & Publish Live`}
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                Compared to ₹1,650–₹4,999 on legacy job portals (up to 94% savings).
              </p>
            </div>
          </div>
        </form>
      )}

      {activeSubTab === 'applicants' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Applicants Ranked by Premium Match Algorithm
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Schedule built-in online video interviews to save travel time and hiring cost.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
              {applications.length} Candidates
            </span>
          </div>

          {applications.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-800">No applications received yet</p>
              <p className="mt-1 text-xs text-slate-500">
                When candidates apply to your posted jobs, they will appear here sorted by highest Match %.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{app.candidateName}</h3>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums">
                          {app.matchScore}% Match
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          {app.candidateCity} ({app.candidateExperience} yrs exp)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Applied for <span className="font-semibold text-slate-800">{app.jobTitle}</span> · Contact:{' '}
                        <span className="font-mono">{app.candidateIdentifier}</span>
                      </p>
                      <p className="mt-1.5 text-xs text-slate-700">
                        Skills: {app.candidateSkills.join(' · ')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Match reasons: {app.matchReasons.join(' · ')}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <span>
                            Resume:{' '}
                            <strong className="font-medium text-slate-800">
                              {app.candidateResumeAvailable ? app.candidateResumeFile : 'Profile Summary Only'}
                            </strong>
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{summarizeAvailability(app.candidateBusySlots).nextOpenSummary}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {app.candidateResumeAvailable && (
                        <button
                          type="button"
                          onClick={() => onDownloadResume(app)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                        >
                          <Download className="h-3.5 w-3.5 text-indigo-700" />
                          Download Resume
                        </button>
                      )}
                      {app.interview ? (
                        <button
                          type="button"
                          onClick={() => onJoinInterview(app)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join Video Interview ({app.interview.scheduledTime})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSchedulingAppId(schedulingAppId === app.id ? null : app.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Schedule Online Interview
                        </button>
                      )}
                    </div>
                  </div>

                  {schedulingAppId === app.id && (
                    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <InterviewAvailabilityCalendar
                        mode="employer"
                        busySlots={app.candidateBusySlots || []}
                        availabilityNote={app.candidateAvailabilityNote}
                        selectedDate={schedDate}
                        selectedTime={schedTime}
                        onSelectFreeSlot={(isoDate, timeSlot) => {
                          setSchedDate(isoDate);
                          setSchedTime(timeSlot);
                        }}
                      />

                      {(app.candidateBusySlots || []).includes(makeSlotKey(schedDate, schedTime)) && (
                        <p className="text-xs font-semibold text-amber-800">
                          Note: The candidate marked {schedDate} at {schedTime} as Busy. Please pick an open green slot above.
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Date</label>
                          <input
                            type="date"
                            value={schedDate}
                            onChange={(e) => setSchedDate(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Time (IST)</label>
                          <input
                            type="text"
                            value={schedTime}
                            onChange={(e) => setSchedTime(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Instructions</label>
                          <input
                            type="text"
                            value={schedNotes}
                            onChange={(e) => setSchedNotes(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleConfirmSchedule(app.id)}
                            className="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            Confirm &amp; Create Room
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'billing' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">Your Published Jobs</h2>
            {companyJobs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No jobs posted yet. Use the Post Vacancy tab to publish for ₹99.</p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {companyJobs.map((job) => (
                  <div key={job.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">{job.postTitle}</span>
                      <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                        {formatINR(job.salaryMin)}–{formatINR(job.salaryMax)}/mo
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {job.sector} · {job.timetable} · {job.openings} openings
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">GST Billing Invoices</h2>
            {invoices.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Invoices appear here when you publish a new job or plan.</p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900">{inv.id}</div>
                      <div className="text-xs text-slate-600">{inv.planLabel}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatINR(inv.totalAmount)}
                      </div>
                      <div className="text-xs text-emerald-700 font-medium">Paid (incl. GST)</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
