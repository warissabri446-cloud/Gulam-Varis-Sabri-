import type { CandidateProfile, JobPosting, MatchBreakdown } from './types';

const SKILL_SYNONYMS: Record<string, string[]> = {
  'customer support': ['voice process', 'client handling', 'inbound support', 'bpo', 'customer care'],
  'voice process': ['customer support', 'english communication', 'inbound', 'outbound', 'bpo'],
  'english communication': ['spoken english', 'verbal communication', 'voice process', 'communication'],
  'hindi communication': ['hindi', 'bilingual', 'regional voice'],
  'react': ['reactjs', 'react.js', 'frontend', 'typescript'],
  'typescript': ['javascript', 'ts', 'react', 'node.js'],
  'node.js': ['nodejs', 'express', 'backend'],
  'excel': ['ms excel', 'spreadsheets', 'mis', 'data entry'],
  'crm': ['salesforce', 'zoho crm', 'freshdesk', 'zendesk', 'ticketing'],
  'sales': ['field sales', 'inside sales', 'telesales', 'b2b sales', 'business development'],
  'tally': ['accounting', 'gst filing', 'bookkeeping'],
};

function normalizeSkill(raw: string): string {
  return raw.trim().toLowerCase();
}

function skillsAreEquivalent(candidateSkill: string, jobSkill: string): boolean {
  const c = normalizeSkill(candidateSkill);
  const j = normalizeSkill(jobSkill);
  if (c === j || c.includes(j) || j.includes(c)) return true;

  const cSyns = SKILL_SYNONYMS[c] || [];
  if (cSyns.some((s) => s === j || j.includes(s))) return true;

  const jSyns = SKILL_SYNONYMS[j] || [];
  if (jSyns.some((s) => s === c || c.includes(s))) return true;

  return false;
}

export function computeMatchScore(
  candidate: Pick<
    CandidateProfile,
    'skills' | 'preferredShift' | 'expectedSalary' | 'preferredSector' | 'experienceYears' | 'city' | 'workModePreference'
  >,
  job: JobPosting
): MatchBreakdown {
  const candidateSkills = candidate.skills.filter(Boolean);
  const requiredSkills = job.requiredSkills.filter(Boolean);

  // 1. Skills Match (up to 40 pts)
  const skillsMatched: string[] = [];
  const skillsMissing: string[] = [];

  for (const req of requiredSkills) {
    const found = candidateSkills.some((cs) => skillsAreEquivalent(cs, req));
    if (found) {
      skillsMatched.push(req);
    } else {
      skillsMissing.push(req);
    }
  }

  let skillsScore = 16; // baseline when candidate hasn't added skills yet
  if (requiredSkills.length > 0 && candidateSkills.length > 0) {
    const ratio = skillsMatched.length / requiredSkills.length;
    skillsScore = Math.round(ratio * 40);
  } else if (candidateSkills.length === 0) {
    skillsScore = 20;
  }

  // 2. Shift / Timetable Alignment (up to 20 pts)
  let timetableScore = 12;
  if (candidate.preferredShift === 'Any Shift' || candidate.preferredShift === job.shiftType) {
    timetableScore = 20;
  } else if (job.shiftType === 'Flexible') {
    timetableScore = 18;
  } else if (candidate.preferredShift === 'Rotational Shift' || job.shiftType === 'Rotational Shift') {
    timetableScore = 13;
  } else {
    timetableScore = 6;
  }

  // 3. Salary Alignment (up to 20 pts)
  let salaryScore = 15;
  const expected = candidate.expectedSalary || 0;
  if (expected <= 0) {
    salaryScore = 16;
  } else if (job.salaryMin >= expected) {
    salaryScore = 20;
  } else if (job.salaryMax >= expected) {
    salaryScore = 18;
  } else if (job.salaryMax >= expected * 0.85) {
    salaryScore = 12;
  } else {
    salaryScore = 5;
  }

  // 4. Sector, Experience & City/WorkMode Fit (up to 20 pts)
  let fitScore = 0;
  // Sector (7 pts)
  if (candidate.preferredSector === 'Any Sector' || candidate.preferredSector === job.sector) {
    fitScore += 7;
  } else {
    fitScore += 2;
  }

  // Experience (7 pts)
  const exp = candidate.experienceYears ?? 0;
  if (exp >= job.experienceMin && exp <= job.experienceMax + 2) {
    fitScore += 7;
  } else if (exp + 1 >= job.experienceMin) {
    fitScore += 4;
  } else {
    fitScore += 1;
  }

  // City / Work Mode (6 pts)
  const candCity = (candidate.city || '').trim().toLowerCase();
  const jobCity = job.city.trim().toLowerCase();
  if (job.workMode === 'Remote' || !candCity || candCity === 'all india' || jobCity.includes(candCity) || candCity.includes(jobCity)) {
    fitScore += 6;
  } else if (candidate.workModePreference === job.workMode) {
    fitScore += 3;
  } else {
    fitScore += 1;
  }

  const rawTotal = skillsScore + timetableScore + salaryScore + fitScore;
  const score = Math.max(25, Math.min(99, rawTotal));

  const tier: MatchBreakdown['tier'] =
    score >= 85 ? 'Top Match' : score >= 70 ? 'Strong Fit' : score >= 55 ? 'Good Fit' : 'Partial Fit';

  const reasons: string[] = [];
  if (requiredSkills.length > 0) {
    reasons.push(`${skillsMatched.length}/${requiredSkills.length} key skills matched`);
  }
  if (timetableScore >= 18) {
    reasons.push(`${job.shiftType} timetable match`);
  }
  if (salaryScore >= 18) {
    reasons.push(`Meets ₹${(expected || job.salaryMin).toLocaleString('en-IN')}/mo pay`);
  }
  if (job.workMode === 'Remote' || (candCity && jobCity.includes(candCity))) {
    reasons.push(job.workMode === 'Remote' ? 'Remote friendly' : `Located in ${job.city}`);
  } else if (candidate.preferredSector === job.sector) {
    reasons.push(`${job.sector} fit`);
  }

  return {
    score,
    tier,
    skillsMatched,
    skillsMissing,
    reasons: reasons.slice(0, 3),
    factorScores: {
      skills: skillsScore,
      timetable: timetableScore,
      salary: salaryScore,
      fit: fitScore,
    },
  };
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
