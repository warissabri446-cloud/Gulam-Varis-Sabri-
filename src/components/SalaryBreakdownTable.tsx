import React, { useMemo, useState } from 'react';
import { formatINR } from '../shared/matching';
import { computeHistoricalSalaryTrend } from '../shared/salaryAnalytics';
import type { JobPosting } from '../shared/types';

interface SalaryBreakdownTableProps {
  job: JobPosting;
  allJobs: JobPosting[];
}

export const SalaryBreakdownTable: React.FC<SalaryBreakdownTableProps> = ({ job, allJobs }) => {
  const [sortOrder, setSortOrder] = useState<'latest' | 'chronological'>('latest');

  const {
    points,
    twelveMonthAvg,
    industryTwelveMonthAvg,
    offeredMid,
    offerVsTwelveMonthAvgPct,
  } = useMemo(() => computeHistoricalSalaryTrend(job, allJobs), [job, allJobs]);

  const orderedPoints = useMemo(() => {
    return sortOrder === 'latest' ? [...points].reverse() : points;
  }, [points, sortOrder]);

  return (
    <section
      aria-labelledby="salary-breakdown-table-heading"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 id="salary-breakdown-table-heading" className="text-xs font-bold text-slate-900">
            Salary Breakdown Table
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Month-by-month raw salary figures (Dec 2025 – Nov 2026) for {job.city} &amp; {job.sector}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSortOrder('latest')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              sortOrder === 'latest'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Latest First
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('chronological')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              sortOrder === 'chronological'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chronological
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Month
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                Offered Mid
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                Role Avg ({job.city.replace(' (All India)', '')})
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                Industry Avg
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold whitespace-nowrap">
                Offer vs. Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orderedPoints.map((row) => {
              const delta = row.offeredMid - row.marketAvg;
              const deltaSign = row.deltaFromMarketPct > 0 ? '+' : '';
              const deltaClass =
                row.deltaFromMarketPct > 0
                  ? 'text-emerald-700'
                  : row.deltaFromMarketPct < 0
                  ? 'text-amber-700'
                  : 'text-slate-700';

              return (
                <tr key={row.month} className="transition-colors hover:bg-slate-50">
                  <td className="py-2 pr-3 font-medium text-slate-800 whitespace-nowrap">
                    {row.fullDate}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {formatINR(row.offeredMid)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-700 tabular-nums whitespace-nowrap">
                    {formatINR(row.marketAvg)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-teal-700 tabular-nums whitespace-nowrap">
                    {formatINR(row.industryAvg)}
                  </td>
                  <td className={`py-2 pl-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${deltaClass}`}>
                    {delta >= 0 ? `+${formatINR(delta)}` : `-${formatINR(Math.abs(delta))}`} ({deltaSign}
                    {row.deltaFromMarketPct}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/80 text-xs font-bold">
              <td className="py-2.5 pr-3 text-slate-900 whitespace-nowrap">12-Month Average</td>
              <td className="px-3 py-2.5 text-right font-mono text-slate-900 tabular-nums whitespace-nowrap">
                {formatINR(offeredMid)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-indigo-800 tabular-nums whitespace-nowrap">
                {formatINR(twelveMonthAvg)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-teal-800 tabular-nums whitespace-nowrap">
                {formatINR(industryTwelveMonthAvg)}
              </td>
              <td
                className={`py-2.5 pl-3 text-right font-mono tabular-nums whitespace-nowrap ${
                  offerVsTwelveMonthAvgPct >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {offerVsTwelveMonthAvgPct > 0
                  ? `+${offerVsTwelveMonthAvgPct}%`
                  : `${offerVsTwelveMonthAvgPct}%`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};
