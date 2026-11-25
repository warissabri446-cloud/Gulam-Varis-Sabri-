import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { computeMatchScore, formatINR } from './src/shared/matching';
import type {
  BillingInvoice,
  CandidateProfile,
  CompanyAccount,
  JobAlertNotification,
  JobApplication,
  JobPosting,
  Sector,
  ShiftType,
  WorkMode,
  JoiningSpeed,
} from './src/shared/types';
import { createSeedCompanies, hashPassword, SEED_JOBS, verifyPassword, type StoredCompany } from './server/seedData';
import {
  extractCandidateContext,
  GeminiSummaryError,
  generateJobSummaryBullets,
  sanitizeCandidateContext,
} from './server/geminiSummary';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'safaljobs-db.json');
const RESUMES_DIR = path.resolve(DATA_DIR, 'resumes');
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

// Session signing key from env or secure in-memory random fallback
const SESSION_SECRET = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
  ? process.env.SESSION_SECRET
  : crypto.randomBytes(32).toString('hex');

interface StoredCandidate extends CandidateProfile {
  resumeStorageKey?: string;
}

interface DatabaseState {
  candidates: StoredCandidate[];
  companies: StoredCompany[];
  jobs: JobPosting[];
  applications: JobApplication[];
  invoices: BillingInvoice[];
  alerts: JobAlertNotification[];
}

interface OtpChallenge {
  otpHash: string;
  channel: 'mobile' | 'email';
  identifier: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpChallenge>();

function loadDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (Array.isArray(parsed.jobs) && Array.isArray(parsed.companies)) {
        return {
          candidates: parsed.candidates || [],
          companies: parsed.companies || [],
          jobs: parsed.jobs || [],
          applications: parsed.applications || [],
          invoices: parsed.invoices || [],
          alerts: parsed.alerts || [],
        };
      }
    }
  } catch {
    // Recreate clean seed state if file is unreadable
  }

  const initial: DatabaseState = {
    candidates: [],
    companies: createSeedCompanies(),
    jobs: [...SEED_JOBS],
    applications: [],
    invoices: [],
    alerts: [],
  };
  saveDatabase(initial);
  return initial;
}

function saveDatabase(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

let db = loadDatabase();

interface AuthPayload {
  sub: string;
  role: 'candidate' | 'company';
  exp: number;
}

function signToken(sub: string, role: 'candidate' | 'company'): string {
  const payload: AuthPayload = {
    sub,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): AuthPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as AuthPayload;
    if (!parsed.sub || !parsed.role || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

function requireAuth(role?: 'candidate' | 'company') {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const verified = token ? verifyToken(token) : null;
    if (!verified) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    if (role && verified.role !== role) {
      res.status(403).json({ error: `This action requires a ${role} account.` });
      return;
    }
    req.auth = verified;
    next();
  };
}

function sanitizeCompany(c: StoredCompany): CompanyAccount {
  const { passwordHash: _removed, ...safe } = c;
  return safe;
}

function resolveSafeResumePath(storageKey: string): string | null {
  if (!storageKey || !/^[a-zA-Z0-9._-]+$/.test(storageKey)) return null;
  const resolved = path.resolve(RESUMES_DIR, storageKey);
  if (!resolved.startsWith(RESUMES_DIR + path.sep)) return null;
  return resolved;
}

function sanitizeDownloadFileName(rawName: string, fallbackExt: string): string {
  const base = path.basename(rawName || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
  const trimmed = base.slice(0, 100) || `resume${fallbackExt}`;
  return trimmed.toLowerCase().endsWith(fallbackExt) ? trimmed : `${trimmed}${fallbackExt}`;
}

function candidateHasStoredResume(c: StoredCandidate): boolean {
  if (!c.resumeStorageKey) return false;
  const filePath = resolveSafeResumePath(c.resumeStorageKey);
  return Boolean(filePath && fs.existsSync(filePath));
}

function sanitizeCandidate(c: StoredCandidate): CandidateProfile {
  const { resumeStorageKey: _removed, ...safe } = c;
  return {
    ...safe,
    hasResumeFile: candidateHasStoredResume(c),
  };
}

function normalizeIdentifier(raw: string): { valid: boolean; channel: 'mobile' | 'email'; value: string; masked: string } {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[\s\-+]/g, '');
  const indianMobile = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (/^[6-9]\d{9}$/.test(indianMobile)) {
    return {
      valid: true,
      channel: 'mobile',
      value: `+91${indianMobile}`,
      masked: `+91 ${indianMobile.slice(0, 2)}******${indianMobile.slice(-2)}`,
    };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (emailRegex.test(trimmed.toLowerCase()) && trimmed.length <= 120) {
    const lower = trimmed.toLowerCase();
    const [local, domain] = lower.split('@');
    const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : `${local[0]}***`;
    return {
      valid: true,
      channel: 'email',
      value: lower,
      masked: `${maskedLocal}@${domain}`,
    };
  }
  return { valid: false, channel: 'mobile', value: '', masked: '' };
}

function isValidHttpUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidGstin(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
}

function getAlertMatchedCriteria(candidate: CandidateProfile, job: JobPosting): string[] {
  const matched: string[] = [];
  if (candidate.preferredSector === 'Any Sector' || candidate.preferredSector === job.sector) {
    matched.push(`Sector: ${job.sector}`);
  }
  const candCity = (candidate.city || '').trim().toLowerCase();
  const jobCity = job.city.trim().toLowerCase();
  if (
    job.workMode === 'Remote' ||
    !candCity ||
    candCity === 'all india' ||
    jobCity.includes(candCity) ||
    candCity.includes(jobCity)
  ) {
    matched.push(job.workMode === 'Remote' ? 'Remote / Any City' : `City: ${job.city}`);
  }
  if ((candidate.expectedSalary || 0) <= 0 || job.salaryMax >= candidate.expectedSalary) {
    matched.push(`Salary up to ${formatINR(job.salaryMax)}/mo`);
  }
  return matched;
}

function resolveCandidateAlertChannels(candidate: CandidateProfile): Array<'email' | 'sms'> {
  const configured = candidate.jobAlertChannels;
  if (Array.isArray(configured) && configured.length > 0) {
    return configured;
  }
  return candidate.authChannel === 'email' ? ['email'] : ['sms'];
}

function createAlertForCandidate(candidate: CandidateProfile, job: JobPosting, matchedCriteria: string[]): JobAlertNotification {
  return {
    id: `alert-${crypto.randomUUID().slice(0, 8)}`,
    candidateId: candidate.id,
    jobId: job.id,
    jobTitle: job.postTitle,
    companyName: job.companyName,
    salaryDisplay: `${formatINR(job.salaryMin)} – ${formatINR(job.salaryMax)}/mo`,
    city: job.city,
    sector: job.sector,
    channels: resolveCandidateAlertChannels(candidate),
    matchedCriteria,
    sentAt: new Date().toISOString(),
    read: false,
  };
}

function dispatchJobAlertsForNewJob(job: JobPosting): number {
  let count = 0;
  for (const cand of db.candidates) {
    if (!cand.jobAlertsEnabled) continue;
    const criteria = getAlertMatchedCriteria(cand, job);
    if (criteria.length >= 1) {
      const alreadyExists = db.alerts.some((a) => a.candidateId === cand.id && a.jobId === job.id);
      if (!alreadyExists) {
        db.alerts.unshift(createAlertForCandidate(cand, job, criteria));
        count += 1;
      }
    }
  }
  return count;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, jobsCount: db.jobs.length });
  });

  // 1. Public Jobs Feed (with optional matching if authenticated candidate or query preferences provided)
  app.get('/api/jobs', (req, res) => {
    const sector = typeof req.query.sector === 'string' ? req.query.sector : '';
    const shiftType = typeof req.query.shiftType === 'string' ? req.query.shiftType : '';
    const city = typeof req.query.city === 'string' ? req.query.city : '';
    const immediateOnly = req.query.immediateOnly === 'true';
    const minSalary = Number(req.query.minSalary || 0);
    const search = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    let jobs = db.jobs.slice();

    if (sector && sector !== 'All Sectors') {
      jobs = jobs.filter((j) => j.sector === sector);
    }
    if (shiftType && shiftType !== 'All Shifts') {
      jobs = jobs.filter((j) => j.shiftType === shiftType);
    }
    if (city && city !== 'All India') {
      jobs = jobs.filter((j) => j.city.toLowerCase().includes(city.toLowerCase()));
    }
    if (immediateOnly) {
      jobs = jobs.filter((j) => j.joiningSpeed.startsWith('Immediate'));
    }
    if (!Number.isNaN(minSalary) && minSalary > 0) {
      jobs = jobs.filter((j) => j.salaryMax >= minSalary);
    }
    if (search) {
      jobs = jobs.filter(
        (j) =>
          j.postTitle.toLowerCase().includes(search) ||
          j.companyName.toLowerCase().includes(search) ||
          j.sector.toLowerCase().includes(search) ||
          j.city.toLowerCase().includes(search) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(search))
      );
    }

    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ jobs });
  });

  // 1b. Gemini AI "Why this job is for you" 3-Bullet Summary (Server-side Proxy)
  app.post('/api/jobs/:id/summary', async (req, res) => {
    const jobId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    const job = db.jobs.find((j) => j.id === jobId);
    if (!job) {
      res.status(404).json({ error: 'Job posting not found.' });
      return;
    }

    let candidateContext = sanitizeCandidateContext(req.body?.candidateContext);
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const verified = token ? verifyToken(token) : null;
    if (verified?.role === 'candidate') {
      const cand = db.candidates.find((c) => c.id === verified.sub);
      if (cand) {
        candidateContext = extractCandidateContext(cand);
      }
    }

    try {
      const bullets = await generateJobSummaryBullets(job, candidateContext);
      res.json({ bullets, personalized: Boolean(candidateContext) });
    } catch (err) {
      if (err instanceof GeminiSummaryError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(502).json({
        error: 'Unable to generate summary right now. Please try again.',
      });
    }
  });

  // 2. Candidate OTP Request (Mobile Number OR Email ONLY - Free Forever)
  app.post('/api/auth/request-otp', (req, res) => {
    const rawIdentifier = typeof req.body?.identifier === 'string' ? req.body.identifier : '';
    const normalized = normalizeIdentifier(rawIdentifier);
    if (!normalized.valid) {
      res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number or email address.',
      });
      return;
    }

    const otpCode = String(crypto.randomInt(100000, 999999));
    const otpHash = crypto.createHash('sha256').update(`${normalized.value}:${otpCode}`).digest('hex');

    otpStore.set(normalized.value, {
      otpHash,
      channel: normalized.channel,
      identifier: normalized.value,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    res.json({
      sent: true,
      channel: normalized.channel,
      identifier: normalized.value,
      maskedTarget: normalized.masked,
      expiresInSeconds: 300,
      // Returned in sandbox mode when no SMS/SMTP provider is configured so user can verify immediately
      instantOtpCode: otpCode,
    });
  });

  // 3. Candidate OTP Verify -> Returns Bearer Token + Candidate Profile
  app.post('/api/auth/verify-otp', (req, res) => {
    const rawIdentifier = typeof req.body?.identifier === 'string' ? req.body.identifier : '';
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

    const normalized = normalizeIdentifier(rawIdentifier);
    if (!normalized.valid || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: 'Valid mobile/email and 6-digit OTP are required.' });
      return;
    }

    const challenge = otpStore.get(normalized.value);
    if (!challenge || challenge.expiresAt < Date.now()) {
      otpStore.delete(normalized.value);
      res.status(400).json({ error: 'OTP expired or not requested. Please request a new OTP.' });
      return;
    }

    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      otpStore.delete(normalized.value);
      res.status(429).json({ error: 'Too many invalid attempts. Please request a fresh OTP.' });
      return;
    }

    const providedHash = crypto.createHash('sha256').update(`${normalized.value}:${otp}`).digest('hex');
    if (providedHash !== challenge.otpHash) {
      res.status(400).json({ error: 'Incorrect OTP. Please double-check the 6-digit code.' });
      return;
    }

    otpStore.delete(normalized.value);

    let candidate = db.candidates.find((c) => c.identifier === normalized.value);
    if (!candidate) {
      candidate = {
        id: `cand-${crypto.randomUUID().slice(0, 8)}`,
        identifier: normalized.value,
        authChannel: normalized.channel,
        fullName: '',
        mobile: normalized.channel === 'mobile' ? normalized.value : '',
        email: normalized.channel === 'email' ? normalized.value : '',
        city: 'Gurugram',
        preferredSector: 'BPO & Customer Support',
        skills: ['Customer Support', 'English Communication', 'Hindi Communication'],
        experienceYears: 1,
        preferredShift: 'Day Shift',
        expectedSalary: 22000,
        workModePreference: 'Any',
        resumeFileName: '',
        resumeSummary: '',
        jobAlertsEnabled: false,
        jobAlertChannels: normalized.channel === 'email' ? ['email'] : ['sms', 'email'],
        updatedAt: new Date().toISOString(),
      };
      db.candidates.push(candidate);
      saveDatabase(db);
    }

    const token = signToken(candidate.id, 'candidate');
    res.json({ token, role: 'candidate', candidate: sanitizeCandidate(candidate) });
  });

  // 4. Candidate Session Profile Read & Update
  app.get('/api/candidate/profile', requireAuth('candidate'), (req: AuthedRequest, res) => {
    const candidate = db.candidates.find((c) => c.id === req.auth!.sub);
    if (!candidate) {
      res.status(404).json({ error: 'Candidate profile not found.' });
      return;
    }
    res.json({ candidate: sanitizeCandidate(candidate) });
  });

  app.put('/api/candidate/profile', requireAuth('candidate'), (req: AuthedRequest, res) => {
    const idx = db.candidates.findIndex((c) => c.id === req.auth!.sub);
    if (idx === -1) {
      res.status(404).json({ error: 'Candidate profile not found.' });
      return;
    }

    const body = req.body || {};
    const current = db.candidates[idx];
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 80) : current.fullName;
    const mobile = typeof body.mobile === 'string' ? body.mobile.trim().slice(0, 20) : current.mobile;
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 120) : current.email;
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 60) : current.city;
    const preferredSector = (typeof body.preferredSector === 'string' ? body.preferredSector : current.preferredSector) as CandidateProfile['preferredSector'];
    const preferredShift = (typeof body.preferredShift === 'string' ? body.preferredShift : current.preferredShift) as CandidateProfile['preferredShift'];
    const workModePreference = (typeof body.workModePreference === 'string' ? body.workModePreference : current.workModePreference) as CandidateProfile['workModePreference'];
    const experienceYears = Math.max(0, Math.min(35, Number(body.experienceYears ?? current.experienceYears) || 0));
    const expectedSalary = Math.max(0, Math.min(1000000, Number(body.expectedSalary ?? current.expectedSalary) || 0));
    const skills = Array.isArray(body.skills)
      ? body.skills
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim().slice(0, 40))
          .slice(0, 20)
      : current.skills;
    const resumeFileName = typeof body.resumeFileName === 'string' ? body.resumeFileName.trim().slice(0, 120) : current.resumeFileName;
    const resumeSummary = typeof body.resumeSummary === 'string' ? body.resumeSummary.trim().slice(0, 2000) : current.resumeSummary;
    const jobAlertsEnabled =
      typeof body.jobAlertsEnabled === 'boolean' ? body.jobAlertsEnabled : Boolean(current.jobAlertsEnabled);
    const jobAlertChannels: Array<'email' | 'sms'> = Array.isArray(body.jobAlertChannels)
      ? body.jobAlertChannels.filter((ch: unknown): ch is 'email' | 'sms' => ch === 'email' || ch === 'sms')
      : current.jobAlertChannels || ['sms', 'email'];
    const interviewBusySlots: string[] = Array.isArray(body.interviewBusySlots)
      ? body.interviewBusySlots
          .filter(
            (slot: unknown): slot is string =>
              typeof slot === 'string' && /^\d{4}-\d{2}-\d{2}\|[A-Za-z0-9: ]{3,24}$/.test(slot)
          )
          .slice(0, 70)
      : current.interviewBusySlots || [];
    const interviewAvailabilityNote =
      typeof body.interviewAvailabilityNote === 'string'
        ? body.interviewAvailabilityNote.trim().slice(0, 200)
        : current.interviewAvailabilityNote || '';

    const updated: StoredCandidate = {
      ...current,
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
      resumeFileName,
      resumeSummary,
      jobAlertsEnabled,
      jobAlertChannels: jobAlertChannels.length > 0 ? jobAlertChannels : ['sms'],
      interviewBusySlots,
      interviewAvailabilityNote,
      updatedAt: new Date().toISOString(),
    };

    db.candidates[idx] = updated;

    // When job alerts are active, generate matching alert notifications for top matching jobs not yet alerted
    if (updated.jobAlertsEnabled) {
      let added = 0;
      for (const job of db.jobs) {
        if (added >= 3) break;
        const criteria = getAlertMatchedCriteria(updated, job);
        if (criteria.length >= 2) {
          const exists = db.alerts.some((a) => a.candidateId === updated.id && a.jobId === job.id);
          if (!exists) {
            db.alerts.unshift(createAlertForCandidate(updated, job, criteria));
            added += 1;
          }
        }
      }
    }

    saveDatabase(db);
    const alerts = db.alerts.filter((a) => a.candidateId === updated.id);
    res.json({ candidate: sanitizeCandidate(updated), alerts });
  });

  // 4a. Candidate Resume File Upload (PDF or DOCX, max 5 MB) & Removal
  app.post(
    '/api/candidate/resume',
    requireAuth('candidate'),
    express.json({ limit: '8mb' }),
    (req: AuthedRequest, res) => {
      const idx = db.candidates.findIndex((c) => c.id === req.auth!.sub);
      if (idx === -1) {
        res.status(404).json({ error: 'Candidate profile not found.' });
        return;
      }

      const rawName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
      const rawContent = typeof req.body?.contentBase64 === 'string' ? req.body.contentBase64.trim() : '';
      if (!rawName || !rawContent) {
        res.status(400).json({ error: 'Resume file name and binary content are required.' });
        return;
      }

      const ext = path.extname(rawName).toLowerCase();
      if (ext !== '.pdf' && ext !== '.docx') {
        res.status(400).json({ error: 'Only PDF (.pdf) or Word (.docx) resume files are supported.' });
        return;
      }

      const base64Payload = rawContent.includes(',') ? rawContent.split(',').pop() || '' : rawContent;
      const fileBuffer = Buffer.from(base64Payload, 'base64');
      if (fileBuffer.length === 0) {
        res.status(400).json({ error: 'Uploaded resume file appears empty or corrupted.' });
        return;
      }
      if (fileBuffer.length > MAX_RESUME_BYTES) {
        res.status(413).json({ error: 'Resume file size must be 5 MB or smaller.' });
        return;
      }

      // Verify binary magic header matches declared PDF or DOCX extension
      const isPdfMagic =
        fileBuffer.length >= 5 &&
        fileBuffer[0] === 0x25 &&
        fileBuffer[1] === 0x50 &&
        fileBuffer[2] === 0x44 &&
        fileBuffer[3] === 0x46 &&
        fileBuffer[4] === 0x2d; // %PDF-
      const isDocxMagic =
        fileBuffer.length >= 4 &&
        fileBuffer[0] === 0x50 &&
        fileBuffer[1] === 0x4b &&
        fileBuffer[2] === 0x03 &&
        fileBuffer[3] === 0x04; // PK.. (OOXML ZIP container)

      if ((ext === '.pdf' && !isPdfMagic) || (ext === '.docx' && !isDocxMagic)) {
        res.status(400).json({
          error: `File contents do not match a valid ${ext.toUpperCase()} document.`,
        });
        return;
      }

      if (!fs.existsSync(RESUMES_DIR)) {
        fs.mkdirSync(RESUMES_DIR, { recursive: true });
      }

      const current = db.candidates[idx];
      if (current.resumeStorageKey) {
        const prevPath = resolveSafeResumePath(current.resumeStorageKey);
        if (prevPath && fs.existsSync(prevPath)) {
          try {
            fs.unlinkSync(prevPath);
          } catch {
            // ignore cleanup failure
          }
        }
      }

      const storageKey = `${current.id}-${crypto.randomUUID()}${ext}`;
      const targetPath = resolveSafeResumePath(storageKey);
      if (!targetPath) {
        res.status(400).json({ error: 'Could not resolve safe resume storage path.' });
        return;
      }

      fs.writeFileSync(targetPath, fileBuffer);

      const safeDisplayName = sanitizeDownloadFileName(rawName, ext);
      const mimeType =
        ext === '.pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const uploadedAt = new Date().toISOString();

      const updated: StoredCandidate = {
        ...current,
        resumeFileName: safeDisplayName,
        resumeMimeType: mimeType,
        resumeSizeBytes: fileBuffer.length,
        resumeUploadedAt: uploadedAt,
        resumeStorageKey: storageKey,
        updatedAt: uploadedAt,
      };
      db.candidates[idx] = updated;

      // Sync existing applications so recruiters immediately see the newly uploaded resume
      db.applications = db.applications.map((appItem) =>
        appItem.candidateId === updated.id
          ? {
              ...appItem,
              candidateResumeFile: safeDisplayName,
              candidateResumeAvailable: true,
            }
          : appItem
      );

      saveDatabase(db);
      res.status(201).json({ candidate: sanitizeCandidate(updated) });
    }
  );

  app.delete('/api/candidate/resume', requireAuth('candidate'), (req: AuthedRequest, res) => {
    const idx = db.candidates.findIndex((c) => c.id === req.auth!.sub);
    if (idx === -1) {
      res.status(404).json({ error: 'Candidate profile not found.' });
      return;
    }

    const current = db.candidates[idx];
    if (current.resumeStorageKey) {
      const targetPath = resolveSafeResumePath(current.resumeStorageKey);
      if (targetPath && fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // ignore
        }
      }
    }

    const updated: StoredCandidate = {
      ...current,
      resumeFileName: '',
      resumeMimeType: undefined,
      resumeSizeBytes: undefined,
      resumeUploadedAt: undefined,
      resumeStorageKey: undefined,
      updatedAt: new Date().toISOString(),
    };
    db.candidates[idx] = updated;

    db.applications = db.applications.map((appItem) =>
      appItem.candidateId === updated.id
        ? {
            ...appItem,
            candidateResumeFile: 'JobSarathi Profile Resume',
            candidateResumeAvailable: false,
          }
        : appItem
    );

    saveDatabase(db);
    res.json({ candidate: sanitizeCandidate(updated) });
  });

  // Authorized Resume Download for Candidate (self) or Verified Recruiter (applicant relationship)
  app.get('/api/resumes/candidate/:candidateId', requireAuth(), (req: AuthedRequest, res) => {
    const targetCandidateId = typeof req.params.candidateId === 'string' ? req.params.candidateId : '';
    const isSelf = req.auth!.role === 'candidate' && req.auth!.sub === targetCandidateId;
    const isAuthorizedRecruiter =
      req.auth!.role === 'company' &&
      db.applications.some((a) => a.candidateId === targetCandidateId && a.companyId === req.auth!.sub);

    if (!isSelf && !isAuthorizedRecruiter) {
      res.status(403).json({ error: 'You are not authorized to download this resume.' });
      return;
    }

    const candidate = db.candidates.find((c) => c.id === targetCandidateId);
    if (!candidate || !candidate.resumeStorageKey) {
      res.status(404).json({ error: 'No uploaded PDF or DOCX resume found for this candidate.' });
      return;
    }

    const resolvedPath = resolveSafeResumePath(candidate.resumeStorageKey);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      res.status(404).json({ error: 'Resume file is no longer available on the server.' });
      return;
    }

    const ext = path.extname(candidate.resumeStorageKey).toLowerCase() === '.docx' ? '.docx' : '.pdf';
    const downloadName = sanitizeDownloadFileName(candidate.resumeFileName || `resume${ext}`, ext);
    const mimeType =
      candidate.resumeMimeType ||
      (ext === '.pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolvedPath);
  });

  // 4b. Candidate Job Alerts Feed & Mark Read
  app.get('/api/candidate/alerts', requireAuth('candidate'), (req: AuthedRequest, res) => {
    const alerts = db.alerts.filter((a) => a.candidateId === req.auth!.sub);
    res.json({ alerts });
  });

  app.post('/api/candidate/alerts/sync', requireAuth('candidate'), (req: AuthedRequest, res) => {
    const candidate = db.candidates.find((c) => c.id === req.auth!.sub);
    if (!candidate) {
      res.status(404).json({ error: 'Candidate profile not found.' });
      return;
    }
    if (!candidate.jobAlertsEnabled) {
      res.status(400).json({ error: 'Turn on Job Alerts first to check for matching openings.' });
      return;
    }
    let createdCount = 0;
    for (const job of db.jobs) {
      const criteria = getAlertMatchedCriteria(candidate, job);
      if (criteria.length >= 2) {
        const exists = db.alerts.some((a) => a.candidateId === candidate.id && a.jobId === job.id);
        if (!exists) {
          db.alerts.unshift(createAlertForCandidate(candidate, job, criteria));
          createdCount += 1;
        }
      }
    }
    saveDatabase(db);
    const alerts = db.alerts.filter((a) => a.candidateId === candidate.id);
    res.json({ alerts, createdCount });
  });

  app.post('/api/candidate/alerts/mark-read', requireAuth('candidate'), (req: AuthedRequest, res) => {
    db.alerts = db.alerts.map((a) => (a.candidateId === req.auth!.sub ? { ...a, read: true } : a));
    saveDatabase(db);
    const alerts = db.alerts.filter((a) => a.candidateId === req.auth!.sub);
    res.json({ alerts });
  });

  // 5. Company Full-Data Registration (Strict KYC Verification Required)
  app.post('/api/company/register', (req, res) => {
    const b = req.body || {};
    const requiredFields = [
      'legalName',
      'brandName',
      'gstin',
      'cinOrRegNo',
      'officialEmail',
      'hrMobile',
      'officeAddress',
      'city',
      'sector',
      'companySize',
      'website',
      'hrName',
      'hrDesignation',
      'password',
    ];

    for (const field of requiredFields) {
      if (typeof b[field] !== 'string' || b[field].trim().length < 2) {
        res.status(400).json({ error: `Complete company verification required: missing or invalid ${field}.` });
        return;
      }
    }

    const gstin = b.gstin.trim().toUpperCase();
    if (!isValidGstin(gstin)) {
      res.status(400).json({ error: 'Invalid GSTIN format. Expected 15-character Indian GSTIN (e.g. 07AABCM4821K1Z5).' });
      return;
    }

    const email = b.officialEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid official HR email address.' });
      return;
    }

    const mobileDigits = b.hrMobile.replace(/[\s\-+]/g, '').replace(/^91/, '');
    if (!/^[6-9]\d{9}$/.test(mobileDigits)) {
      res.status(400).json({ error: 'Please enter a valid 10-digit Indian HR mobile number.' });
      return;
    }

    if (!isValidHttpUrl(b.website.trim())) {
      res.status(400).json({ error: 'Website URL must start with https:// or http://' });
      return;
    }

    if (b.password.length < 8) {
      res.status(400).json({ error: 'Company account password must be at least 8 characters.' });
      return;
    }

    if (db.companies.some((c) => c.officialEmail === email || c.gstin === gstin)) {
      res.status(409).json({ error: 'A company with this official email or GSTIN is already registered. Please sign in.' });
      return;
    }

    const newCompany: StoredCompany = {
      id: `comp-${crypto.randomUUID().slice(0, 8)}`,
      legalName: b.legalName.trim().slice(0, 120),
      brandName: b.brandName.trim().slice(0, 80),
      gstin,
      cinOrRegNo: b.cinOrRegNo.trim().toUpperCase().slice(0, 40),
      officialEmail: email,
      hrMobile: mobileDigits,
      officeAddress: b.officeAddress.trim().slice(0, 200),
      city: b.city.trim().slice(0, 60),
      sector: b.sector.trim() as Sector,
      companySize: b.companySize.trim().slice(0, 40),
      website: b.website.trim().slice(0, 160),
      hrName: b.hrName.trim().slice(0, 80),
      hrDesignation: b.hrDesignation.trim().slice(0, 80),
      verified: true,
      activePlan: 'none',
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(b.password),
    };

    db.companies.push(newCompany);
    saveDatabase(db);

    const token = signToken(newCompany.id, 'company');
    res.status(201).json({ token, role: 'company', company: sanitizeCompany(newCompany) });
  });

  // 6. Company Login
  app.post('/api/company/login', (req, res) => {
    const email = typeof req.body?.officialEmail === 'string' ? req.body.officialEmail.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const company = db.companies.find((c) => c.officialEmail === email);
    if (!company || !verifyPassword(password, company.passwordHash)) {
      res.status(401).json({ error: 'Invalid company email or password.' });
      return;
    }

    const token = signToken(company.id, 'company');
    res.json({ token, role: 'company', company: sanitizeCompany(company) });
  });

  app.get('/api/company/me', requireAuth('company'), (req: AuthedRequest, res) => {
    const company = db.companies.find((c) => c.id === req.auth!.sub);
    if (!company) {
      res.status(404).json({ error: 'Company account not found.' });
      return;
    }
    const invoices = db.invoices.filter((inv) => inv.companyId === company.id);
    const jobs = db.jobs.filter((j) => j.companyId === company.id);
    res.json({ company: sanitizeCompany(company), invoices, jobs });
  });

  // 7. Company Post Job + Lowest-in-India Fee Checkout (₹99 single post or ₹299/mo unlimited)
  app.post('/api/jobs', requireAuth('company'), (req: AuthedRequest, res) => {
    const compIdx = db.companies.findIndex((c) => c.id === req.auth!.sub);
    if (compIdx === -1) {
      res.status(404).json({ error: 'Company account not found.' });
      return;
    }
    const company = db.companies[compIdx];
    const b = req.body || {};

    const postTitle = typeof b.postTitle === 'string' ? b.postTitle.trim().slice(0, 100) : '';
    const sector = (typeof b.sector === 'string' ? b.sector.trim() : '') as Sector;
    const city = typeof b.city === 'string' ? b.city.trim().slice(0, 60) : '';
    const locality = typeof b.locality === 'string' ? b.locality.trim().slice(0, 100) : city;
    const workMode = (typeof b.workMode === 'string' ? b.workMode : 'On-site') as WorkMode;
    const shiftType = (typeof b.shiftType === 'string' ? b.shiftType : 'Day Shift') as ShiftType;
    const timetable = typeof b.timetable === 'string' ? b.timetable.trim().slice(0, 100) : '';
    const workingDays = typeof b.workingDays === 'string' ? b.workingDays.trim().slice(0, 60) : '5 Days / Week';
    const joiningSpeed = (typeof b.joiningSpeed === 'string' ? b.joiningSpeed : 'Immediate (48 hrs)') as JoiningSpeed;
    const salaryMin = Math.max(5000, Math.min(500000, Number(b.salaryMin) || 0));
    const salaryMax = Math.max(salaryMin, Math.min(1000000, Number(b.salaryMax) || salaryMin));
    const benefits = typeof b.benefits === 'string' ? b.benefits.trim().slice(0, 120) : 'PF + ESIC';
    const experienceMin = Math.max(0, Math.min(25, Number(b.experienceMin) || 0));
    const experienceMax = Math.max(experienceMin, Math.min(30, Number(b.experienceMax) || experienceMin + 2));
    const openings = Math.max(1, Math.min(500, Number(b.openings) || 1));
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 1500) : '';
    const requiredSkills = Array.isArray(b.requiredSkills)
      ? b.requiredSkills
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim().slice(0, 40))
          .slice(0, 12)
      : [];

    const selectedPlan = b.planId === 'unlimited-299' ? 'unlimited-299' : 'single-99';

    if (!postTitle || !sector || !city || !timetable || !description || requiredSkills.length === 0) {
      res.status(400).json({
        error: 'Upfront transparency required: post title, sector, city, exact shift timetable, skills, and description must be filled.',
      });
      return;
    }

    // Create GST Invoice if company doesn't already have an active Unlimited ₹299 plan
    let invoice: BillingInvoice | null = null;
    const hasActiveUnlimited =
      company.activePlan === 'unlimited-299' &&
      company.planExpiresAt &&
      new Date(company.planExpiresAt).getTime() > Date.now();

    if (!hasActiveUnlimited || selectedPlan === 'unlimited-299') {
      const baseAmount = selectedPlan === 'unlimited-299' ? 299 : 99;
      const gstAmount = Math.round(baseAmount * 0.18);
      invoice = {
        id: `INV-${Date.now().toString().slice(-6)}`,
        companyId: company.id,
        companyName: company.brandName,
        gstin: company.gstin,
        planId: selectedPlan,
        planLabel:
          selectedPlan === 'unlimited-299'
            ? 'JobSarathi Unlimited Monthly Hiring Plan'
            : 'JobSarathi Single Verified Job Post (30 Days)',
        baseAmount,
        gstAmount,
        totalAmount: baseAmount + gstAmount,
        paidAt: new Date().toISOString(),
      };
      db.invoices.unshift(invoice);

      if (selectedPlan === 'unlimited-299') {
        db.companies[compIdx] = {
          ...company,
          activePlan: 'unlimited-299',
          planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    }

    const inHandLow = Math.round(salaryMin * 0.91);
    const inHandHigh = Math.round(salaryMax * 0.91);
    const ctcLow = ((salaryMin * 12) / 100000).toFixed(2);
    const ctcHigh = ((salaryMax * 12) / 100000).toFixed(2);

    const newJob: JobPosting = {
      id: `job-${crypto.randomUUID().slice(0, 8)}`,
      companyId: company.id,
      companyName: company.brandName,
      companyVerified: true,
      companyGstin: company.gstin,
      companyCity: company.city,
      postTitle,
      sector,
      city,
      locality,
      workMode,
      salaryMin,
      salaryMax,
      inHandEstimate: `${formatINR(inHandLow)} – ${formatINR(inHandHigh)} in-hand`,
      ctcAnnual: `₹${ctcLow}L – ₹${ctcHigh}L CTC`,
      benefits,
      shiftType,
      timetable,
      workingDays,
      joiningSpeed,
      experienceMin,
      experienceMax,
      requiredSkills,
      openings,
      description,
      interviewFormat: 'Online Video Interview',
      planUsed: selectedPlan,
      createdAt: new Date().toISOString(),
    };

    db.jobs.unshift(newJob);
    const alertsDispatched = dispatchJobAlertsForNewJob(newJob);
    saveDatabase(db);

    res.status(201).json({
      job: newJob,
      invoice,
      alertsDispatched,
      company: sanitizeCompany(db.companies[compIdx]),
    });
  });

  // 8. Candidate Free Application (₹0) + Server-Calculated Match Score
  app.post('/api/applications', requireAuth('candidate'), (req: AuthedRequest, res) => {
    const candidate = db.candidates.find((c) => c.id === req.auth!.sub);
    if (!candidate) {
      res.status(404).json({ error: 'Candidate profile not found.' });
      return;
    }

    const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId : '';
    const job = db.jobs.find((j) => j.id === jobId);
    if (!job) {
      res.status(404).json({ error: 'Job posting not found.' });
      return;
    }

    const existing = db.applications.find((a) => a.jobId === job.id && a.candidateId === candidate.id);
    if (existing) {
      res.status(409).json({ error: 'You have already applied to this position.', application: existing });
      return;
    }

    const match = computeMatchScore(candidate, job);

    const application: JobApplication = {
      id: `app-${crypto.randomUUID().slice(0, 8)}`,
      jobId: job.id,
      jobTitle: job.postTitle,
      companyId: job.companyId,
      companyName: job.companyName,
      salaryDisplay: `${formatINR(job.salaryMin)} – ${formatINR(job.salaryMax)}/mo`,
      timetableDisplay: job.timetable,
      candidateId: candidate.id,
      candidateName: candidate.fullName || candidate.identifier,
      candidateIdentifier: candidate.identifier,
      candidateCity: candidate.city || 'India',
      candidateExperience: candidate.experienceYears || 0,
      candidateSkills: candidate.skills || [],
      candidateResumeFile: candidate.resumeFileName || 'JobSarathi Profile Resume',
      candidateResumeSummary: candidate.resumeSummary || 'Verified OTP Candidate ready for online interview.',
      candidateResumeAvailable: candidateHasStoredResume(candidate),
      candidateBusySlots: candidate.interviewBusySlots || [],
      candidateAvailabilityNote: candidate.interviewAvailabilityNote || '',
      matchScore: match.score,
      matchReasons: match.reasons,
      status: 'Applied',
      appliedAt: new Date().toISOString(),
    };

    db.applications.unshift(application);
    saveDatabase(db);
    res.status(201).json({ application });
  });

  // 9. Get Applications (Scoped to authenticated Candidate OR authenticated Company)
  app.get('/api/applications', requireAuth(), (req: AuthedRequest, res) => {
    const enrichApplication = (a: JobApplication): JobApplication => {
      const cand = db.candidates.find((c) => c.id === a.candidateId);
      const hasFile = cand ? candidateHasStoredResume(cand) : false;
      return {
        ...a,
        candidateResumeFile: cand?.resumeFileName || a.candidateResumeFile,
        candidateResumeAvailable: hasFile,
        candidateBusySlots: cand?.interviewBusySlots || a.candidateBusySlots || [],
        candidateAvailabilityNote: cand?.interviewAvailabilityNote ?? a.candidateAvailabilityNote ?? '',
      };
    };

    if (req.auth!.role === 'candidate') {
      const list = db.applications
        .filter((a) => a.candidateId === req.auth!.sub)
        .map(enrichApplication);
      res.json({ applications: list });
      return;
    }
    const list = db.applications
      .filter((a) => a.companyId === req.auth!.sub)
      .map(enrichApplication)
      .sort((a, b) => b.matchScore - a.matchScore);
    res.json({ applications: list });
  });

  // 10. Company Schedules Built-in Online Video Interview
  app.patch('/api/applications/:id/schedule-interview', requireAuth('company'), (req: AuthedRequest, res) => {
    const idx = db.applications.findIndex((a) => a.id === req.params.id && a.companyId === req.auth!.sub);
    if (idx === -1) {
      res.status(404).json({ error: 'Application not found for your company.' });
      return;
    }

    const company = db.companies.find((c) => c.id === req.auth!.sub);
    const b = req.body || {};
    const scheduledDate = typeof b.scheduledDate === 'string' && b.scheduledDate ? b.scheduledDate : new Date().toISOString().slice(0, 10);
    const scheduledTime = typeof b.scheduledTime === 'string' && b.scheduledTime ? b.scheduledTime : '04:00 PM IST';
    const durationMins = Math.max(10, Math.min(60, Number(b.durationMins) || 20));
    const notes = typeof b.notes === 'string' ? b.notes.trim().slice(0, 400) : 'Direct JobSarathi Online Video Interview — no travel required.';

    const updated: JobApplication = {
      ...db.applications[idx],
      status: 'Interview Scheduled',
      interview: {
        roomCode: `SJ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        scheduledDate,
        scheduledTime,
        durationMins,
        interviewerName: company?.hrName || 'Hiring Manager',
        notes,
      },
    };

    db.applications[idx] = updated;
    saveDatabase(db);
    res.json({ application: updated });
  });

  // 11. Company Records Online Interview Outcome
  app.patch('/api/applications/:id/interview-outcome', requireAuth('company'), (req: AuthedRequest, res) => {
    const idx = db.applications.findIndex((a) => a.id === req.params.id && a.companyId === req.auth!.sub);
    if (idx === -1) {
      res.status(404).json({ error: 'Application not found for your company.' });
      return;
    }

    const outcome = req.body?.outcome;
    const validOutcomes = ['Selected', 'Next Round', 'On Hold', 'Rejected'];
    if (!validOutcomes.includes(outcome)) {
      res.status(400).json({ error: 'Invalid interview outcome.' });
      return;
    }

    const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback.trim().slice(0, 500) : '';
    const appItem = db.applications[idx];
    const updated: JobApplication = {
      ...appItem,
      status: outcome === 'Rejected' ? 'On Hold' : outcome,
      interview: {
        ...(appItem.interview || {
          roomCode: `SJ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          scheduledDate: new Date().toISOString().slice(0, 10),
          scheduledTime: 'Completed',
          durationMins: 20,
          interviewerName: 'Hiring Panel',
          notes: '',
        }),
        completed: true,
        outcome,
        feedback,
      },
    };

    db.applications[idx] = updated;
    saveDatabase(db);
    res.json({ application: updated });
  });

  // Mount Vite dev middleware or serve static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JobSarathi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start JobSarathi server:', err);
  process.exit(1);
});
