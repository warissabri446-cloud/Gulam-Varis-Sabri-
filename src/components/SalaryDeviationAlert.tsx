import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { formatINR } from '../shared/matching';
import { computeSalaryDeviation } from '../shared/salaryAnalytics';
import type { JobPosting } from '../shared/types';

interface SalaryDeviationAlertProps {
  job: JobPosting;
  allJobs: JobPosting[];
}

export const SalaryDeviationAlert: React.FC<SalaryDeviationAlertProps> = ({ job, allJobs }) => {
  const deviation = useMemo(() => computeSalaryDeviation(job, allJobs), [job, allJobs]);

  const tone =
    deviation.status === 'above'
      ? {
          container: 'border-emerald-200 bg-emerald-50/70',
          iconWrap: 'text-emerald-700',
          heading: 'text-emerald-900',
          metric: 'text-emerald-800',
          subtext: 'text-emerald-800/80',
          Icon: CheckCircle2,
          guidance: `Offered pay is ${formatINR(deviation.deltaAmount)}/mo above the current market median.`,
        }
      : deviation.status === 'at'
      ? {
          container: 'border-amber-200 bg-amber-50/70',
          iconWrap: 'text-amber-700',
          heading: 'text-amber-900',
          metric: 'text-amber-800',
          subtext: 'text-amber-900/80',
          Icon: Scale,
          guidance:
            deviation.deltaAmount === 0
              ? 'Offered pay aligns directly with the current market median.'
              : `Offered pay is within ±5% (${deviation.deltaAmount > 0 ? '+' : '-'}${formatINR(
                  Math.abs(deviation.deltaAmount)
                )}/mo) of the market median.`,
        }
      : {
          container: 'border-red-200 bg-red-50/70',
          iconWrap: 'text-red-700',
          heading: 'text-red-900',
          metric: 'text-red-800',
          subtext: 'text-red-800/85',
          Icon: AlertTriangle,
          guidance: `Offered pay is ${formatINR(Math.abs(deviation.deltaAmount))}/mo below the current market median.`,
        };

  const StatusIcon = tone.Icon;
  const formattedDeltaPct =
    deviation.deltaPct > 0 ? `+${deviation.deltaPct}%` : `${deviation.deltaPct}%`;

  return (
    <div
      role="status"
      aria-label={`Salary Deviation Alert: ${deviation.label}`}
      className={`rounded-xl border px-4 py-3 ${tone.container}`}
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-start gap-2.5">
          <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconWrap}`} aria-hidden="true" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Salary Deviation Alert</span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className={`text-xs font-bold ${tone.heading}`}>{deviation.label}</span>
            </div>
            <p className={`mt-0.5 text-xs ${tone.subtext}`}>{tone.guidance}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{deviation.basisNote}</p>
          </div>
        </div>

        <div className="pl-6 sm:shrink-0 sm:pl-0 sm:text-right">
          <div className={`font-mono text-sm font-bold tabular-nums ${tone.metric}`}>
            {formattedDeltaPct} vs. median
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
            Offer {formatINR(deviation.offeredMid)} · Median {formatINR(deviation.marketMedian)}
          </div>
        </div>
      </div>
    </div>
  );
};
