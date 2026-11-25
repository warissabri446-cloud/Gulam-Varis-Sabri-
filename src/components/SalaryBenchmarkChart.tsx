import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { formatINR } from '../shared/matching';
import { computeCityBenchmark } from '../shared/salaryAnalytics';
import type { JobPosting } from '../shared/types';

interface SalaryBenchmarkChartProps {
  job: JobPosting;
  allJobs: JobPosting[];
  embedded?: boolean;
}

export const SalaryBenchmarkChart: React.FC<SalaryBenchmarkChartProps> = ({
  job,
  allJobs,
  embedded = false,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { bars, cityAverage, roleMid, deltaPct, sampleSource } = useMemo(() => {
    const benchmark = computeCityBenchmark(job, allJobs);
    const shortCity = job.city.replace(' (All India)', '');

    const chartBars = [
      {
        id: 'min',
        label: 'Role Min',
        value: job.salaryMin,
        color: '#6366F1',
      },
      {
        id: 'avg',
        label: `${shortCity} Avg`,
        value: benchmark.cityAverage,
        color: '#64748B',
      },
      {
        id: 'max',
        label: 'Role Max',
        value: job.salaryMax,
        color: '#1E40AF',
      },
    ];

    return {
      bars: chartBars,
      cityAverage: benchmark.cityAverage,
      roleMid: benchmark.roleMid,
      deltaPct: benchmark.deltaPct,
      sampleSource: benchmark.sampleSource,
    };
  }, [job, allJobs]);

  const width = 460;
  const height = 160;
  const margin = { top: 22, right: 16, bottom: 28, left: 54 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = useMemo(
    () =>
      d3
        .scaleBand<string>()
        .domain(bars.map((b) => b.id))
        .range([0, innerW])
        .padding(0.38),
    [bars, innerW]
  );

  const maxVal = useMemo(() => {
    const rawMax = d3.max(bars, (b) => b.value) ?? 50000;
    return Math.ceil((rawMax * 1.15) / 5000) * 5000;
  }, [bars]);

  const yScale = useMemo(() => d3.scaleLinear().domain([0, maxVal]).range([innerH, 0]).nice(), [maxVal, innerH]);

  const ticks = useMemo(() => yScale.ticks(3), [yScale]);
  const avgLineY = yScale(cityAverage);

  const containerClass = embedded ? '' : 'rounded-xl border border-slate-200 bg-white p-4';

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-900">
            Salary Comparison vs. {job.city} Average
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{sampleSource}</p>
        </div>

        <span
          className={`font-mono text-xs font-bold tabular-nums ${
            deltaPct >= 0 ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {deltaPct > 0
            ? `+${deltaPct}% above city avg`
            : deltaPct === 0
            ? 'At city average'
            : `${deltaPct}% vs city avg`}
        </span>
      </div>

      <div className="mt-3 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Bar chart comparing ${job.postTitle} salary (${formatINR(job.salaryMin)} to ${formatINR(
            job.salaryMax
          )}) against ${job.city} average (${formatINR(cityAverage)})`}
          className="h-auto w-full overflow-visible"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {ticks.map((tick) => {
              const y = yScale(tick);
              return (
                <g key={tick}>
                  <line x1={0} x2={innerW} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <text
                    x={-8}
                    y={y}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-slate-500 font-mono text-[10px] tabular-nums"
                  >
                    {tick === 0 ? '₹0' : `₹${Math.round(tick / 1000)}k`}
                  </text>
                </g>
              );
            })}

            <line
              x1={0}
              x2={innerW}
              y1={avgLineY}
              y2={avgLineY}
              stroke="#475569"
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />

            {bars.map((bar) => {
              const x = xScale(bar.id) ?? 0;
              const barW = xScale.bandwidth();
              const y = yScale(bar.value);
              const barH = Math.max(0, innerH - y);
              const isHovered = hoveredId === bar.id;

              return (
                <g
                  key={bar.id}
                  onMouseEnter={() => setHoveredId(bar.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx={5}
                    fill={bar.color}
                    opacity={hoveredId && !isHovered ? 0.6 : 1}
                    className="transition-opacity duration-150"
                  />
                  <text
                    x={x + barW / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="fill-slate-800 font-mono text-[10px] font-semibold tabular-nums"
                  >
                    {formatINR(bar.value)}
                  </text>
                  <text
                    x={x + barW / 2}
                    y={innerH + 16}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-medium"
                  >
                    {bar.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
        <span>
          Role midpoint:{' '}
          <strong className="font-mono text-slate-900 tabular-nums">{formatINR(roleMid)}/mo</strong>
        </span>
        <span>
          {job.city} similar roles avg:{' '}
          <strong className="font-mono text-slate-900 tabular-nums">{formatINR(cityAverage)}/mo</strong>
        </span>
      </div>
    </div>
  );
};
