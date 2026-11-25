import React, { useEffect, useMemo, useState } from 'react';
import { Video } from 'lucide-react';
import { buildInterviewPrepChecklist } from '../shared/interviewPrep';
import type { JobPosting } from '../shared/types';

interface InterviewPrepChecklistProps {
  job: JobPosting;
}

export const InterviewPrepChecklist: React.FC<InterviewPrepChecklistProps> = ({ job }) => {
  const questions = useMemo(() => buildInterviewPrepChecklist(job), [job]);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  useEffect(() => {
    setCheckedIds([]);
  }, [job.id]);

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section
      aria-labelledby="interview-prep-heading"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 id="interview-prep-heading" className="text-xs font-bold text-slate-900">
            Interview Preparation
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            3-point question checklist tailored to {job.requiredSkills.slice(0, 3).join(', ') || job.sector} for your{' '}
            {job.interviewFormat}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 tabular-nums">
          <Video className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
          <span className="font-mono text-indigo-700">
            {checkedIds.length}/{questions.length} Practiced
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {questions.map((item, idx) => {
          const isChecked = checkedIds.includes(item.id);
          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 py-3 first:pt-3 last:pb-0.5 transition-colors hover:bg-slate-50/70"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleChecked(item.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-indigo-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono font-semibold text-slate-400 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <span className="font-semibold text-indigo-700">Skill focus: {item.skill}</span>
                </div>
                <p
                  className={`mt-1 text-sm font-semibold leading-snug ${
                    isChecked ? 'text-slate-500 line-through' : 'text-slate-900'
                  }`}
                >
                  {item.question}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.prepTip}</p>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
};
