export type Sector =
  | 'BPO & Customer Support'
  | 'IT & Software'
  | 'Banking & Finance'
  | 'Sales & Retail'
  | 'Logistics & Operations'
  | 'Healthcare & Pharma'
  | 'Manufacturing & Engineering'
  | 'EdTech & Training';

export type ShiftType = 'Day Shift' | 'Night Shift' | 'Rotational Shift' | 'Flexible';

export type WorkMode = 'On-site' | 'Hybrid' | 'Remote';

export type JoiningSpeed = 'Immediate (48 hrs)' | 'Within 7 Days' | 'Within 15 Days' | 'Within 30 Days';

export interface JobPosting {
  id: string;
  companyId: string;
  companyName: string;
  companyVerified: boolean;
  companyGstin: string;
  companyCity: string;
  postTitle: string;
  sector: Sector;
  city: string;
  locality: string;
  workMode: WorkMode;
  salaryMin: number; // monthly INR
  salaryMax: number; // monthly INR
  inHandEstimate: string;
  ctcAnnual: string;
  benefits: string; // e.g. "PF + ESIC + Attendance Bonus"
  shiftType: ShiftType;
  timetable: string; // e.g. "09:30 AM – 06:30 PM IST · Mon–Sat"
  workingDays: string; // e.g. "5 Days / Week (Sat–Sun Off)"
  joiningSpeed: JoiningSpeed;
  experienceMin: number;
  experienceMax: number;
  requiredSkills: string[];
  openings: number;
  description: string;
  interviewFormat: 'Online Video Interview';
  planUsed: 'single-99' | 'unlimited-299';
  createdAt: string;
}

export interface CandidateProfile {
  id: string;
  identifier: string; // mobile or email used for OTP login
  authChannel: 'mobile' | 'email';
  fullName: string;
  mobile: string;
  email: string;
  city: string;
  preferredSector: Sector | 'Any Sector';
  skills: string[];
  experienceYears: number;
  preferredShift: ShiftType | 'Any Shift';
  expectedSalary: number; // monthly INR
  workModePreference: WorkMode | 'Any';
  resumeFileName: string;
  resumeSummary: string;
  hasResumeFile?: boolean;
  resumeMimeType?: string;
  resumeSizeBytes?: number;
  resumeUploadedAt?: string;
  jobAlertsEnabled?: boolean;
  jobAlertChannels?: Array<'email' | 'sms'>;
  interviewBusySlots?: string[];
  interviewAvailabilityNote?: string;
  updatedAt: string;
}

export interface CompanyAccount {
  id: string;
  legalName: string;
  brandName: string;
  gstin: string;
  cinOrRegNo: string;
  officialEmail: string;
  hrMobile: string;
  officeAddress: string;
  city: string;
  sector: Sector;
  companySize: string;
  website: string;
  hrName: string;
  hrDesignation: string;
  verified: boolean;
  activePlan: 'none' | 'single-99' | 'unlimited-299';
  planExpiresAt?: string;
  createdAt: string;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Selected'
  | 'Next Round'
  | 'On Hold';

export interface InterviewSchedule {
  roomCode: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // e.g. "03:00 PM IST"
  durationMins: number;
  interviewerName: string;
  notes: string;
  completed?: boolean;
  outcome?: 'Selected' | 'Next Round' | 'On Hold' | 'Rejected';
  feedback?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  salaryDisplay: string;
  timetableDisplay: string;
  candidateId: string;
  candidateName: string;
  candidateIdentifier: string;
  candidateCity: string;
  candidateExperience: number;
  candidateSkills: string[];
  candidateResumeFile: string;
  candidateResumeSummary: string;
  candidateResumeAvailable?: boolean;
  candidateBusySlots?: string[];
  candidateAvailabilityNote?: string;
  matchScore: number;
  matchReasons: string[];
  status: ApplicationStatus;
  appliedAt: string;
  interview?: InterviewSchedule;
}

export interface MatchBreakdown {
  score: number; // 0 to 99
  tier: 'Top Match' | 'Strong Fit' | 'Good Fit' | 'Partial Fit';
  skillsMatched: string[];
  skillsMissing: string[];
  reasons: string[];
  factorScores: {
    skills: number; // max 40
    timetable: number; // max 20
    salary: number; // max 20
    fit: number; // max 20 (sector + experience + location)
  };
}

export interface BillingInvoice {
  id: string;
  companyId: string;
  companyName: string;
  gstin: string;
  planId: 'single-99' | 'unlimited-299';
  planLabel: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  paidAt: string;
}

export interface JobAlertNotification {
  id: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  salaryDisplay: string;
  city: string;
  sector: Sector;
  channels: Array<'email' | 'sms'>;
  matchedCriteria: string[];
  sentAt: string;
  read: boolean;
}
