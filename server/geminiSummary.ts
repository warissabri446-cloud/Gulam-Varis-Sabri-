import { GoogleGenAI, Type } from '@google/genai';
import { formatINR } from '../src/shared/matching';
import type { CandidateProfile, JobPosting } from '../src/shared/types';

export interface CandidateSummaryContext {
  city?: string;
  preferredSector?: string;
  preferredShift?: string;
  expectedSalary?: number;
  experienceYears?: number;
  skills?: string[];
  workModePreference?: string;
}

export class GeminiSummaryError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'GeminiSummaryError';
    this.statusCode = statusCode;
  }
}

const MODEL_ID = 'gemini-4-hydrogen';

function cleanBulletText(text: string): string {
  return text
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|500|502|503|504|UNAVAILABLE|ETIMEDOUT|ECONNRESET|fetch failed/i.test(msg);
}

function buildPrompt(job: JobPosting, candidateCtx?: CandidateSummaryContext | null): string {
  const jobLines = [
    `Role: ${job.postTitle}`,
    `Company: ${job.companyName}`,
    `Sector: ${job.sector}`,
    `Location: ${job.city} (${job.locality}), Work Mode: ${job.workMode}`,
    `Monthly Salary: ${formatINR(job.salaryMin)} - ${formatINR(job.salaryMax)} (${job.inHandEstimate}, ${job.ctcAnnual})`,
    `Benefits: ${job.benefits}`,
    `Shift & Timetable: ${job.shiftType} — ${job.timetable} (${job.workingDays})`,
    `Joining Speed: ${job.joiningSpeed}`,
    `Experience Required: ${job.experienceMin} to ${job.experienceMax} years`,
    `Required Skills: ${job.requiredSkills.join(', ')}`,
    `Interview Format: ${job.interviewFormat}`,
    `Description: ${job.description}`,
  ];

  const candidateLines: string[] = [];
  if (candidateCtx) {
    if (candidateCtx.city) candidateLines.push(`Candidate City: ${candidateCtx.city}`);
    if (candidateCtx.preferredSector) candidateLines.push(`Preferred Sector: ${candidateCtx.preferredSector}`);
    if (candidateCtx.preferredShift) candidateLines.push(`Preferred Shift: ${candidateCtx.preferredShift}`);
    if (typeof candidateCtx.expectedSalary === 'number' && candidateCtx.expectedSalary > 0) {
      candidateLines.push(`Expected Salary: ${formatINR(candidateCtx.expectedSalary)}/mo`);
    }
    if (typeof candidateCtx.experienceYears === 'number') {
      candidateLines.push(`Experience: ${candidateCtx.experienceYears} years`);
    }
    if (Array.isArray(candidateCtx.skills) && candidateCtx.skills.length > 0) {
      candidateLines.push(`Candidate Skills: ${candidateCtx.skills.join(', ')}`);
    }
    if (candidateCtx.workModePreference) {
      candidateLines.push(`Work Mode Preference: ${candidateCtx.workModePreference}`);
    }
  }

  return [
    'Summarize why this job is a strong opportunity for the candidate in exactly 3 concise bullet points.',
    '',
    'JOB POSTING:',
    ...jobLines,
    ...(candidateLines.length > 0 ? ['', 'CANDIDATE PROFILE CONTEXT:', ...candidateLines] : []),
  ].join('\n');
}

export function sanitizeCandidateContext(
  raw: unknown
): CandidateSummaryContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const ctx: CandidateSummaryContext = {};

  if (typeof obj.city === 'string' && obj.city.trim()) {
    ctx.city = obj.city.trim().slice(0, 60);
  }
  if (typeof obj.preferredSector === 'string' && obj.preferredSector.trim()) {
    ctx.preferredSector = obj.preferredSector.trim().slice(0, 60);
  }
  if (typeof obj.preferredShift === 'string' && obj.preferredShift.trim()) {
    ctx.preferredShift = obj.preferredShift.trim().slice(0, 40);
  }
  if (typeof obj.workModePreference === 'string' && obj.workModePreference.trim()) {
    ctx.workModePreference = obj.workModePreference.trim().slice(0, 30);
  }
  if (typeof obj.expectedSalary === 'number' && Number.isFinite(obj.expectedSalary)) {
    ctx.expectedSalary = Math.max(0, Math.min(1000000, obj.expectedSalary));
  }
  if (typeof obj.experienceYears === 'number' && Number.isFinite(obj.experienceYears)) {
    ctx.experienceYears = Math.max(0, Math.min(40, obj.experienceYears));
  }
  if (Array.isArray(obj.skills)) {
    ctx.skills = obj.skills
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim().slice(0, 40))
      .slice(0, 15);
  }

  return Object.keys(ctx).length > 0 ? ctx : null;
}

export function extractCandidateContext(candidate: CandidateProfile): CandidateSummaryContext {
  return {
    city: candidate.city,
    preferredSector: candidate.preferredSector,
    preferredShift: candidate.preferredShift,
    expectedSalary: candidate.expectedSalary,
    experienceYears: candidate.experienceYears,
    skills: candidate.skills,
    workModePreference: candidate.workModePreference,
  };
}

export async function generateJobSummaryBullets(
  job: JobPosting,
  candidateCtx?: CandidateSummaryContext | null
): Promise<string[]> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiSummaryError(
      503,
      'Gemini API key is not configured yet. Please set GEMINI_API_KEY in Settings > Secrets and try again.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = buildPrompt(job, candidateCtx);
  const maxAttempts = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a concise career advisor for Indian private-sector job seekers on JobSarathi. Condense the job posting into exactly 3 short, high-signal bullet points for a "Why this job is for you" section. Base every point strictly on the provided job details (upfront salary, shift timetable, skills, benefits, joining speed, location) and candidate context if supplied. Keep each bullet under 26 words in plain text without bullet symbols.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bullets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 concise bullet points explaining why this job fits the candidate.',
              },
            },
            required: ['bullets'],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new GeminiSummaryError(502, 'Gemini returned an empty summary. Please try again.');
      }

      let parsed: { bullets?: unknown };
      try {
        parsed = JSON.parse(rawText) as { bullets?: unknown };
      } catch {
        throw new GeminiSummaryError(502, 'Could not parse Gemini summary response. Please try again.');
      }

      if (!Array.isArray(parsed.bullets)) {
        throw new GeminiSummaryError(502, 'Gemini summary format was incomplete. Please try again.');
      }

      const cleaned = parsed.bullets
        .filter((item): item is string => typeof item === 'string')
        .map(cleanBulletText)
        .filter((item) => item.length > 0)
        .slice(0, 3);

      if (cleaned.length < 3) {
        throw new GeminiSummaryError(502, 'Gemini returned fewer than 3 summary points. Please try again.');
      }

      return cleaned;
    } catch (err) {
      lastError = err;
      if (err instanceof GeminiSummaryError) {
        throw err;
      }
      if (attempt < maxAttempts && isRetryableError(err)) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 700));
        continue;
      }
      break;
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (/API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(errMsg)) {
    throw new GeminiSummaryError(
      403,
      'Gemini API access was denied. Please check your GEMINI_API_KEY in Settings > Secrets and try again.'
    );
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(errMsg)) {
    throw new GeminiSummaryError(
      429,
      'Gemini rate limit reached right now. Please wait a few seconds and retry.'
    );
  }

  throw new GeminiSummaryError(
    502,
    'Unable to generate summary from Gemini right now. Please try again in a moment.'
  );
}
