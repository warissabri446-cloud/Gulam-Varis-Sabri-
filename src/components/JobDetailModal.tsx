import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { formatINR } from '../shared/matching';
import { buildSalaryTrendCsv } from '../shared/salaryAnalytics';
import type { CandidateProfile, JobPosting, MatchBreakdown } from '../shared/types';
import { SalaryBenchmarkChart } from './SalaryBenchmarkChart';
import { SalaryTrendChart } from './SalaryTrendChart';
import { CareerPathInsights } from './CareerPathInsights';
import { SalaryDeviationAlert } from './SalaryDeviationAlert';
import { SalaryBreakdownTable } from './SalaryBreakdownTable';
import { InterviewPrepChecklist } from './InterviewPrepChecklist';

type SummaryMatchProfile = Pick<
  CandidateProfile,
  'skills' | 'preferredShift' | 'expectedSalary' | 'preferredSector' | 'experienceYears' | 'city' | 'workModePreference'
>;

interface JobDetailModalProps {
  job: JobPosting | null;
  allJobs: JobPosting[];
  candidate?: CandidateProfile | null;
  authToken?: string | null;
  matchProfile?: SummaryMatchProfile | null;
  match: MatchBreakdown | null;
  alreadyApplied: boolean;
  applying: boolean;
  isCompanyUser: boolean;
  quickApplyEnabled?: boolean;
  onToggleQuickApply?: (enabled: boolean) => void;
  onOpenCandidatePortal?: () => void;
  onClose: () => void;
  onApply: (job: JobPosting) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  allJobs,
  candidate = null,
  authToken = null,
  matchProfile = null,
  match,
  alreadyApplied,
  applying,
  isCompanyUser,
  quickApplyEnabled,
  onToggleQuickApply,
  onOpenCandidatePortal,
  onClose,
  onApply,
}) => {
  const [salaryChartTab, setSalaryChartTab] = useState<'trend' | 'city'>('trend');
  const [localQuickApply, setLocalQuickApply] = useState(false);
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const [summaryByJobId, setSummaryByJobId] = useState<Record<string, string[]>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const isQuickApply = quickApplyEnabled ?? localQuickApply;

  useEffect(() => {
    setConfirmingApply(false);
    setCsvDownloaded(false);
    setSummaryLoading(false);
    setSummaryError(null);
  }, [job?.id]);

  if (!job) return null;

  const summaryBullets = summaryByJobId[job.id] || null;

  const handleGenerateSummary = async () => {
    const activeJobId = job.id;
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const contextSource = candidate || matchProfile;
      const candidateContext = contextSource
        ? {
            city: contextSource.city,
            preferredSector: contextSource.preferredSector,
            preferredShift: contextSource.preferredShift,
            expectedSalary: contextSource.expectedSalary,
            experienceYears: contextSource.experienceYears,
            skills: contextSource.skills,
            workModePreference: contextSource.workModePreference,
          }
        : null;

      const res = await fetch(`/api/jobs/${encodeURIComponent(activeJobId)}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ candidateContext }),
      });

      const data = (await res.json().catch(() => ({}))) as { bullets?: string[]; error?: string };
      if (!res.ok || !Array.isArray(data.bullets) || data.bullets.length === 0) {
        setSummaryError(data.error || 'Could not generate AI summary right now. Please try again.');
        return;
      }

      setSummaryByJobId((prev) => ({
        ...prev,
        [activeJobId]: data.bullets!.slice(0, 3),
      }));
    } catch {
      setSummaryError('Network error while contacting summary service. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDownloadSalaryCsv = () => {
    const { csvContent, fileName } = buildSalaryTrendCsv(job, allJobs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    setCsvDownloaded(true);
    window.setTimeout(() => setCsvDownloaded(false), 2200);
  };

  const handleToggleQuickApply = (checked: boolean) => {
    if (onToggleQuickApply) {
      onToggleQuickApply(checked);
    } else {
      setLocalQuickApply(checked);
    }
    if (checked) {
      setConfirmingApply(false);
    }
  };

  const handlePrimaryApplyClick = () => {
    if (!candidate || isQuickApply) {
      onApply(job);
      return;
    }
    setConfirmingApply(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified Employer
              </span>
              <span aria-hidden="true">·</span>
              <span>{job.companyName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">GSTIN {job.companyGstin}</span>
            </div>
            <h2 className="mt-1.5 font-display text-xl font-bold text-slate-900 sm:text-2xl">
              {job.postTitle}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{job.sector}</span>
              <span aria-hidden="true">·</span>
              <span>{job.city} ({job.locality})</span>
              <span aria-hidden="true">·</span>
              <span>{job.workMode}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-indigo-700">{job.joiningSpeed}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close job details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Upfront Salary & Timetable Commitment */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-700" />
                Upfront Monthly Salary &amp; CTC
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                {formatINR(job.salaryMin)} – {formatINR(job.salaryMax)} / mo
              </div>
              <div className="mt-0.5 text-xs text-slate-600 tabular-nums">
                {job.inHandEstimate} · {job.ctcAnnual}
              </div>
              <div className="mt-1 text-xs font-medium text-emerald-700">{job.benefits}</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarClock className="h-3.5 w-3.5 text-indigo-700" />
                Fixed Timetable &amp; Shift
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">{job.timetable}</div>
              <div className="mt-0.5 text-xs text-slate-600">{job.workingDays}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-700">
                <Video className="h-3.5 w-3.5" /> {job.interviewFormat}
              </div>
            </div>
          </div>

          {/* Salary Deviation Alert */}
          <SalaryDeviationAlert job={job} allJobs={allJobs} />

          {/* Tabbed Salary Market Insights: 12-Month Trend (Recharts) & City Comparison (D3) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900">Salary Market Insights</span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSalaryChartTab('trend')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      salaryChartTab === 'trend'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    12-Month Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryChartTab('city')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      salaryChartTab === 'city'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    City Comparison
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSalaryCsv}
                  aria-label="Download salary trend data as CSV"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    csvDownloaded
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {csvDownloaded ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>CSV Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
                      <span>Download CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {salaryChartTab === 'trend' ? (
              <SalaryTrendChart job={job} allJobs={allJobs} embedded />
            ) : (
              <SalaryBenchmarkChart job={job} allJobs={allJobs} embedded />
            )}
          </div>

          {/* Salary Breakdown Table */}
          <SalaryBreakdownTable job={job} allJobs={allJobs} />

          {/* Career Path Insights */}
          <CareerPathInsights job={job} />

          {/* Premium Matching Breakdown */}
          {match && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-indigo-800">
                    JobSarathi Premium Match Algorithm
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900">
                    {match.score}% Compatibility — {match.tier}
                  </div>
                </div>
                <div className="font-mono text-2xl font-bold text-indigo-700 tabular-nums">
                  {match.score}%
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
                  <div className="text-slate-500">Skills Match</div>
                  <div className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                    {match.factorScores.skills}/40
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
                  <div className="text-slate-500">Timetable</div>
                  <div className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                    {match.factorScores.timetable}/20
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
                  <div className="text-slate-500">Salary Fit</div>
                  <div className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                    {match.factorScores.salary}/20
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
                  <div className="text-slate-500">Sector &amp; City</div>
                  <div className="mt-0.5 font-mono font-bold text-slate-900 tabular-nums">
                    {match.factorScores.fit}/20
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description, AI Summary Action & Requirements */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Role Responsibilities &amp; Shift Details</h3>
              <button
                type="button"
                disabled={summaryLoading}
                onClick={handleGenerateSummary}
                aria-busy={summaryLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {summaryLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
                    <span>{summaryBullets ? 'Regenerate Summary' : 'Generate Summary'}</span>
                  </>
                )}
              </button>
            </div>

            {summaryError && (
              <div
                role="alert"
                className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                  <span>{summaryError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="shrink-0 font-semibold text-rose-800 underline underline-offset-2 hover:text-rose-950"
                >
                  Retry
                </button>
              </div>
            )}

            {summaryBullets && (
              <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
                    <span>Why this job is for you</span>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-700">
                    {candidate || matchProfile ? 'Tailored 3-point fit' : '3-point role brief'}
                  </span>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {summaryBullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-800">
                      <span className="mt-0.5 font-mono text-xs font-bold text-indigo-700 tabular-nums shrink-0">
                        0{idx + 1}.
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-sm leading-relaxed text-slate-700">{job.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-500">Required Skills</h4>
              <p className="mt-1.5 text-sm font-medium text-slate-800">
                {job.requiredSkills.join(' · ')}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500">Eligibility &amp; Vacancies</h4>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-800">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4 text-slate-400" /> {job.openings} Openings
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {job.experienceMin === 0 ? 'Freshers Eligible' : `${job.experienceMin}–${job.experienceMax} yrs exp`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-slate-400" /> {job.city}
                </span>
              </div>
            </div>
          </div>

          {/* Interview Preparation Checklist */}
          <InterviewPrepChecklist job={job} />
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
          {confirmingApply && candidate && !alreadyApplied && !isCompanyUser ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Confirm Application Details</span>
                  {onOpenCandidatePortal && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingApply(false);
                        onOpenCandidatePortal();
                      }}
                      className="font-semibold text-indigo-700 hover:text-indigo-800"
                    >
                      Edit Resume &amp; Profile
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-slate-700 sm:grid-cols-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-700" aria-hidden="true" />
                    <span className="truncate font-medium text-slate-900">
                      {candidate.hasResumeFile
                        ? candidate.resumeFileName
                        : candidate.resumeFileName || 'Profile Summary Resume'}
                    </span>
                  </div>
                  <div className="truncate text-slate-600">
                    {candidate.fullName || candidate.identifier} · {candidate.city || 'India'} ·{' '}
                    <span className="font-mono tabular-nums">{formatINR(candidate.expectedSalary)}/mo</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={isQuickApply}
                    onChange={(e) => handleToggleQuickApply(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-700"
                  />
                  <span className="font-semibold text-slate-800">Enable Quick Apply</span>
                  <span className="text-slate-500">(skip this check next time)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => setConfirmingApply(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => onApply(job)}
                    className="rounded-lg bg-indigo-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
                  >
                    {applying ? 'Submitting Application...' : 'Confirm & Submit Free'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                {!isCompanyUser && !alreadyApplied && (
                  <label
                    htmlFor="quick-apply-toggle"
                    className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-800"
                  >
                    <input
                      id="quick-apply-toggle"
                      type="checkbox"
                      checked={isQuickApply}
                      onChange={(e) => handleToggleQuickApply(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-indigo-700"
                    />
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      <Zap
                        className={`h-3.5 w-3.5 ${isQuickApply ? 'text-indigo-700' : 'text-slate-400'}`}
                        aria-hidden="true"
                      />
                      Quick Apply
                    </span>
                    <span className="text-slate-500">
                      {candidate
                        ? `Use ${
                            candidate.hasResumeFile
                              ? candidate.resumeFileName
                              : candidate.resumeFileName || 'saved profile'
                          } in 1 click`
                        : 'Skip confirmation using saved resume & profile'}
                    </span>
                  </label>
                )}

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-emerald-700">₹0 Candidate Fee</span> · Online Video Interview saves travel cost &amp; time
                </div>
              </div>

              {isCompanyUser ? (
                <span className="text-xs font-medium text-slate-500">
                  Signed in as Employer (switch to Candidate OTP to apply)
                </span>
              ) : alreadyApplied ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Applied (Free)
                </span>
              ) : (
                <button
                  type="button"
                  disabled={applying}
                  onClick={handlePrimaryApplyClick}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
                >
                  {isQuickApply && <Zap className="h-4 w-4" aria-hidden="true" />}
                  {applying
                    ? 'Submitting Application...'
                    : isQuickApply
                    ? 'Quick Apply in 1 Click'
                    : 'Apply Free'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
