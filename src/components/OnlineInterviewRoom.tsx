import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  ShieldCheck,
  UserCheck,
  Video,
  VideoOff,
} from 'lucide-react';
import type { JobApplication } from '../shared/types';

interface OnlineInterviewRoomProps {
  application: JobApplication | null;
  viewerRole: 'candidate' | 'company' | 'guest';
  onSubmitOutcome?: (
    applicationId: string,
    outcome: 'Selected' | 'Next Round' | 'On Hold' | 'Rejected',
    feedback: string
  ) => Promise<boolean>;
  onExit: () => void;
}

const INTERVIEWER_IMAGE = '/src/assets/images/interview_studio_preview_1795503677343.jpg';

const DEFAULT_SAMPLE_INTERVIEW: JobApplication = {
  id: 'sample-room',
  jobId: 'job-bpo-voice-01',
  jobTitle: 'Customer Support Executive (Domestic Voice)',
  companyId: 'comp-meridian-bpo',
  companyName: 'Meridian CX India',
  salaryDisplay: '₹21,000 – ₹28,000/mo',
  timetableDisplay: '09:30 AM – 06:30 PM IST · Fixed Day (Sunday Off)',
  candidateId: 'sample-cand',
  candidateName: 'Sample Candidate (Demo Studio)',
  candidateIdentifier: '+91 98XXXXXX10',
  candidateCity: 'Gurugram',
  candidateExperience: 1,
  candidateSkills: ['Customer Support', 'Hindi Communication', 'English Communication', 'CRM'],
  candidateResumeFile: 'Resume_Sample.pdf',
  candidateResumeSummary:
    '1 year inbound customer support experience handling order tracking and billing queries with 96% CSAT.',
  matchScore: 94,
  matchReasons: ['4/5 key skills matched', 'Day Shift timetable match', 'Meets ₹22,000/mo pay'],
  status: 'Interview Scheduled',
  appliedAt: new Date().toISOString(),
  interview: {
    roomCode: 'SJ-DEMO-01',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: 'Live Studio',
    durationMins: 20,
    interviewerName: 'Ananya Deshmukh (Talent Lead)',
    notes: 'Direct online interview saving travel fare and 3+ hours of commute time.',
  },
};

export const OnlineInterviewRoom: React.FC<OnlineInterviewRoomProps> = ({
  application,
  viewerRole,
  onSubmitOutcome,
  onExit,
}) => {
  const activeApp = application || DEFAULT_SAMPLE_INTERVIEW;
  const isSample = !application;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [callActive, setCallActive] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaStatus, setMediaStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: activeApp.interview?.interviewerName || 'Hiring Manager',
      text: `Welcome to JobSarathi Online Interview Studio. Role: ${activeApp.jobTitle} (${activeApp.salaryDisplay}, ${activeApp.timetableDisplay}).`,
      time: 'Now',
    },
  ]);

  const [checkedQuestions, setCheckedQuestions] = useState<number[]>([0]);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [outcomeSaved, setOutcomeSaved] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function initMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMediaStatus('fallback');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setMediaStatus('connected');
      } catch {
        setMediaStatus('fallback');
      }
    }
    initMedia();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!callActive) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callActive]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
  };

  const handleEndCall = () => {
    setCallActive(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onExit();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        sender: viewerRole === 'company' ? 'Employer Panel' : activeApp.candidateName,
        text: chatInput.trim(),
        time: formatDuration(elapsedSeconds),
      },
    ]);
    setChatInput('');
  };

  const handleOutcome = async (outcome: 'Selected' | 'Next Round' | 'On Hold') => {
    if (!onSubmitOutcome || isSample) {
      setOutcomeSaved(`Demo recorded: ${outcome}`);
      return;
    }
    setSavingOutcome(true);
    const ok = await onSubmitOutcome(activeApp.id, outcome, outcomeNotes || `Evaluated during online video round.`);
    setSavingOutcome(false);
    if (ok) {
      setOutcomeSaved(`Candidate marked as ${outcome}`);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const questions = [
    'Confirm availability for the fixed shift timetable & weekly off schedule.',
    'Confirm acceptance of upfront monthly salary band & joining date.',
    'Walk through relevant customer handling / technical project experience.',
    'Quick language clarity & problem-solving scenario check (2 mins).',
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Zero Travel Cost · Online Video Room
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-slate-800">
              Room {activeApp.interview?.roomCode || 'SJ-LIVE'}
            </span>
            {isSample && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-indigo-700 font-medium">Interactive Preview Mode</span>
              </>
            )}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
            {activeApp.jobTitle} — {activeApp.companyName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-mono text-sm font-bold text-slate-900 tabular-nums">
            {formatDuration(elapsedSeconds)}
          </div>
          <button
            type="button"
            onClick={handleEndCall}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <PhoneOff className="h-4 w-4" />
            Leave Room
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: Video Stage + Controls */}
        <div className="space-y-4 lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Remote Participant Panel */}
            <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
              <img
                src={INTERVIEWER_IMAGE}
                alt="Online video interviewer in modern office"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent p-4 text-white">
                <div className="text-xs text-slate-200">Hiring Manager</div>
                <div className="text-sm font-bold">
                  {activeApp.interview?.interviewerName || 'Verified HR Panel'}
                </div>
              </div>
            </div>

            {/* Local Camera Stream */}
            <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
              {mediaStatus === 'connected' && camOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full -scale-x-100 object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 p-6 text-center text-slate-200">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-700 font-display text-xl font-bold text-white">
                    {activeApp.candidateName.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="mt-3 text-sm font-semibold">{activeApp.candidateName}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {!camOn
                      ? 'Camera turned off'
                      : mediaStatus === 'fallback'
                      ? 'Camera permission not granted — audio/chat ready'
                      : 'Initializing camera...'}
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-4 text-white">
                <div className="text-xs text-slate-200">You ({viewerRole === 'company' ? 'Employer' : 'Candidate'})</div>
                <div className="text-sm font-bold">
                  {viewerRole === 'company' ? activeApp.companyName : activeApp.candidateName}
                </div>
              </div>
            </div>
          </div>

          {/* Media Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                  micOn
                    ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {micOn ? 'Mic On' : 'Mic Muted'}
              </button>

              <button
                type="button"
                onClick={toggleCam}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                  camOn
                    ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {camOn ? 'Camera On' : 'Camera Off'}
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Saves ~₹400 travel fare &amp; 3 hrs commute for both sides
            </div>
          </div>

          {/* Structured Verification Checklist */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              Transparent Interview Agenda
            </h2>
            <div className="mt-3 space-y-2.5">
              {questions.map((q, idx) => {
                const checked = checkedQuestions.includes(idx);
                return (
                  <label
                    key={q}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 hover:border-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedQuestions((prev) =>
                          prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className={checked ? 'line-through text-slate-400' : 'font-medium text-slate-800'}>
                      {q}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Upfront Job Terms + Resume + Live Chat + Hiring Decision */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Agreed Role Terms</span>
              <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums">
                {activeApp.matchScore}% Match
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <IndianRupee className="h-4 w-4 text-emerald-700 shrink-0" />
              <span className="font-mono tabular-nums">{activeApp.salaryDisplay}</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <CalendarClock className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
              <span>{activeApp.timetableDisplay}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-700">
                Candidate Resume ({activeApp.candidateResumeFile})
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {activeApp.candidateResumeSummary}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                Skills: {activeApp.candidateSkills.join(' · ')}
              </p>
            </div>
          </div>

          {/* Live Room Chat */}
          <div className="flex h-72 flex-col rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-900">
              Interview Room Chat
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{m.sender}</span>
                    <span className="font-mono text-[11px] text-slate-400">{m.time}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{m.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="flex gap-2 border-t border-slate-100 p-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message or link..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-700 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send chat message"
                className="rounded-lg bg-indigo-700 px-3 py-1.5 text-white hover:bg-indigo-800"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Hiring Decision Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <UserCheck className="h-4 w-4 text-indigo-700" />
              <span>{viewerRole === 'company' ? 'Record Hiring Decision' : 'Instant Hiring Outcome'}</span>
            </div>
            {outcomeSaved && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>{outcomeSaved}</span>
              </div>
            )}
            <input
              type="text"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Interviewer remarks (joining date, shift confirmation)..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-700 focus:outline-none"
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={savingOutcome}
                onClick={() => handleOutcome('Selected')}
                className="rounded-lg bg-emerald-700 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                Select
              </button>
              <button
                type="button"
                disabled={savingOutcome}
                onClick={() => handleOutcome('Next Round')}
                className="rounded-lg bg-indigo-700 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                Next Round
              </button>
              <button
                type="button"
                disabled={savingOutcome}
                onClick={() => handleOutcome('On Hold')}
                className="rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                On Hold
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
