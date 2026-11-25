import { formatINR } from './matching';
import type { JobPosting, Sector } from './types';

export interface NextRoleInsight {
  id: string;
  title: string;
  avgTimeToPromotion: string;
  avgMonths: number;
  estimatedSalaryRange: string;
  payUpliftPct: number;
  cohortSharePct: number;
  keyMilestone: string;
}

export interface CareerPathSummary {
  trackLabel: string;
  avgFirstPromotion: string;
  nextRoles: NextRoleInsight[];
}

interface RoleTemplate {
  title: string;
  minMonths: number;
  maxMonths: number;
  payUpliftPct: number;
  cohortSharePct: number;
  keyMilestone: string;
}

function roundSalaryTo500(amount: number): number {
  return Math.max(10000, Math.round(amount / 500) * 500);
}

function formatMonthsRange(minMonths: number, maxMonths: number): string {
  return `${minMonths}–${maxMonths} months`;
}

function buildTemplatesForJob(job: JobPosting): { trackLabel: string; templates: RoleTemplate[] } {
  const titleLower = job.postTitle.toLowerCase();
  const sector: Sector = job.sector;

  if (sector === 'BPO & Customer Support') {
    if (titleLower.includes('team leader') || titleLower.includes('lead') || titleLower.includes('manager')) {
      return {
        trackLabel: 'BPO Supervisory & Operations Track',
        templates: [
          {
            title: 'Process Quality & Training Lead',
            minMonths: 15,
            maxMonths: 20,
            payUpliftPct: 22,
            cohortSharePct: 38,
            keyMilestone: 'Maintain floor CSAT ≥ 90% and lead new-hire batch calibration',
          },
          {
            title: 'Assistant Operations Manager',
            minMonths: 18,
            maxMonths: 24,
            payUpliftPct: 32,
            cohortSharePct: 41,
            keyMilestone: 'Manage multi-shift SLA adherence and shrinkage under 8%',
          },
          {
            title: 'Client Account Manager (CX)',
            minMonths: 24,
            maxMonths: 32,
            payUpliftPct: 45,
            cohortSharePct: 21,
            keyMilestone: 'Own quarterly business reviews (QBRs) and account expansion',
          },
        ],
      };
    }

    if (
      titleLower.includes('chat') ||
      titleLower.includes('email') ||
      titleLower.includes('international') ||
      titleLower.includes('non-voice')
    ) {
      return {
        trackLabel: 'International Non-Voice & SaaS Support Track',
        templates: [
          {
            title: 'Senior Technical & Escalation Specialist',
            minMonths: 12,
            maxMonths: 16,
            payUpliftPct: 24,
            cohortSharePct: 44,
            keyMilestone: 'Achieve top-quartile ticket resolution speed and zero compliance misses',
          },
          {
            title: 'Quality Assurance (QA) Auditor',
            minMonths: 16,
            maxMonths: 22,
            payUpliftPct: 30,
            cohortSharePct: 32,
            keyMilestone: 'Score ≥ 95% internal audit accuracy across email & chat queues',
          },
          {
            title: 'Subject Matter Expert (SME) / Team Lead',
            minMonths: 22,
            maxMonths: 28,
            payUpliftPct: 42,
            cohortSharePct: 24,
            keyMilestone: 'Mentor onboarding cohorts and manage shift roster escalations',
          },
        ],
      };
    }

    return {
      trackLabel: 'Domestic Voice & Customer Experience Track',
      templates: [
        {
          title: 'Senior Customer Support Executive',
          minMonths: 12,
          maxMonths: 15,
          payUpliftPct: 20,
          cohortSharePct: 48,
          keyMilestone: 'Sustain First-Call Resolution (FCR) above 85% across 3 quarters',
        },
        {
          title: 'Quality Analyst / Floor SME',
          minMonths: 16,
          maxMonths: 22,
          payUpliftPct: 30,
          cohortSharePct: 29,
          keyMilestone: 'Clear internal QA certification and coach L1 voice associates',
        },
        {
          title: 'BPO Operations Team Leader',
          minMonths: 22,
          maxMonths: 28,
          payUpliftPct: 45,
          cohortSharePct: 23,
          keyMilestone: 'Lead a 15–20 agent pod and hit monthly SLA & attendance targets',
        },
      ],
    };
  }

  if (sector === 'IT & Software') {
    if (titleLower.includes('helpdesk') || titleLower.includes('l1') || titleLower.includes('support')) {
      return {
        trackLabel: 'IT Infrastructure & Application Support Track',
        templates: [
          {
            title: 'L2 Application Support Engineer',
            minMonths: 12,
            maxMonths: 18,
            payUpliftPct: 28,
            cohortSharePct: 46,
            keyMilestone: 'Automate recurring SQL diagnostics and handle P1 incident triage',
          },
          {
            title: 'Cloud & DevOps Associate',
            minMonths: 18,
            maxMonths: 24,
            payUpliftPct: 44,
            cohortSharePct: 31,
            keyMilestone: 'Complete Linux/AWS certification and build CI/CD monitoring scripts',
          },
          {
            title: 'Technical Support Team Lead',
            minMonths: 24,
            maxMonths: 30,
            payUpliftPct: 52,
            cohortSharePct: 23,
            keyMilestone: 'Manage shift handovers, RCA documentation, and SLA governance',
          },
        ],
      };
    }

    if (titleLower.includes('frontend') || titleLower.includes('react') || titleLower.includes('ui')) {
      return {
        trackLabel: 'Frontend & Product Engineering Track',
        templates: [
          {
            title: 'Senior Frontend Engineer',
            minMonths: 18,
            maxMonths: 24,
            payUpliftPct: 32,
            cohortSharePct: 51,
            keyMilestone: 'Own end-to-end feature architecture, accessibility, and bundle performance',
          },
          {
            title: 'Full-Stack Product Engineer',
            minMonths: 20,
            maxMonths: 28,
            payUpliftPct: 38,
            cohortSharePct: 27,
            keyMilestone: 'Ship Node.js/API services alongside core React component libraries',
          },
          {
            title: 'Frontend Tech Lead',
            minMonths: 30,
            maxMonths: 36,
            payUpliftPct: 55,
            cohortSharePct: 22,
            keyMilestone: 'Lead design-system governance and mentor 4+ product engineers',
          },
        ],
      };
    }

    return {
      trackLabel: 'Software & Platform Engineering Track',
      templates: [
        {
          title: 'Senior Software Engineer',
          minMonths: 18,
          maxMonths: 24,
          payUpliftPct: 32,
          cohortSharePct: 49,
          keyMilestone: 'Design fault-tolerant APIs and drive database query optimization',
        },
        {
          title: 'Staff / Lead Systems Architect',
          minMonths: 28,
          maxMonths: 36,
          payUpliftPct: 50,
          cohortSharePct: 29,
          keyMilestone: 'Architect cross-service scalability and lead technical RFC reviews',
        },
        {
          title: 'Engineering Manager',
          minMonths: 34,
          maxMonths: 42,
          payUpliftPct: 65,
          cohortSharePct: 22,
          keyMilestone: 'Manage sprint delivery, hiring panels, and engineering career growth',
        },
      ],
    };
  }

  if (sector === 'Banking & Finance') {
    return {
      trackLabel: 'Retail Banking & Compliance Track',
      templates: [
        {
          title: 'Senior Relationship Officer',
          minMonths: 14,
          maxMonths: 18,
          payUpliftPct: 25,
          cohortSharePct: 45,
          keyMilestone: 'Exceed quarterly CASA & deposit cross-sell targets with zero KYC errors',
        },
        {
          title: 'Credit & Risk Operations Lead',
          minMonths: 18,
          maxMonths: 24,
          payUpliftPct: 35,
          cohortSharePct: 31,
          keyMilestone: 'Handle loan underwriting checks and RBI audit compliance sign-offs',
        },
        {
          title: 'Assistant Branch Manager',
          minMonths: 24,
          maxMonths: 32,
          payUpliftPct: 52,
          cohortSharePct: 24,
          keyMilestone: 'Supervise branch teller operations and mentor junior KYC officers',
        },
      ],
    };
  }

  if (sector === 'Sales & Retail') {
    return {
      trackLabel: 'Inside Sales & Revenue Growth Track',
      templates: [
        {
          title: 'Senior Sales & Key Account Executive',
          minMonths: 10,
          maxMonths: 14,
          payUpliftPct: 24,
          cohortSharePct: 47,
          keyMilestone: 'Maintain 110%+ monthly quota attainment across consecutive quarters',
        },
        {
          title: 'Inside Sales Team Lead',
          minMonths: 16,
          maxMonths: 22,
          payUpliftPct: 38,
          cohortSharePct: 33,
          keyMilestone: 'Coach an 8–10 counselor pod on CRM pipeline hygiene and conversion',
        },
        {
          title: 'Area / Regional Sales Manager',
          minMonths: 24,
          maxMonths: 30,
          payUpliftPct: 56,
          cohortSharePct: 20,
          keyMilestone: 'Own territory revenue forecasting and multi-city channel partnerships',
        },
      ],
    };
  }

  if (sector === 'Logistics & Operations') {
    return {
      trackLabel: 'Supply Chain & Fulfillment Operations Track',
      templates: [
        {
          title: 'Senior MIS & Inventory Analyst',
          minMonths: 12,
          maxMonths: 18,
          payUpliftPct: 22,
          cohortSharePct: 42,
          keyMilestone: 'Achieve 99.5%+ stock reconciliation accuracy and automate Excel dashboards',
        },
        {
          title: 'Hub Shift In-Charge',
          minMonths: 18,
          maxMonths: 24,
          payUpliftPct: 34,
          cohortSharePct: 36,
          keyMilestone: 'Manage dock turnaround SLAs and coordinate 3PL fleet dispatch',
        },
        {
          title: 'Warehouse Operations Manager',
          minMonths: 26,
          maxMonths: 34,
          payUpliftPct: 50,
          cohortSharePct: 22,
          keyMilestone: 'Direct end-to-end hub P&L, safety audits, and peak-season capacity',
        },
      ],
    };
  }

  if (sector === 'Healthcare & Pharma') {
    return {
      trackLabel: 'Clinical Operations & Patient Services Track',
      templates: [
        {
          title: 'Senior Patient Care Coordinator',
          minMonths: 12,
          maxMonths: 16,
          payUpliftPct: 22,
          cohortSharePct: 44,
          keyMilestone: 'Maintain <15 min lab report turnaround support and 4.8+ patient CSAT',
        },
        {
          title: 'Diagnostic Center Operations Executive',
          minMonths: 18,
          maxMonths: 24,
          payUpliftPct: 32,
          cohortSharePct: 34,
          keyMilestone: 'Coordinate phlebotomy rosters and NABL quality documentation',
        },
        {
          title: 'Center Operations & Quality Manager',
          minMonths: 24,
          maxMonths: 32,
          payUpliftPct: 48,
          cohortSharePct: 22,
          keyMilestone: 'Oversee multi-clinic SLA performance and doctor liaison programs',
        },
      ],
    };
  }

  if (sector === 'Manufacturing & Engineering') {
    return {
      trackLabel: 'Plant Quality & Production Leadership Track',
      templates: [
        {
          title: 'Senior Quality Assurance Engineer',
          minMonths: 16,
          maxMonths: 22,
          payUpliftPct: 25,
          cohortSharePct: 43,
          keyMilestone: 'Drive PPM defect reduction and lead ISO 9001 internal shop-floor audits',
        },
        {
          title: 'Production Line Manager',
          minMonths: 22,
          maxMonths: 28,
          payUpliftPct: 38,
          cohortSharePct: 36,
          keyMilestone: 'Optimize OEE throughput and manage multi-shift operator scheduling',
        },
        {
          title: 'Plant Quality & Operations Head',
          minMonths: 32,
          maxMonths: 42,
          payUpliftPct: 58,
          cohortSharePct: 21,
          keyMilestone: 'Own OEM customer quality sign-offs and Kaizen cost-saving initiatives',
        },
      ],
    };
  }

  // EdTech & Training
  return {
    trackLabel: 'Academic Mentoring & Program Operations Track',
    templates: [
      {
        title: 'Senior Academic Mentor',
        minMonths: 12,
        maxMonths: 16,
        payUpliftPct: 22,
        cohortSharePct: 45,
        keyMilestone: 'Deliver 85%+ learner course completion and mentor onboarding cohorts',
      },
      {
        title: 'Program Cohort Lead',
        minMonths: 18,
        maxMonths: 24,
        payUpliftPct: 34,
        cohortSharePct: 33,
        keyMilestone: 'Design weekly study sprints and track batch placement readiness',
      },
      {
        title: 'Head of Student Outcomes',
        minMonths: 26,
        maxMonths: 34,
        payUpliftPct: 52,
        cohortSharePct: 22,
        keyMilestone: 'Lead cross-functional curriculum & career-services delivery teams',
      },
    ],
  };
}

export function computeCareerPathInsights(job: JobPosting): CareerPathSummary {
  const { trackLabel, templates } = buildTemplatesForJob(job);

  const nextRoles: NextRoleInsight[] = templates.map((tpl, idx) => {
    const multiplier = 1 + tpl.payUpliftPct / 100;
    const nextMin = roundSalaryTo500(job.salaryMin * multiplier);
    const nextMax = roundSalaryTo500(job.salaryMax * multiplier);
    const avgMonths = Math.round((tpl.minMonths + tpl.maxMonths) / 2);

    return {
      id: `${job.id}-next-${idx + 1}`,
      title: tpl.title,
      avgTimeToPromotion: formatMonthsRange(tpl.minMonths, tpl.maxMonths),
      avgMonths,
      estimatedSalaryRange: `${formatINR(nextMin)} – ${formatINR(nextMax)}/mo`,
      payUpliftPct: tpl.payUpliftPct,
      cohortSharePct: tpl.cohortSharePct,
      keyMilestone: tpl.keyMilestone,
    };
  });

  return {
    trackLabel,
    avgFirstPromotion: nextRoles[0]?.avgTimeToPromotion ?? '14–18 months',
    nextRoles,
  };
}
