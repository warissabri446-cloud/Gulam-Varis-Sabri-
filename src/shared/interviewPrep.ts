import type { JobPosting } from './types';

export interface InterviewPrepQuestion {
  id: string;
  skill: string;
  question: string;
  prepTip: string;
}

interface SkillTemplate {
  match: string[];
  question: (skill: string, job: JobPosting) => string;
  prepTip: string;
}

const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    match: ['customer support', 'voice process'],
    question: () =>
      'How do you de-escalate an upset customer on a live call while keeping resolution time within SLA?',
    prepTip: 'Share a real 3-step example: active listening, acknowledging the issue, and clear next-step ownership.',
  },
  {
    match: ['hindi communication', 'english communication'],
    question: (skill) =>
      `How do you explain complex billing, onboarding, or policy steps clearly in ${skill.replace(
        / communication/i,
        ''
      )} without confusing jargon?`,
    prepTip: 'Speak calmly at a steady pace during the video call and avoid filler words.',
  },
  {
    match: ['crm', 'ticketing tools'],
    question: (skill) =>
      `Which ${skill} workflows have you used to log customer cases, set follow-up reminders, and avoid repeat tickets?`,
    prepTip: 'Mention exact fields you track—issue category, priority tag, root cause, and closure confirmation.',
  },
  {
    match: ['email support', 'typing speed'],
    question: () =>
      'How do you structure a clear, polite written reply so a customer’s multi-part query is resolved on the first message?',
    prepTip: 'Highlight accuracy, tone empathy, and bulleted resolution steps.',
  },
  {
    match: ['team management', 'bpo operations', 'sla management'],
    question: (skill) =>
      `In ${skill}, what action do you take first when daily CSAT drops or shift shrinkage threatens floor SLAs?`,
    prepTip: 'Talk about real metrics you track (AHT, CSAT, FCR, shrinkage) and 1-on-1 coaching.',
  },
  {
    match: ['ms excel', 'mis reporting', 'tally'],
    question: (skill) =>
      `Which specific ${skill} features (VLOOKUP/XLOOKUP, Pivot Tables, reconciliation checks) do you use to prevent daily reporting errors?`,
    prepTip: 'Prepare a 30-second walkthrough of a daily tracker or MIS report you built.',
  },
  {
    match: ['react', 'typescript', 'tailwind css'],
    question: (skill) =>
      `How do you structure reusable ${skill} UI code to handle loading states, form validation, and fast rendering?`,
    prepTip: 'Be ready to discuss state management, type safety, and responsive layout debugging.',
  },
  {
    match: ['node.js', 'rest apis', 'system design'],
    question: (skill) =>
      `When building with ${skill}, how do you handle upstream API timeouts, retries, and clean error responses?`,
    prepTip: 'Cover idempotency, input validation, and structured status codes.',
  },
  {
    match: ['sql'],
    question: () =>
      'How would you write a SQL query to inspect duplicate entries or slow-running records during a live support check?',
    prepTip: 'Review GROUP BY, HAVING, JOINs, and basic index awareness.',
  },
  {
    match: ['git'],
    question: () =>
      'Walk us through your Git branching and pull-request workflow when shipping an urgent fix alongside feature work.',
    prepTip: 'Keep your explanation focused on clean commits, conflict resolution, and code reviews.',
  },
  {
    match: ['windows & linux', 'troubleshooting'],
    question: (skill) =>
      `What step-by-step ${skill} diagnostic checks do you run first when a user reports an access or application failure?`,
    prepTip: 'Show structured isolation: reproduce, check logs/network, verify permissions, and escalate cleanly.',
  },
  {
    match: ['kyc verification', 'banking operations'],
    question: (skill) =>
      `Which document checks and mismatch red flags do you verify first during ${skill} to ensure zero audit defects?`,
    prepTip: 'Emphasize PAN/Aadhaar cross-verification, signature clarity, and RBI compliance accuracy.',
  },
  {
    match: ['sales', 'lead follow-up', 'counseling'],
    question: (skill) =>
      `How do you qualify an inbound prospect in the first 2 minutes of a ${skill} call and handle budget objections?`,
    prepTip: 'Focus on discovery questions before pitching features, plus disciplined CRM follow-ups.',
  },
  {
    match: ['inventory management', 'dispatch tracking'],
    question: (skill) =>
      `How do you resolve stock mismatches during ${skill} when physical warehouse counts differ from ERP manifests?`,
    prepTip: 'Mention barcode/manifest verification, inward-outward logs, and e-way bill accuracy.',
  },
  {
    match: ['medical terminology', 'data entry', 'scheduling'],
    question: (skill) =>
      `What double-check habits do you follow in ${skill} so patient records, test codes, and appointment slots stay 100% error-free?`,
    prepTip: 'Highlight patient confidentiality, turnaround urgency, and calm bedside/phone manner.',
  },
  {
    match: ['quality inspection', 'iso 9001', 'production planning', 'cnc basics'],
    question: (skill) =>
      `During shop-floor ${skill}, how do you catch tolerance defects early and document shift handover logs?`,
    prepTip: 'Reference sampling frequency, rejection root-cause notes, and safety/ISO checklists.',
  },
  {
    match: ['online teaching'],
    question: () =>
      'How do you keep remote learners engaged on video sessions and follow up when a student falls behind on weekly milestones?',
    prepTip: 'Share how you combine interactive checks with clear weekly action plans.',
  },
];

export function buildInterviewPrepChecklist(job: JobPosting): InterviewPrepQuestion[] {
  const skills = job.requiredSkills.length > 0 ? job.requiredSkills : [job.sector];
  const selectedSkills = skills.slice(0, 3);
  const usedQuestions = new Set<string>();
  const items: InterviewPrepQuestion[] = [];

  selectedSkills.forEach((skill, idx) => {
    const lower = skill.toLowerCase();
    const matched = SKILL_TEMPLATES.find((tpl) => tpl.match.some((kw) => lower.includes(kw)));

    let question = matched
      ? matched.question(skill, job)
      : `Can you share a specific example of using ${skill} in a ${job.sector} setting and the result you achieved?`;
    let prepTip = matched
      ? matched.prepTip
      : `Use the Situation–Action–Result format in 45–60 seconds during your ${job.interviewFormat}.`;

    if (usedQuestions.has(question)) {
      question = `Describe how your hands-on experience with ${skill} helps you deliver results on a ${job.shiftType.toLowerCase()} schedule.`;
      prepTip = `Connect ${skill} directly to the daily responsibilities of ${job.postTitle}.`;
    }
    usedQuestions.add(question);

    items.push({
      id: `${job.id}-prep-${idx + 1}`,
      skill,
      question,
      prepTip,
    });
  });

  // Pad to 3 items if a custom posting had fewer than 3 required skills
  const fallbacks: Array<{ skill: string; question: string; prepTip: string }> = [
    {
      skill: job.shiftType,
      question: `Are you comfortable with the ${job.timetable} timetable (${job.workingDays}), and how have you managed similar shifts?`,
      prepTip: 'Confirm your commute/home setup reliability so HR sees you are ready to join smoothly.',
    },
    {
      skill: job.sector,
      question: `Why does ${job.postTitle} at ${job.companyName} fit your next career step?`,
      prepTip: 'Tie your past strengths directly to the skills and responsibilities listed above.',
    },
    {
      skill: job.interviewFormat,
      question: 'Have you tested your camera, microphone, and quiet lighting ahead of the Online Video Interview?',
      prepTip: 'Keep your uploaded resume open beside you and join 5 minutes early.',
    },
  ];

  let fbIdx = 0;
  while (items.length < 3 && fbIdx < fallbacks.length) {
    const fb = fallbacks[fbIdx];
    items.push({
      id: `${job.id}-prep-fb-${fbIdx + 1}`,
      skill: fb.skill,
      question: fb.question,
      prepTip: fb.prepTip,
    });
    fbIdx += 1;
  }

  return items;
}
