import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR } from '../shared/matching';
import { computeHistoricalSalaryTrend, type SalaryTrendPoint } from '../shared/salaryAnalytics';
import type { JobPosting } from '../shared/types';

interface SalaryTrendChartProps {
  job: JobPosting;
  allJobs: JobPosting[];
  embedded?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SalaryTrendPoint }>;
  label?: string;
  isIndustryMode: boolean;
}

const CustomTrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isIndustryMode }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const benchmarkVal = isIndustryMode ? point.industryAvg : point.marketAvg;
  const deltaPct = isIndustryMode ? point.deltaFromIndustryPct : point.deltaFromMarketPct;
  const diff = point.offeredMid - benchmarkVal;
  const dateLabel = point.fullDate || label;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5">
        <span className="font-semibold text-slate-900">{dateLabel}</span>
        <span className="font-mono text-[10px] font-medium text-slate-400">{point.month}</span>
      </div>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">{isIndustryMode ? 'Industry Avg:' : 'Monthly Salary:'}</span>
          <span
            className={`font-mono font-bold tabular-nums ${
              isIndustryMode ? 'text-teal-700' : 'text-indigo-700'
            }`}
          >
            {formatINR(benchmarkVal)} / month
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">Offered Mid:</span>
          <span className="font-mono font-bold text-emerald-700 tabular-nums">
            {formatINR(point.offeredMid)} / month
          </span>
        </div>
        <div className="border-t border-slate-100 pt-1 font-mono text-[11px] font-semibold tabular-nums text-slate-700">
          {diff >= 0
            ? `+${formatINR(diff)} (${deltaPct >= 0 ? '+' : ''}${deltaPct}%) vs ${isIndustryMode ? 'industry' : 'role'}`
            : `-${formatINR(Math.abs(diff))} (${deltaPct}%) vs ${isIndustryMode ? 'industry' : 'role'}`}
        </div>
      </div>
    </div>
  );
};

export const SalaryTrendChart: React.FC<SalaryTrendChartProps> = ({ job, allJobs, embedded = false }) => {
  const [filterByIndustryAvg, setFilterByIndustryAvg] = useState(false);

  const {
    points,
    latestMarketAvg,
    latestIndustryAvg,
    twelveMonthAvg,
    industryTwelveMonthAvg,
    offeredMid,
    yoyGrowthPct,
    industryYoyGrowthPct,
    competitivenessPct,
    offerVsTwelveMonthAvgPct,
    offerVsIndustryAvgPct,
    sectorRoleCount,
  } = useMemo(() => computeHistoricalSalaryTrend(job, allJobs), [job, allJobs]);

  const activeDataKey = filterByIndustryAvg ? 'industryAvg' : 'marketAvg';
  const activeTwelveMonthAvg = filterByIndustryAvg ? industryTwelveMonthAvg : twelveMonthAvg;
  const activeLatestAvg = filterByIndustryAvg ? latestIndustryAvg : latestMarketAvg;
  const activeYoyGrowth = filterByIndustryAvg ? industryYoyGrowthPct : yoyGrowthPct;
  const activeDeltaVsAvg = filterByIndustryAvg ? offerVsIndustryAvgPct : offerVsTwelveMonthAvgPct;
  const activeDeltaVsNov =
    activeLatestAvg > 0 ? Math.round(((offeredMid - activeLatestAvg) / activeLatestAvg) * 100) : competitivenessPct;

  const [yMin, yMax] = useMemo(() => {
    const allValues = points.flatMap((p) => [
      filterByIndustryAvg ? p.industryAvg : p.marketAvg,
      p.offeredMid,
    ]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const low = Math.max(0, Math.floor((rawMin * 0.88) / 2000) * 2000);
    const high = Math.ceil((rawMax * 1.1) / 2000) * 2000;
    return [low, Math.max(low + 4000, high)];
  }, [points, filterByIndustryAvg]);

  const isCompetitive = activeDeltaVsAvg >= 0;
  const lineColor = filterByIndustryAvg ? '#0F766E' : '#1E40AF';
  const containerClass = embedded ? '' : 'rounded-xl border border-slate-200 bg-white p-4';

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            {filterByIndustryAvg
              ? `12-Month Industry Average (${job.sector})`
              : `12-Month Historical Role Trend (${job.city})`}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {filterByIndustryAvg
              ? `Dec '25 – Nov '26 pan-India ${job.sector} trend (${sectorRoleCount} active sector roles)`
              : `Dec '25 – Nov '26 monthly benchmark for this role in ${job.city} vs. offered pay`}
          </p>
        </div>

        {/* Optional Filter by Industry Average Toggle */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={filterByIndustryAvg}
            onClick={() => setFilterByIndustryAvg((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              filterByIndustryAvg
                ? 'border-teal-700 bg-teal-50 text-teal-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span
              aria-hidden="true"
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                filterByIndustryAvg ? 'bg-teal-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  filterByIndustryAvg ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
            <span>Filter by Industry Average</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Strip Directly Above Chart */}
      <div className="mt-3 grid grid-cols-1 gap-3 border-y border-slate-100 py-3 sm:grid-cols-3">
        <div>
          <div className="text-[11px] font-medium text-slate-500">Current Offered Salary</div>
          <div className="mt-0.5 font-mono text-base font-bold text-slate-900 tabular-nums">
            {formatINR(offeredMid)}/mo
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            Band: {formatINR(job.salaryMin)} – {formatINR(job.salaryMax)}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500">
            {filterByIndustryAvg ? '12-Month Industry Average' : '12-Month Role Average'}
          </div>
          <div
            className={`mt-0.5 font-mono text-base font-bold tabular-nums ${
              filterByIndustryAvg ? 'text-teal-700' : 'text-indigo-700'
            }`}
          >
            {formatINR(activeTwelveMonthAvg)}/mo
          </div>
          <div className="text-[11px] text-slate-500">
            {filterByIndustryAvg ? `${job.sector} pan-India mean` : `${job.city} Dec '25 – Nov '26 mean`}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500">
            {filterByIndustryAvg ? 'Offer vs. Industry Avg' : 'Offer vs. 12-Mo Average'}
          </div>
          <div
            className={`mt-0.5 font-mono text-base font-bold tabular-nums ${
              isCompetitive ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {activeDeltaVsAvg > 0 ? `+${activeDeltaVsAvg}%` : `${activeDeltaVsAvg}%`}{' '}
            <span className="text-xs font-semibold">
              ({isCompetitive ? 'Competitive' : 'Below avg'})
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
            Trend: +{activeYoyGrowth}% YoY · {activeDeltaVsNov >= 0 ? `+${activeDeltaVsNov}%` : `${activeDeltaVsNov}%`} vs Nov
          </div>
        </div>
      </div>

      <div className="mt-3 h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 14, right: 14, left: 2, bottom: 4 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748B', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval={1}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
            />
            <Tooltip
              trigger="hover"
              isAnimationActive={false}
              cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }}
              wrapperStyle={{ outline: 'none', zIndex: 30, pointerEvents: 'none' }}
              content={<CustomTrendTooltip isIndustryMode={filterByIndustryAvg} />}
            />
            <ReferenceLine
              y={offeredMid}
              stroke="#059669"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: `Offer ${formatINR(offeredMid)}`,
                position: 'insideTopRight',
                fill: '#047857',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Line
              type="monotone"
              dataKey={activeDataKey}
              name={filterByIndustryAvg ? 'Industry Average' : 'Role Trend'}
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: lineColor, stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: lineColor, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-0.5 w-3.5 ${filterByIndustryAvg ? 'bg-teal-700' : 'bg-indigo-800'}`}
              aria-hidden="true"
            />
            <span>{filterByIndustryAvg ? 'Nov industry avg:' : 'Nov role trend:'}</span>
            <strong className="font-mono text-slate-900 tabular-nums">{formatINR(activeLatestAvg)}/mo</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3.5 border-t-2 border-dashed border-emerald-600" aria-hidden="true" />
            <span>Offered mid:</span>
            <strong className="font-mono text-emerald-700 tabular-nums">{formatINR(offeredMid)}/mo</strong>
          </span>
        </div>

        <span className="font-mono font-semibold text-slate-700 tabular-nums">
          +{activeYoyGrowth}% YoY
        </span>
      </div>
    </div>
  );
};
