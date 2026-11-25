import React, { useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, FileText, Mail, Phone, Plus, Video, X } from 'lucide-react';
import { formatINR } from '../shared/matching';
import type { CandidateProfile, JobAlertNotification, JobApplication, Sector, ShiftType, WorkMode } from '../shared/types';
import { ResumeUploadCard } from './ResumeUploadCard';
import { InterviewAvailabilityCalendar } from './InterviewAvailabilityCalendar';

interface CandidatePortalProps {
  candidate: CandidateProfile;
  applications: JobApplication[];
  alerts: JobAlertNotification[];
  onSaveProfile: (updated: Partial<CandidateProfile>) => Promise<boolean>;
  onUploadResume: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onRemoveResume: () => Promise<boolean>;
  onDownloadSelfResume: () => Promise<void>;
  onSyncAlerts: () => Promise<void>;
  onMarkAlertsRead: () => Promise<void>;
  onOpenJobFromAlert: (jobId: string) => void;
  onJoinInterview: (application: JobApplication) => void;
  onBrowseJobs: () => void;
}

const SECTORS: Array<Sector | 'Any Sector'> = [
  'Any Sector',
  'BPO & Customer Support',
  'IT & Software',
  'Banking & Finance',
  'Sales & Retail',
  'Logistics & Operations',
  'Healthcare & Pharma',
  'Manufacturing & Engineering',
  'EdTech & Training',
];

const QUICK_SKILLS = [
  'Customer Support',
  'Voice Process',
  'English Communication',
  'Hindi Communication',
  'CRM',
  'MS Excel',
  'React',
  'TypeScript',
  'Node.js',
  'SQL',
  'Sales',
  'KYC Verification',
  'Tally',
  'Data Entry',
];

export const CandidatePortal: React.FC<CandidatePortalProps> = ({
  candidate,
  applications,
  alerts,
  onSaveProfile,
  onUploadResume,
  onRemoveResume,
  onDownloadSelfResume,
  onSyncAlerts,
  onMarkAlertsRead,
  onOpenJobFromAlert,
  onJoinInterview,
  onBrowseJobs,
}) => {
  const [fullName, setFullName] = useState(candidate.fullName);
  const [mobile, setMobile] = useState(candidate.mobile);
  const [email, setEmail] = useState(candidate.email);
  const [city, setCity] = useState(candidate.city);
  const [preferredSector, setPreferredSector] = useState<CandidateProfile['preferredSector']>(
    candidate.preferredSector
  );
  const [preferredShift, setPreferredShift] = useState<CandidateProfile['preferredShift']>(
    candidate.preferredShift
  );
  const [workModePreference, setWorkModePreference] = useState<CandidateProfile['workModePreference']>(
    candidate.workModePreference
  );
  const [experienceYears, setExperienceYears] = useState(candidate.experienceYears);
  const [expectedSalary, setExpectedSalary] = useState(candidate.expectedSalary);
  const [skills, setSkills] = useState<string[]>(candidate.skills);
  const [newSkill, setNewSkill] = useState('');
  const [resumeSummary, setResumeSummary] = useState(candidate.resumeSummary);
  const [jobAlertsEnabled, setJobAlertsEnabled] = useState<boolean>(Boolean(candidate.jobAlertsEnabled));
  const [jobAlertChannels, setJobAlertChannels] = useState<Array<'email' | 'sms'>>(
    candidate.jobAlertChannels && candidate.jobAlertChannels.length > 0
      ? candidate.jobAlertChannels
      : candidate.authChannel === 'email'
      ? ['email']
      : ['sms', 'email']
  );
  const [togglingAlerts, setTogglingAlerts] = useState(false);
  const [interviewBusySlots, setInterviewBusySlots] = useState<string[]>(
    candidate.interviewBusySlots || []
  );
  const [interviewAvailabilityNote, setInterviewAvailabilityNote] = useState<string>(
    candidate.interviewAvailabilityNote || ''
  );
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  const handleAddSkill = (skillToAdd: string) => {
    const clean = skillToAdd.trim();
    if (!clean) return;
    if (!skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkills((prev) => [...prev, clean]);
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleToggleJobAlerts = async () => {
    const nextEnabled = !jobAlertsEnabled;
    setJobAlertsEnabled(nextEnabled);
    setTogglingAlerts(true);
    setSavedNotice('');
    const ok = await onSaveProfile({
      preferredSector,
      city,
      expectedSalary,
      jobAlertsEnabled: nextEnabled,
      jobAlertChannels,
    });
    setTogglingAlerts(false);
    if (ok) {
      setSavedNotice(
        nextEnabled
          ? 'Job Alerts enabled. You will be notified when new jobs match your sector, city, or salary.'
          : 'Job Alerts paused.'
      );
    }
  };

  const handleToggleChannel = async (channel: 'email' | 'sms') => {
    const exists = jobAlertChannels.includes(channel);
    if (exists && jobAlertChannels.length === 1) return; // keep at least one channel selected
    const nextChannels = exists
      ? jobAlertChannels.filter((c) => c !== channel)
      : [...jobAlertChannels, channel];
    setJobAlertChannels(nextChannels);
    if (jobAlertsEnabled) {
      await onSaveProfile({ jobAlertsEnabled, jobAlertChannels: nextChannels });
    }
  };

  const handleChangeBusySlots = async (nextBusySlots: string[]) => {
    setInterviewBusySlots(nextBusySlots);
    setSavingAvailability(true);
    await onSaveProfile({
      interviewBusySlots: nextBusySlots,
      interviewAvailabilityNote,
    });
    setSavingAvailability(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice('');
    const ok = await onSaveProfile({
      fullName,
      mobile,
      email,
      city,
      preferredSector,
      preferredShift,
      workModePreference,
      experienceYears,
      expectedSalary,
      skills,
      resumeFileName: candidate.resumeFileName,
      resumeSummary,
      jobAlertsEnabled,
      jobAlertChannels,
      interviewBusySlots,
      interviewAvailabilityNote,
    });
    setSaving(false);
    if (ok) {
      setSavedNotice('Profile, resume, alert & availability preferences saved. Match scores updated immediately.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            OTP Verified Candidate · ₹0 Free Forever
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {fullName ? `Welcome, ${fullName}` : 'Your Candidate Resume & Match Profile'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Update your skills, preferred shift timetable, and expected monthly salary to unlock precision match scores.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowseJobs}
          className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 whitespace-nowrap"
        >
          Browse Matched Jobs
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left 7 Cols: Resume & Preferences Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-display text-lg font-bold text-slate-900">
              01. Resume &amp; Personal Details
            </h2>
            <span className="text-xs font-medium text-slate-500">OTP: {candidate.identifier}</span>
          </div>

          {savedNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Current City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Gurugram, Bengaluru, Pune"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-display text-base font-bold text-slate-900">
              02. Shift Timetable, Salary &amp; Sector Preferences
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Preferred Sector</label>
                <select
                  value={preferredSector}
                  onChange={(e) => setPreferredSector(e.target.value as CandidateProfile['preferredSector'])}
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
                <label className="block text-xs font-semibold text-slate-700">Preferred Shift Timetable</label>
                <select
                  value={preferredShift}
                  onChange={(e) => setPreferredShift(e.target.value as ShiftType | 'Any Shift')}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                >
                  <option value="Any Shift">Any Shift Timetable</option>
                  <option value="Day Shift">Day Shift (Morning / Fixed Day)</option>
                  <option value="Night Shift">Night Shift (International BPO + Cab)</option>
                  <option value="Rotational Shift">Rotational Shift</option>
                  <option value="Flexible">Flexible / Work From Home</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Expected Monthly Salary (₹)</label>
                <input
                  type="number"
                  min={8000}
                  max={500000}
                  step={1000}
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-indigo-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-indigo-700 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Work Mode Preference</label>
                <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
                  {(['Any', 'On-site', 'Hybrid', 'Remote'] as Array<WorkMode | 'Any'>).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWorkModePreference(mode)}
                      className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        workModePreference === mode
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-xs font-semibold text-slate-700">Your Skills (Used by Matching Algorithm)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
                >
                  <span>{skill}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(newSkill);
                  }
                }}
                placeholder="Add a skill (e.g. Voice Process, React, Tally)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(newSkill)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK_SKILLS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddSkill(s)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <ResumeUploadCard
              candidate={candidate}
              onUploadResume={onUploadResume}
              onRemoveResume={onRemoveResume}
              onDownloadSelfResume={onDownloadSelfResume}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Candidate Bio &amp; Experience Summary
              </label>
              <textarea
                rows={3}
                value={resumeSummary}
                onChange={(e) => setResumeSummary(e.target.value)}
                placeholder="Write a brief summary of your experience, languages spoken (Hindi/English/Regional), and availability..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
              />
            </div>
          </div>

          {/* 03. Instant Job Alerts Opt-in Toggle */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
                  <Bell className="h-4 w-4 text-indigo-700" />
                  03. Instant Job Alerts (Email / SMS)
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Receive notifications when new verified jobs match your preferred sector ({preferredSector}), city ({city || 'India'}), or target pay ({formatINR(expectedSalary)}+/mo).
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={jobAlertsEnabled}
                aria-label="Toggle Email and SMS Job Alerts"
                disabled={togglingAlerts}
                onClick={handleToggleJobAlerts}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
                  jobAlertsEnabled ? 'bg-indigo-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                    jobAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleChannel('sms')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  jobAlertChannels.includes('sms')
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                SMS Alerts {mobile ? `(${mobile})` : ''}
              </button>

              <button
                type="button"
                onClick={() => handleToggleChannel('email')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  jobAlertChannels.includes('email')
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Email Alerts {email ? `(${email})` : ''}
              </button>
            </div>
          </div>

          {/* 04. Visual Interview Availability Calendar */}
          <div className="border-t border-slate-100 pt-5">
            <InterviewAvailabilityCalendar
              mode="candidate"
              busySlots={interviewBusySlots}
              availabilityNote={interviewAvailabilityNote}
              onChangeBusySlots={handleChangeBusySlots}
              onChangeAvailabilityNote={setInterviewAvailabilityNote}
              saving={savingAvailability}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
          >
            {saving ? 'Saving Profile...' : 'Save Resume & Refresh Match Scores'}
          </button>
        </form>

        {/* Right 5 Cols: Applied Jobs & Online Interviews */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                My Applications &amp; Online Interviews
              </h2>
              <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                {applications.length} Total
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-800">No job applications yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Apply free to any verified job with upfront salary and shift timetable.
                </p>
                <button
                  type="button"
                  onClick={onBrowseJobs}
                  className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Explore Live Vacancies
                </button>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{app.jobTitle}</h3>
                        <p className="text-xs text-slate-600">
                          {app.companyName} · <span className="font-mono tabular-nums">{app.salaryDisplay}</span>
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums">
                        {app.matchScore}% Match
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{app.timetableDisplay}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          app.status === 'Selected'
                            ? 'text-emerald-700'
                            : app.status === 'Interview Scheduled'
                            ? 'text-indigo-700'
                            : 'text-slate-600'
                        }`}
                      >
                        Status: {app.status}
                      </span>

                      {app.interview && (
                        <button
                          type="button"
                          onClick={() => onJoinInterview(app)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join Online Interview ({app.interview.scheduledTime})
                        </button>
                      )}
                    </div>

                    {app.interview?.feedback && (
                      <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        Interviewer note: {app.interview.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matched Job Alerts Feed */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Job Alerts Inbox ({alerts.filter((a) => !a.read).length} Unread)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {jobAlertsEnabled
                    ? `Active via ${jobAlertChannels.map((c) => c.toUpperCase()).join(' + ')}`
                    : 'Turn on the Job Alerts switch to receive matching updates'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {jobAlertsEnabled && (
                  <button
                    type="button"
                    onClick={onSyncAlerts}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Check Matches
                  </button>
                )}
                {alerts.some((a) => !a.read) && (
                  <button
                    type="button"
                    onClick={onMarkAlertsRead}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="py-7 text-center">
                <Bell className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-medium text-slate-700">
                  {jobAlertsEnabled
                    ? 'No unread alerts yet. Click "Check Matches" or wait for new verified postings.'
                    : 'Enable Job Alerts on the left to start receiving SMS & Email match notifications.'}
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenJobFromAlert(alert.jobId)}
                        className="text-left text-sm font-bold text-slate-900 hover:text-indigo-700"
                      >
                        {alert.jobTitle}
                      </button>
                      {!alert.read && (
                        <span className="shrink-0 font-mono text-[11px] font-bold text-indigo-700">New</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {alert.companyName} · <span className="font-mono tabular-nums">{alert.salaryDisplay}</span> ·{' '}
                      {alert.city}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Matched: {alert.matchedCriteria.join(' · ')} · Sent via{' '}
                      {alert.channels.map((c) => c.toUpperCase()).join(' & ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900">Your Match Readiness</h3>
            <p className="mt-1 text-xs text-slate-600">
              Target pay <span className="font-mono font-semibold text-slate-900">{formatINR(expectedSalary)}/mo</span> ·{' '}
              {preferredShift} · {skills.length} skills indexed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
