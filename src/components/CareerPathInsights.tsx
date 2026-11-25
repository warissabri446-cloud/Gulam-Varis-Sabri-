import React, { useMemo } from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
import { computeCareerPathInsights } from '../shared/careerPaths';
import type { JobPosting } from '../shared/types';

interface CareerPathInsightsProps {
  job: JobPosting;
}

export const CareerPathInsights: React.FC<CareerPathInsightsProps> = ({ job }) => {
  const insights = useMemo(() => computeCareerPathInsights(job), [job]);

  return (
    <section
      aria-labelledby="career-path-insights-heading"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 id="career-path-insights-heading" className="text-xs font-bold text-slate-900">
            Career Path Insights
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {insights.trackLabel} · Common next roles from {job.postTitle}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-[11px] font-medium text-slate-500">Avg. Time to First Promotion</div>
          <div className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
            <span>{insights.avgFirstPromotion}</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {insights.nextRoles.map((role, index) => (
          <div
            key={role.id}
            className="flex flex-col justify-between gap-2.5 py-3 first:pt-3 last:pb-0.5 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] font-semibold text-slate-400 tabular-nums">
                  {String(index + 1).padStart(2, '0')}.
                </span>
                <span className="text-sm font-semibold text-slate-900">{role.title}</span>
              </div>
              <p className="mt-0.5 pl-6 text-xs leading-relaxed text-slate-600">{role.keyMilestone}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 pl-6 text-[11px] text-slate-500 tabular-nums">
                <span>{role.cohortSharePct}% of peers advance here</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-semibold text-emerald-700">
                  +{role.payUpliftPct}% avg. pay step-up
                </span>
              </div>
            </div>

            <div className="pl-6 sm:shrink-0 sm:pl-0 sm:text-right">
              <div className="inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-700 tabular-nums">
                <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                <span>{role.avgTimeToPromotion}</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] font-medium text-slate-600 tabular-nums">
                Est. {role.estimatedSalaryRange}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
