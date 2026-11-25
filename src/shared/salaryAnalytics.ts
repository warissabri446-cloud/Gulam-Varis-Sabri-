import type { JobPosting, Sector } from './types';

const CITY_COST_FACTOR: Record<string, number> = {
  bengaluru: 1.08,
  mumbai: 1.07,
  gurugram: 1.0,
  noida: 0.96,
  hyderabad: 1.0,
  pune: 0.98,
  chennai: 0.94,
  ahmedabad: 0.9,
  jaipur: 0.88,
  lucknow: 0.86,
  remote: 1.0,
};

const SECTOR_ANNUAL_GROWTH: Record<Sector, number> = {
  'BPO & Customer Support': 0.085,
  'IT & Software': 0.115,
  'Banking & Finance': 0.095,
  'Sales & Retail': 0.09,
  'Logistics & Operations': 0.078,
  'Healthcare & Pharma': 0.088,
  'Manufacturing & Engineering': 0.082,
  'EdTech & Training': 0.075,
};

const MONTH_LABELS = [
  "Dec '25",
  "Jan '26",
  "Feb '26",
  "Mar '26",
  "Apr '26",
  "May '26",
  "Jun '26",
  "Jul '26",
  "Aug '26",
  "Sep '26",
  "Oct '26",
  "Nov '26",
];

const FULL_DATE_LABELS = [
  'December 2025',
  'January 2026',
  'February 2026',
  'March 2026',
  'April 2026',
  'May 2026',
  'June 2026',
  'July 2026',
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026',
];

// Subtle Indian private-sector hiring cycle wave (appraisals in Apr, festive hiring in Sep-Oct)
const SEASONAL_MODIFIERS = [-0.008, -0.004, 0.0, 0.006, 0.014, 0.008, 0.004, 0.006, 0.012, 0.015, 0.009, 0.0];

export function getCityFactor(city: string): number {
  const lower = city.toLowerCase();
  for (const [key, factor] of Object.entries(CITY_COST_FACTOR)) {
    if (lower.includes(key)) return factor;
  }
  return 0.95;
}

export function computeCityBenchmark(job: JobPosting, allJobs: JobPosting[]): {
  cityAverage: number;
  roleMid: number;
  deltaPct: number;
  sampleSource: string;
} {
  const roleMid = Math.round((job.salaryMin + job.salaryMax) / 2);
  const cityPrefix = job.city.split('(')[0].trim().toLowerCase();

  const sameCityAndSector = allJobs.filter(
    (j) => j.sector === job.sector && j.city.toLowerCase().includes(cityPrefix)
  );
  const sameSector = allJobs.filter((j) => j.sector === job.sector);

  let cityAverage = 0;
  let sampleSource = '';

  if (sameCityAndSector.length >= 2) {
    const sum = sameCityAndSector.reduce((acc, item) => acc + (item.salaryMin + item.salaryMax) / 2, 0);
    cityAverage = Math.round(sum / sameCityAndSector.length / 500) * 500;
    sampleSource = `Based on ${sameCityAndSector.length} ${job.sector} roles in ${job.city}`;
  } else if (sameSector.length >= 2) {
    const sum = sameSector.reduce((acc, item) => acc + (item.salaryMin + item.salaryMax) / 2, 0);
    const sectorAvg = sum / sameSector.length;
    cityAverage = Math.round((sectorAvg * getCityFactor(job.city)) / 500) * 500;
    sampleSource = `Market benchmark for ${job.sector} in ${job.city}`;
  } else {
    cityAverage = Math.round((roleMid * 0.94) / 500) * 500;
    sampleSource = `Estimated ${job.city} market benchmark`;
  }

  const deltaPct = cityAverage > 0 ? Math.round(((roleMid - cityAverage) / cityAverage) * 100) : 0;

  return { cityAverage, roleMid, deltaPct, sampleSource };
}

export interface SalaryTrendPoint {
  month: string;
  fullDate: string;
  marketAvg: number;
  industryAvg: number;
  offeredMid: number;
  deltaFromMarketPct: number;
  deltaFromIndustryPct: number;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function computeHistoricalSalaryTrend(
  job: JobPosting,
  allJobs: JobPosting[]
): {
  points: SalaryTrendPoint[];
  latestMarketAvg: number;
  latestIndustryAvg: number;
  twelveMonthAvg: number;
  industryTwelveMonthAvg: number;
  startMarketAvg: number;
  offeredMid: number;
  yoyGrowthPct: number;
  industryYoyGrowthPct: number;
  competitivenessPct: number;
  offerVsTwelveMonthAvgPct: number;
  offerVsIndustryAvgPct: number;
  sectorRoleCount: number;
} {
  const { cityAverage, roleMid } = computeCityBenchmark(job, allJobs);
  const latestMarketAvg = cityAverage;

  // Pan-India industry-wide average across all roles in the selected sector
  const sameSectorAllCities = allJobs.filter((j) => j.sector === job.sector);
  const sectorRoleCount = Math.max(1, sameSectorAllCities.length);
  const rawSectorMid =
    sameSectorAllCities.length > 0
      ? sameSectorAllCities.reduce((acc, item) => acc + (item.salaryMin + item.salaryMax) / 2, 0) /
        sameSectorAllCities.length
      : latestMarketAvg;
  const latestIndustryAvg = Math.round(rawSectorMid / 500) * 500;

  const annualGrowth = SECTOR_ANNUAL_GROWTH[job.sector] ?? 0.085;
  const industryAnnualGrowth = Number((annualGrowth * 0.92).toFixed(3));
  const seed = hashSeed(`${job.id}:${job.postTitle}:${job.city}`);
  const jitterScale = ((seed % 7) - 3) * 0.002; // tiny deterministic role variance (-0.6% to +0.6%)

  const startBase = latestMarketAvg / (1 + annualGrowth);
  const industryStartBase = latestIndustryAvg / (1 + industryAnnualGrowth);

  const points: SalaryTrendPoint[] = MONTH_LABELS.map((month, idx) => {
    const progress = idx / (MONTH_LABELS.length - 1);
    const baseAtMonth = startBase + (latestMarketAvg - startBase) * progress;
    const seasonal = idx === 0 || idx === MONTH_LABELS.length - 1 ? 0 : SEASONAL_MODIFIERS[idx] + jitterScale;
    const rawMarket = baseAtMonth * (1 + seasonal);
    const marketAvg = Math.round(rawMarket / 250) * 250;

    const indBaseAtMonth = industryStartBase + (latestIndustryAvg - industryStartBase) * progress;
    const indSeasonal = idx === 0 || idx === MONTH_LABELS.length - 1 ? 0 : SEASONAL_MODIFIERS[idx] * 0.7;
    const industryAvg = Math.round((indBaseAtMonth * (1 + indSeasonal)) / 250) * 250;

    const deltaFromMarketPct = marketAvg > 0 ? Math.round(((roleMid - marketAvg) / marketAvg) * 100) : 0;
    const deltaFromIndustryPct = industryAvg > 0 ? Math.round(((roleMid - industryAvg) / industryAvg) * 100) : 0;

    return {
      month,
      fullDate: FULL_DATE_LABELS[idx] ?? month,
      marketAvg,
      industryAvg,
      offeredMid: roleMid,
      deltaFromMarketPct,
      deltaFromIndustryPct,
    };
  });

  const startMarketAvg = points[0]?.marketAvg ?? latestMarketAvg;
  const startIndustryAvg = points[0]?.industryAvg ?? latestIndustryAvg;
  const twelveMonthSum = points.reduce((acc, p) => acc + p.marketAvg, 0);
  const industryTwelveMonthSum = points.reduce((acc, p) => acc + p.industryAvg, 0);

  const twelveMonthAvg =
    points.length > 0 ? Math.round(twelveMonthSum / points.length / 250) * 250 : latestMarketAvg;
  const industryTwelveMonthAvg =
    points.length > 0 ? Math.round(industryTwelveMonthSum / points.length / 250) * 250 : latestIndustryAvg;

  const yoyGrowthPct =
    startMarketAvg > 0 ? Number((((latestMarketAvg - startMarketAvg) / startMarketAvg) * 100).toFixed(1)) : 0;
  const industryYoyGrowthPct =
    startIndustryAvg > 0
      ? Number((((latestIndustryAvg - startIndustryAvg) / startIndustryAvg) * 100).toFixed(1))
      : 0;
  const competitivenessPct =
    latestMarketAvg > 0 ? Math.round(((roleMid - latestMarketAvg) / latestMarketAvg) * 100) : 0;
  const offerVsTwelveMonthAvgPct =
    twelveMonthAvg > 0 ? Math.round(((roleMid - twelveMonthAvg) / twelveMonthAvg) * 100) : 0;
  const offerVsIndustryAvgPct =
    industryTwelveMonthAvg > 0
      ? Math.round(((roleMid - industryTwelveMonthAvg) / industryTwelveMonthAvg) * 100)
      : 0;

  return {
    points,
    latestMarketAvg,
    latestIndustryAvg,
    twelveMonthAvg,
    industryTwelveMonthAvg,
    startMarketAvg,
    offeredMid: roleMid,
    yoyGrowthPct,
    industryYoyGrowthPct,
    competitivenessPct,
    offerVsTwelveMonthAvgPct,
    offerVsIndustryAvgPct,
    sectorRoleCount,
  };
}

export type SalaryDeviationStatus = 'above' | 'at' | 'below';

export interface SalaryDeviationResult {
  status: SalaryDeviationStatus;
  label: 'Above Market Average' | 'At Market' | 'Below Market';
  offeredMid: number;
  marketMedian: number;
  deltaAmount: number;
  deltaPct: number;
  peerCount: number;
  basisNote: string;
}

export function computeSalaryDeviation(
  job: JobPosting,
  allJobs: JobPosting[]
): SalaryDeviationResult {
  const offeredMid = Math.round((job.salaryMin + job.salaryMax) / 2);
  const targetCityFactor = getCityFactor(job.city);
  const sameSector = allJobs.filter((j) => j.sector === job.sector);

  let marketMedian = 0;
  let basisNote = '';

  if (sameSector.length >= 2) {
    const normalized = sameSector
      .map((peer) => {
        const peerMid = (peer.salaryMin + peer.salaryMax) / 2;
        const peerFactor = getCityFactor(peer.city) || 1;
        return (peerMid / peerFactor) * targetCityFactor;
      })
      .sort((a, b) => a - b);

    const midIndex = Math.floor(normalized.length / 2);
    const rawMedian =
      normalized.length % 2 === 1
        ? normalized[midIndex]
        : (normalized[midIndex - 1] + normalized[midIndex]) / 2;

    marketMedian = Math.round(rawMedian / 500) * 500;
    basisNote = `Median across ${sameSector.length} active ${job.sector} roles normalized for ${job.city}`;
  } else {
    const benchmark = computeCityBenchmark(job, allJobs);
    marketMedian = benchmark.cityAverage;
    basisNote = benchmark.sampleSource;
  }

  const deltaAmount = offeredMid - marketMedian;
  const deltaPct = marketMedian > 0 ? Math.round((deltaAmount / marketMedian) * 100) : 0;

  let status: SalaryDeviationStatus = 'at';
  let label: SalaryDeviationResult['label'] = 'At Market';

  if (deltaPct > 5) {
    status = 'above';
    label = 'Above Market Average';
  } else if (deltaPct < -5) {
    status = 'below';
    label = 'Below Market';
  }

  return {
    status,
    label,
    offeredMid,
    marketMedian,
    deltaAmount,
    deltaPct,
    peerCount: Math.max(1, sameSector.length),
    basisNote,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function buildSalaryTrendCsv(
  job: JobPosting,
  allJobs: JobPosting[]
): { csvContent: string; fileName: string } {
  const { points } = computeHistoricalSalaryTrend(job, allJobs);

  const headers = [
    'Role',
    'Company',
    'City',
    'Sector',
    'Month',
    'Short Month',
    'Offered Salary Min (INR)',
    'Offered Salary Max (INR)',
    'Offered Midpoint (INR)',
    'Role Market Benchmark (INR)',
    'Industry Average (INR)',
    'Variance vs Role (%)',
    'Variance vs Industry (%)',
  ];

  const rows = points.map((pt) => [
    job.postTitle,
    job.companyName,
    job.city,
    job.sector,
    pt.fullDate,
    pt.month,
    job.salaryMin,
    job.salaryMax,
    pt.offeredMid,
    pt.marketAvg,
    pt.industryAvg,
    pt.deltaFromMarketPct,
    pt.deltaFromIndustryPct,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  const slug = `${job.postTitle}-${job.city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return {
    csvContent,
    fileName: `salary-trend-${slug || 'job'}.csv`,
  };
}
