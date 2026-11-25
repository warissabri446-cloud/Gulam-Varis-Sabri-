import React, { useMemo } from 'react';
import { CalendarDays, Check, Slash } from 'lucide-react';
import {
  getNextSevenDays,
  INTERVIEW_TIME_SLOTS,
  makeSlotKey,
  summarizeAvailability,
} from '../shared/availability';

interface InterviewAvailabilityCalendarProps {
  mode: 'candidate' | 'employer';
  busySlots: string[];
  availabilityNote?: string;
  onChangeBusySlots?: (nextBusySlots: string[]) => void;
  onChangeAvailabilityNote?: (note: string) => void;
  selectedDate?: string;
  selectedTime?: string;
  onSelectFreeSlot?: (isoDate: string, timeSlot: string) => void;
  saving?: boolean;
}

export const InterviewAvailabilityCalendar: React.FC<InterviewAvailabilityCalendarProps> = ({
  mode,
  busySlots,
  availabilityNote = '',
  onChangeBusySlots,
  onChangeAvailabilityNote,
  selectedDate,
  selectedTime,
  onSelectFreeSlot,
  saving = false,
}) => {
  const days = useMemo(() => getNextSevenDays(), []);
  const busySet = useMemo(() => new Set(busySlots), [busySlots]);
  const summary = useMemo(() => summarizeAvailability(busySlots), [busySlots]);

  const handleToggleSlot = (isoDate: string, timeSlot: string) => {
    const key = makeSlotKey(isoDate, timeSlot);
    if (mode === 'candidate') {
      if (!onChangeBusySlots) return;
      const next = new Set(busySlots);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onChangeBusySlots(Array.from(next));
      return;
    }

    // Employer mode: only free slots can be selected to schedule an interview
    if (!busySet.has(key) && onSelectFreeSlot) {
      onSelectFreeSlot(isoDate, timeSlot);
    }
  };

  const handleToggleEntireDay = (isoDate: string) => {
    if (mode !== 'candidate' || !onChangeBusySlots) return;
    const dayKeys = INTERVIEW_TIME_SLOTS.map((slot) => makeSlotKey(isoDate, slot));
    const allBusy = dayKeys.every((k) => busySet.has(k));
    const next = new Set(busySlots);
    if (allBusy) {
      dayKeys.forEach((k) => next.delete(k));
    } else {
      dayKeys.forEach((k) => next.add(k));
    }
    onChangeBusySlots(Array.from(next));
  };

  const handleClearAllBusy = () => {
    if (mode !== 'candidate' || !onChangeBusySlots) return;
    onChangeBusySlots([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
            <CalendarDays className="h-4 w-4 text-indigo-700" aria-hidden="true" />
            <span>
              {mode === 'candidate'
                ? '04. Interview Availability Calendar'
                : 'Candidate Free / Busy Interview Calendar (Next 7 Days)'}
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {mode === 'candidate'
              ? 'Click any time slot to mark yourself Busy. Open green slots tell employers when they can schedule your online video interview.'
              : 'Click any open green slot below to auto-fill the interview date and IST time. Blocked slots are marked Busy by the candidate.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
          <span className="font-mono font-semibold text-emerald-700">
            {summary.freeCount} Free
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="font-mono font-semibold text-slate-600">
            {summary.busyCount} Busy
          </span>
          {mode === 'candidate' && busySlots.length > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={handleClearAllBusy}
                className="font-semibold text-indigo-700 hover:text-indigo-800"
              >
                Mark all free
              </button>
            </>
          )}
          {saving && (
            <span className="font-mono text-[11px] text-slate-500">Saving...</span>
          )}
        </div>
      </div>

      {/* 7-Day Schedule Matrix */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th
                scope="col"
                className="w-28 px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500"
              >
                IST Slot
              </th>
              {days.map((day) => {
                const allDayBusy = INTERVIEW_TIME_SLOTS.every((slot) =>
                  busySet.has(makeSlotKey(day.isoDate, slot))
                );
                return (
                  <th
                    key={day.isoDate}
                    scope="col"
                    className="border-l border-slate-200 px-2 py-2 text-center"
                  >
                    <div className="font-semibold text-slate-900">
                      {day.weekdayShort}
                      {day.isToday ? ' (Today)' : ''}
                    </div>
                    <div className="font-mono text-[11px] font-normal text-slate-500 tabular-nums">
                      {day.dateShort}
                    </div>
                    {mode === 'candidate' && (
                      <button
                        type="button"
                        onClick={() => handleToggleEntireDay(day.isoDate)}
                        className="mt-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        {allDayBusy ? 'Free day' : 'Block day'}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {INTERVIEW_TIME_SLOTS.map((slot) => (
              <tr key={slot}>
                <th
                  scope="row"
                  className="bg-slate-50/50 px-3 py-2 text-left font-mono text-[11px] font-semibold text-slate-700 tabular-nums whitespace-nowrap"
                >
                  {slot.replace(' IST', '')}
                </th>
                {days.map((day) => {
                  const isBusy = busySet.has(makeSlotKey(day.isoDate, slot));
                  const isSelected =
                    mode === 'employer' &&
                    selectedDate === day.isoDate &&
                    selectedTime === slot;

                  return (
                    <td key={day.isoDate} className="border-l border-slate-100 p-1">
                      <button
                        type="button"
                        disabled={mode === 'employer' && isBusy}
                        onClick={() => handleToggleSlot(day.isoDate, slot)}
                        aria-pressed={mode === 'candidate' ? isBusy : isSelected}
                        aria-label={`${day.weekdayShort} ${day.dateShort} ${slot} — ${
                          isBusy ? 'Busy' : 'Free'
                        }`}
                        className={`flex w-full items-center justify-center gap-1 rounded-md border px-1.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? 'border-indigo-700 bg-indigo-700 text-white'
                            : isBusy
                            ? 'border-slate-200 bg-slate-100 text-slate-500 line-through disabled:cursor-not-allowed'
                            : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100/80'
                        }`}
                      >
                        {isBusy ? (
                          <>
                            <Slash className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Busy</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>{isSelected ? 'Picked' : 'Free'}</span>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mode === 'candidate' && onChangeAvailabilityNote && (
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Optional Scheduling Note for Recruiters
          </label>
          <input
            type="text"
            value={availabilityNote}
            onChange={(e) => onChangeAvailabilityNote(e.target.value)}
            placeholder="e.g. Available during lunch break (1–2 PM) or after 5:30 PM on weekdays"
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-700 focus:outline-none"
          />
        </div>
      )}

      {mode === 'employer' && availabilityNote && (
        <p className="text-xs text-slate-600">
          Candidate scheduling note: <strong className="font-medium text-slate-800">{availabilityNote}</strong>
        </p>
      )}
    </div>
  );
};
