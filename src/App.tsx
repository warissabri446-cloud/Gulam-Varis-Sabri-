import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  IndianRupee,
  LogOut,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Video,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { CandidatePortal } from './components/CandidatePortal';
import { CompanyPortal } from './components/CompanyPortal';
import { JobDetailModal } from './components/JobDetailModal';
import { OnlineInterviewRoom } from './components/OnlineInterviewRoom';
import { PricingSection } from './components/PricingSection';
import { FaqSection } from './components/FaqSection';
import { OwnerSignatureSeal, SafalLogo } from './components/SafalLogo';
import { computeMatchScore, formatINR } from './shared/matching';
import type {
  BillingInvoice,
  CandidateProfile,
  CompanyAccount,
  JobAlertNotification,
  JobApplication,
  JobPosting,
  JoiningSpeed,
  Sector,
  ShiftType,
  WorkMode,
} from './shared/types';

type ActiveView = 'jobs' | 'candidate' | 'company' | 'interview' | 'pricing';

const HERO_IMAGE = '/src/assets/images/hero_indian_workplace_1795503676681.jpg';
const BPO_HUB_IMAGE = '/src/assets/images/bpo_operations_hub_1795503677892.jpg';

const SECTOR_TABS: Array<'All Sectors' | Sector> = [
  'All Sectors',
  'BPO & Customer Support',
  'IT & Software',
  'Banking & Finance',
  'Sales & Retail',
  'Logistics & Operations',
  'Healthcare & Pharma',
  'Manufacturing & Engineering',
  'EdTech & Training',
];

const CITIES = ['All India', 'Gurugram', 'Noida', 'Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Jaipur', 'Ahmedabad', 'Remote'];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('jobs');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'candidate' | 'company'>('candidate');

  // Session state kept strictly in React memory (never localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'guest' | 'candidate' | 'company'>('guest');
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [company, setCompany] = useState<CompanyAccount | null>(null);
  const [companyJobs, setCompanyJobs] = useState<JobPosting[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [alerts, setAlerts] = useState<JobAlertNotification[]>([]);

  // Jobs marketplace state
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [pendingApplyJob, setPendingApplyJob] = useState<JobPosting | null>(null);
  const [quickApplyEnabled, setQuickApplyEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<'All Sectors' | Sector>('All Sectors');
  const [selectedShift, setSelectedShift] = useState<'All Shifts' | ShiftType>('All Shifts');
  const [selectedCity, setSelectedCity] = useState('All India');
  const [immediateOnly, setImmediateOnly] = useState(false);
  const [minSalaryFilter, setMinSalaryFilter] = useState(0);

  // Guest/Preview Matching Preferences (allows testing Premium Match Algorithm immediately)
  const [showMatchTuner, setShowMatchTuner] = useState(false);
  const [guestMatchPrefs, setGuestMatchPrefs] = useState<
    Pick<
      CandidateProfile,
      'skills' | 'preferredShift' | 'expectedSalary' | 'preferredSector' | 'experienceYears' | 'city' | 'workModePreference'
    >
  >({
    skills: ['Customer Support', 'Hindi Communication', 'English Communication', 'CRM'],
    preferredShift: 'Day Shift',
    expectedSalary: 22000,
    preferredSector: 'BPO & Customer Support',
    experienceYears: 1,
    city: 'Gurugram',
    workModePreference: 'Any',
  });

  // Active online video interview room
  const [activeInterviewApp, setActiveInterviewApp] = useState<JobApplication | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const handleShareJob = useCallback(
    async (job: JobPosting) => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?job=${encodeURIComponent(job.id)}`;
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (!copied) {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          copied = document.execCommand('copy');
        } catch {
          copied = false;
        }
        document.body.removeChild(textarea);
      }

      if (copied) {
        setCopiedJobId(job.id);
        window.setTimeout(() => {
          setCopiedJobId((prev) => (prev === job.id ? null : prev));
        }, 2200);
        showToast(`Link copied! Share "${job.postTitle}" via WhatsApp or any platform.`);
      } else {
        showToast('Could not access clipboard. Please copy the URL from the browser bar.');
      }
    },
    [showToast]
  );

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        const sharedJobId = new URLSearchParams(window.location.search).get('job');
        if (sharedJobId) {
          const matched = data.jobs.find((j: JobPosting) => j.id === sharedJobId);
          if (matched) {
            setSelectedJob(matched);
          }
        }
      }
    } catch {
      // Keep existing jobs if transient network error
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchApplications = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.applications)) {
        setApplications(data.applications);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchAlerts = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/candidate/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchCompanyWorkspace = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/company/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.company) setCompany(data.company);
        if (Array.isArray(data.jobs)) setCompanyJobs(data.jobs);
        if (Array.isArray(data.invoices)) setInvoices(data.invoices);
      }
    } catch {
      // ignore
    }
  }, []);

  const applyForJob = useCallback(
    async (job: JobPosting, overrideToken?: string) => {
      const activeToken = overrideToken || authToken;
      if (!activeToken) {
        setPendingApplyJob(job);
        setAuthInitialTab('candidate');
        setAuthModalOpen(true);
        return;
      }

      setApplyingJobId(job.id);
      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ jobId: job.id }),
        });
        const data = await res.json();
        if (res.ok && data.application) {
          setApplications((prev) => [data.application, ...prev]);
          showToast(`Applied free to ${job.postTitle} at ${job.companyName} (${data.application.matchScore}% Match).`);
          setSelectedJob(null);
        } else {
          showToast(data.error || 'Could not submit application.');
        }
      } catch {
        showToast('Network error submitting application.');
      } finally {
        setApplyingJobId(null);
      }
    },
    [authToken, showToast]
  );

  const handleCandidateAuthSuccess = async (token: string, candProfile: CandidateProfile) => {
    setAuthToken(token);
    setUserRole('candidate');
    setCandidate(candProfile);
    setCompany(null);
    await Promise.all([fetchApplications(token), fetchAlerts(token)]);

    if (pendingApplyJob) {
      const target = pendingApplyJob;
      setPendingApplyJob(null);
      await applyForJob(target, token);
      setActiveView('candidate');
    } else {
      showToast('Signed in via OTP (₹0 Free Candidate Access).');
      setActiveView('candidate');
    }
  };

  const handleCompanyAuthSuccess = async (token: string, compAccount: CompanyAccount) => {
    setAuthToken(token);
    setUserRole('company');
    setCompany(compAccount);
    setCandidate(null);
    await Promise.all([fetchCompanyWorkspace(token), fetchApplications(token)]);
    showToast(`Verified Employer signed in: ${compAccount.brandName}`);
    setActiveView('company');
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setUserRole('guest');
    setCandidate(null);
    setCompany(null);
    setCompanyJobs([]);
    setInvoices([]);
    setApplications([]);
    setAlerts([]);
    setActiveInterviewApp(null);
    setActiveView('jobs');
    showToast('Signed out cleanly.');
  };

  const handleSaveCandidateProfile = async (updated: Partial<CandidateProfile>): Promise<boolean> => {
    if (!authToken) return false;
    try {
      const res = await fetch('/api/candidate/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (res.ok && data.candidate) {
        setCandidate(data.candidate);
        if (Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleUploadCandidateResume = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    if (!authToken) return { ok: false, error: 'Please sign in first.' };
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Could not read file.'));
          }
        };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/candidate/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          contentBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Resume upload failed.' };
      }
      if (data.candidate) {
        setCandidate(data.candidate);
      }
      showToast(`Uploaded "${file.name}" for verified recruiters.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error uploading resume.' };
    }
  };

  const handleRemoveCandidateResume = async (): Promise<boolean> => {
    if (!authToken) return false;
    try {
      const res = await fetch('/api/candidate/resume', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.candidate) {
        setCandidate(data.candidate);
        showToast('Uploaded resume file removed.');
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleDownloadResume = async (candidateId: string, fallbackName: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/resumes/candidate/${encodeURIComponent(candidateId)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Resume file unavailable.' }));
        showToast(err.error || 'Could not download resume.');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const downloadName = nameMatch?.[1] || fallbackName || 'resume.pdf';

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      showToast('Network error downloading resume.');
    }
  };

  const handleSyncAlerts = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/candidate/alerts/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
        showToast(
          data.createdCount > 0
            ? `${data.createdCount} new matching job alert(s) delivered.`
            : 'All matching jobs are already in your Job Alerts inbox.'
        );
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAlertsRead = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/candidate/alerts/mark-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch {
      // ignore
    }
  };

  const handlePostJob = async (payload: {
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
  }) => {
    if (!authToken) return { ok: false, error: 'Please sign in as a verified company.' };
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Could not publish job.' };
      }
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
        setCompanyJobs((prev) => [data.job, ...prev]);
      }
      if (data.invoice) {
        setInvoices((prev) => [data.invoice, ...prev]);
      }
      if (data.company) {
        setCompany(data.company);
      }
      return { ok: true, invoice: data.invoice || null };
    } catch {
      return { ok: false, error: 'Network error publishing vacancy.' };
    }
  };

  const handleScheduleInterview = async (
    applicationId: string,
    payload: { scheduledDate: string; scheduledTime: string; durationMins: number; notes: string }
  ): Promise<boolean> => {
    if (!authToken) return false;
    try {
      const res = await fetch(`/api/applications/${applicationId}/schedule-interview`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.application) {
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? data.application : a)));
        showToast('Online video interview room created.');
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleSubmitOutcome = async (
    applicationId: string,
    outcome: 'Selected' | 'Next Round' | 'On Hold' | 'Rejected',
    feedback: string
  ): Promise<boolean> => {
    if (!authToken) return false;
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-outcome`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ outcome, feedback }),
      });
      const data = await res.json();
      if (res.ok && data.application) {
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? data.application : a)));
        setActiveInterviewApp(data.application);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Active match profile (real signed-in candidate profile or guest tuner profile)
  const activeMatchProfile = useMemo(() => {
    if (candidate) return candidate;
    return guestMatchPrefs;
  }, [candidate, guestMatchPrefs]);

  // Compute filtered & match-ranked jobs
  const rankedJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      if (selectedSector !== 'All Sectors' && job.sector !== selectedSector) return false;
      if (selectedShift !== 'All Shifts' && job.shiftType !== selectedShift) return false;
      if (selectedCity !== 'All India' && !job.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      if (immediateOnly && !job.joiningSpeed.startsWith('Immediate')) return false;
      if (minSalaryFilter > 0 && job.salaryMax < minSalaryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesText =
          job.postTitle.toLowerCase().includes(q) ||
          job.companyName.toLowerCase().includes(q) ||
          job.sector.toLowerCase().includes(q) ||
          job.city.toLowerCase().includes(q) ||
          job.timetable.toLowerCase().includes(q) ||
          job.requiredSkills.some((s) => s.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      return true;
    });

    return filtered
      .map((job) => ({
        job,
        match: computeMatchScore(activeMatchProfile, job),
      }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [
    jobs,
    selectedSector,
    selectedShift,
    selectedCity,
    immediateOnly,
    minSalaryFilter,
    searchQuery,
    activeMatchProfile,
  ]);

  const appliedJobIds = useMemo(() => new Set(applications.map((a) => a.jobId)), [applications]);

  const openAuth = (tab: 'candidate' | 'company') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single Brand Wordmark + Custom 'S' Logo */}
          <button
            type="button"
            onClick={() => setActiveView('jobs')}
            className="text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700"
          >
            <SafalLogo size={32} />
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveView('jobs')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                activeView === 'jobs' ? 'font-semibold text-indigo-700 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Find Jobs
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveInterviewApp(applications.find((a) => a.interview) || null);
                setActiveView('interview');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                activeView === 'interview'
                  ? 'font-semibold text-indigo-700 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Online Interviews
            </button>
            <button
              type="button"
              onClick={() => {
                if (userRole === 'company') {
                  setActiveView('company');
                } else {
                  openAuth('company');
                }
              }}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                activeView === 'company'
                  ? 'font-semibold text-indigo-700 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              For Employers
            </button>
            <button
              type="button"
              onClick={() => setActiveView('pricing')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                activeView === 'pricing'
                  ? 'font-semibold text-indigo-700 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Pricing
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {userRole === 'guest' ? (
              <button
                type="button"
                onClick={() => openAuth('candidate')}
                className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 whitespace-nowrap shrink-0"
              >
                OTP Sign In / Post Job
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView(userRole === 'company' ? 'company' : 'candidate')}
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 whitespace-nowrap shrink-0"
                >
                  {userRole === 'company' ? 'Employer Hub' : 'My Resume & Match'}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav Strip (kept compact within mobile budget) */}
      <div className="flex items-center justify-around border-b border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 md:hidden">
        <button
          type="button"
          onClick={() => setActiveView('jobs')}
          className={activeView === 'jobs' ? 'font-bold text-indigo-700' : ''}
        >
          Jobs
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveInterviewApp(applications.find((a) => a.interview) || null);
            setActiveView('interview');
          }}
          className={activeView === 'interview' ? 'font-bold text-indigo-700' : ''}
        >
          Interviews
        </button>
        <button
          type="button"
          onClick={() => (userRole === 'company' ? setActiveView('company') : openAuth('company'))}
          className={activeView === 'company' ? 'font-bold text-indigo-700' : ''}
        >
          Post Job
        </button>
        <button
          type="button"
          onClick={() => setActiveView('pricing')}
          className={activeView === 'pricing' ? 'font-bold text-indigo-700' : ''}
        >
          Pricing
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1">
        {activeView === 'candidate' && candidate && (
          <CandidatePortal
            candidate={candidate}
            applications={applications}
            alerts={alerts}
            onSaveProfile={handleSaveCandidateProfile}
            onUploadResume={handleUploadCandidateResume}
            onRemoveResume={handleRemoveCandidateResume}
            onDownloadSelfResume={() =>
              handleDownloadResume(candidate.id, candidate.resumeFileName || 'resume.pdf')
            }
            onSyncAlerts={handleSyncAlerts}
            onMarkAlertsRead={handleMarkAlertsRead}
            onOpenJobFromAlert={(jobId) => {
              const target = jobs.find((j) => j.id === jobId);
              if (target) setSelectedJob(target);
            }}
            onJoinInterview={(app) => {
              setActiveInterviewApp(app);
              setActiveView('interview');
            }}
            onBrowseJobs={() => setActiveView('jobs')}
          />
        )}

        {activeView === 'company' && company && (
          <CompanyPortal
            company={company}
            companyJobs={companyJobs}
            applications={applications}
            invoices={invoices}
            onPostJob={handlePostJob}
            onScheduleInterview={handleScheduleInterview}
            onJoinInterview={(app) => {
              setActiveInterviewApp(app);
              setActiveView('interview');
            }}
            onDownloadResume={(app) =>
              handleDownloadResume(app.candidateId, app.candidateResumeFile || 'candidate-resume.pdf')
            }
          />
        )}

        {activeView === 'interview' && (
          <OnlineInterviewRoom
            application={activeInterviewApp}
            viewerRole={userRole}
            onSubmitOutcome={handleSubmitOutcome}
            onExit={() =>
              setActiveView(userRole === 'company' ? 'company' : userRole === 'candidate' ? 'candidate' : 'jobs')
            }
          />
        )}

        {activeView === 'pricing' && (
          <PricingSection
            onCandidateStart={() => openAuth('candidate')}
            onCompanyStart={() => openAuth('company')}
          />
        )}

        {activeView === 'jobs' && (
          <>
            {/* Hero Section (2-Column Balanced Split + Full-Width Proof Strip Below) */}
            <section className="border-b border-slate-200 bg-white">
              <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
                <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
                  <div className="flex flex-col justify-center lg:col-span-6">
                    <p className="text-xs font-semibold text-indigo-700">
                      India&apos;s Transparent Private Sector Job Portal · Founded &amp; Owned by Waris Sabri
                    </p>
                    <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-balance leading-[1.1]">
                      Know salary, shift timetable &amp; post before you apply.
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                      Immediate BPO, IT, Banking, Retail &amp; Logistics openings from GSTIN-verified companies. Candidates sign in free with Mobile or Email OTP and interview online from home.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (userRole === 'candidate') {
                            setActiveView('candidate');
                          } else {
                            openAuth('candidate');
                          }
                        }}
                        className="rounded-lg bg-indigo-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 whitespace-nowrap"
                      >
                        {userRole === 'candidate' ? 'Update Resume & Match Profile' : 'Candidate OTP Login (₹0 Free)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (userRole === 'company') {
                            setActiveView('company');
                          } else {
                            openAuth('company');
                          }
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                      >
                        Hire for ₹99 / Post
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-80 lg:h-full">
                      <img
                        src={HERO_IMAGE}
                        alt="Indian private sector professionals collaborating in a bright modern Bengaluru office"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Full-Width 4-Column Proof Strip Directly Below Hero Split */}
                <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 lg:grid-cols-4">
                  <div>
                    <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">₹0</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">
                      Forever free for candidates · Mobile/Email OTP login
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-2xl font-bold text-indigo-700 tabular-nums">₹99</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">
                      Lowest company post charge in India (94% lower)
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">100%</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">
                      Upfront monthly salary, CTC &amp; exact IST timetable
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-2xl font-bold text-emerald-700 tabular-nums">Online</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">
                      Built-in video interviews save commute time &amp; money
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Jobs Search, Sector Filter & Premium Matching Board */}
            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    All Private Sector Jobs ({rankedJobs.length})
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Sorted by JobSarathi Premium Match Algorithm (Skills · Shift Timetable · Expected Pay · City).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMatchTuner((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-700" />
                  {candidate ? 'Active Match Profile' : showMatchTuner ? 'Hide Match Tuner' : 'Customize Match Algorithm'}
                </button>
              </div>

              {/* Interactive Match Algorithm Tuner */}
              {showMatchTuner && !candidate && (
                <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-indigo-200 bg-white p-5 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Your Key Skills</label>
                    <input
                      type="text"
                      value={guestMatchPrefs.skills.join(', ')}
                      onChange={(e) =>
                        setGuestMatchPrefs((p) => ({
                          ...p,
                          skills: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Preferred Timetable</label>
                    <select
                      value={guestMatchPrefs.preferredShift}
                      onChange={(e) =>
                        setGuestMatchPrefs((p) => ({
                          ...p,
                          preferredShift: e.target.value as ShiftType | 'Any Shift',
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="Any Shift">Any Shift</option>
                      <option value="Day Shift">Day Shift</option>
                      <option value="Night Shift">Night Shift</option>
                      <option value="Rotational Shift">Rotational Shift</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Expected Salary (₹/mo)</label>
                    <input
                      type="number"
                      step={1000}
                      value={guestMatchPrefs.expectedSalary}
                      onChange={(e) =>
                        setGuestMatchPrefs((p) => ({ ...p, expectedSalary: Number(e.target.value) || 0 }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Preferred City</label>
                    <input
                      type="text"
                      value={guestMatchPrefs.city}
                      onChange={(e) => setGuestMatchPrefs((p) => ({ ...p, city: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Search & Filter Controls */}
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="relative md:col-span-5">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search post, skill, BPO, React, company..."
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-700 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <select
                      aria-label="Filter by city"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-700 focus:outline-none"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <select
                      aria-label="Filter by shift timetable"
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value as 'All Shifts' | ShiftType)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-700 focus:outline-none"
                    >
                      <option value="All Shifts">All Shift Timetables</option>
                      <option value="Day Shift">Day Shift Only</option>
                      <option value="Night Shift">Night Shift Only</option>
                      <option value="Rotational Shift">Rotational Shift</option>
                      <option value="Flexible">Flexible / Remote</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2">
                    <select
                      aria-label="Filter by minimum salary"
                      value={minSalaryFilter}
                      onChange={(e) => setMinSalaryFilter(Number(e.target.value))}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-700 focus:outline-none"
                    >
                      <option value={0}>Any Salary</option>
                      <option value={20000}>₹20,000+ / mo</option>
                      <option value={30000}>₹30,000+ / mo</option>
                      <option value={50000}>₹50,000+ / mo</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setImmediateOnly((v) => !v)}
                      className={`rounded-lg border px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        immediateOnly
                          ? 'border-indigo-700 bg-indigo-700 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Immediate Join
                    </button>
                  </div>
                </div>

                {/* Multi-Sector Interactive Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {SECTOR_TABS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSelectedSector(sec)}
                      className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        selectedSector === sec
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Listings Grid */}
              {loadingJobs ? (
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white p-6" />
                  ))}
                </div>
              ) : rankedJobs.length === 0 ? (
                <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
                  <Briefcase className="mx-auto h-9 w-9 text-slate-300" />
                  <h3 className="mt-3 font-display text-lg font-bold text-slate-900">
                    No matching vacancies for this filter
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Try resetting your sector, shift timetable, or city filters to see all immediate openings.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSector('All Sectors');
                      setSelectedShift('All Shifts');
                      setSelectedCity('All India');
                      setImmediateOnly(false);
                      setMinSalaryFilter(0);
                    }}
                    className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {rankedJobs.map(({ job, match }) => {
                    const isApplied = appliedJobIds.has(job.id);
                    return (
                      <article
                        key={job.id}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015] hover:border-indigo-200 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.16)] motion-reduce:transition-none motion-reduce:hover:scale-100"
                      >
                        <div>
                          {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {job.companyName}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{job.sector}</span>
                              <span aria-hidden="true">·</span>
                              <span>{job.city}</span>
                            </div>

                            <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums">
                              {match.score}% Match
                            </span>
                          </div>

                          <h3 className="mt-2 font-display text-lg font-bold text-slate-900 transition-colors duration-200 group-hover:text-indigo-700">
                            {job.postTitle}
                          </h3>

                          <div className="mt-1 text-xs text-slate-500">
                            {job.workMode} · {job.joiningSpeed} · {job.openings} openings ·{' '}
                            {job.experienceMin === 0 ? 'Freshers eligible' : `${job.experienceMin}–${job.experienceMax} yrs exp`}
                          </div>

                          {/* Upfront Salary, Timetable & Skills Row */}
                          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                <IndianRupee className="h-3 w-3 text-emerald-700" />
                                Upfront Monthly Salary
                              </div>
                              <div className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                                {formatINR(job.salaryMin)} – {formatINR(job.salaryMax)}/mo
                              </div>
                              <div className="text-xs text-slate-500">{job.benefits}</div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                <CalendarClock className="h-3 w-3 text-indigo-700" />
                                Fixed Shift Timetable
                              </div>
                              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                                {job.timetable}
                              </div>
                              <div className="text-xs text-slate-500">{job.workingDays}</div>
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-slate-600">
                            Skills: {job.requiredSkills.join(' · ')}
                          </p>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <span className="text-xs text-slate-500">
                            {match.reasons.join(' · ')}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleShareJob(job)}
                              aria-label={`Copy link for ${job.postTitle}`}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                copiedJobId === job.id
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {copiedJobId === job.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Share2 className="h-3.5 w-3.5" />
                                  Share
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedJob(job)}
                              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                            >
                              Full Details
                            </button>

                            {userRole !== 'company' &&
                              (isApplied ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => applyForJob(job)}
                                  disabled={applyingJobId === job.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60 whitespace-nowrap"
                                >
                                  {applyingJobId === job.id ? 'Applying...' : 'Apply Free'}
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </button>
                              ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Immediate BPO + Built-In Online Video Interview Showcase */}
            <section className="border-t border-slate-200 bg-white">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <div className="h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-80 lg:h-full">
                      <img
                        src={BPO_HUB_IMAGE}
                        alt="Modern Indian BPO and customer operations floor"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center lg:col-span-6">
                    <p className="text-xs font-semibold text-indigo-700">
                      Immediate BPO &amp; Multi-Sector Hiring + Online Video Studio
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
                      Save travel fare and days of waiting with built-in online interviews.
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      Both candidates and verified HR teams meet directly inside the JobSarathi Online Video Room. Upfront salary, shift timing, and resume details stay visible side-by-side so hiring decisions happen in minutes.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInterviewApp(applications.find((a) => a.interview) || null);
                          setActiveView('interview');
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Video className="h-4 w-4" />
                        Open Online Interview Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSector('BPO & Customer Support');
                          setImmediateOnly(true);
                          window.scrollTo({ top: 450, behavior: 'smooth' });
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                      >
                        View Immediate BPO Jobs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Lowest Charges Pricing Section */}
            <div className="border-t border-slate-200 bg-slate-50">
              <PricingSection
                onCandidateStart={() => openAuth('candidate')}
                onCompanyStart={() => openAuth('company')}
              />
            </div>

            {/* Candidate Trust FAQ Section */}
            <FaqSection
              onCandidateStart={() => openAuth('candidate')}
              onCompanyStart={() => openAuth('company')}
            />
          </>
        )}
      </main>

      {/* Quiet Footer with Unique Owner Seal */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-8 text-xs text-slate-500 lg:flex-row lg:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <SafalLogo size={26} showOwner />
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>Private Sector Jobs Across India · Zero Candidate Fee Guarantee</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-medium text-slate-600">
            <button type="button" onClick={() => setActiveView('jobs')} className="hover:text-slate-900">
              Browse Jobs
            </button>
            <button type="button" onClick={() => openAuth('candidate')} className="hover:text-slate-900">
              Candidate OTP Login
            </button>
            <button type="button" onClick={() => openAuth('company')} className="hover:text-slate-900">
              Verified Company KYC
            </button>
            <button type="button" onClick={() => setActiveView('pricing')} className="hover:text-slate-900">
              Pricing (₹0 / ₹99)
            </button>
          </div>

          <OwnerSignatureSeal />
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingApplyJob(null);
        }}
        onCandidateSuccess={handleCandidateAuthSuccess}
        onCompanySuccess={handleCompanyAuthSuccess}
      />

      <JobDetailModal
        job={selectedJob}
        allJobs={jobs}
        candidate={candidate}
        authToken={authToken}
        matchProfile={activeMatchProfile}
        match={selectedJob ? computeMatchScore(activeMatchProfile, selectedJob) : null}
        alreadyApplied={selectedJob ? appliedJobIds.has(selectedJob.id) : false}
        applying={selectedJob ? applyingJobId === selectedJob.id : false}
        isCompanyUser={userRole === 'company'}
        quickApplyEnabled={quickApplyEnabled}
        onToggleQuickApply={setQuickApplyEnabled}
        onOpenCandidatePortal={() => {
          setSelectedJob(null);
          setActiveView('candidate');
        }}
        onClose={() => setSelectedJob(null)}
        onApply={(job) => applyForJob(job)}
      />
    </div>
  );
}
