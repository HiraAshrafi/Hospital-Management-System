"use client";

import { Copy } from "lucide-react";

import { WEEKDAYS } from "@/lib/hms";
import type { DoctorSchedule, Weekday } from "@/lib/types";

export interface DayRow {
  on: boolean;
  start: string;
  end: string;
  slot: string;
  max: string;
}

export type WeekState = Record<Weekday, DayRow>;

export function weekFromSchedules(rows: DoctorSchedule[] | undefined, fallback?: { days: Weekday[]; start: string | null; end: string | null }): WeekState {
  const week = {} as WeekState;
  for (const { value } of WEEKDAYS) {
    const row = rows?.find((r) => r.weekday === value);
    if (row) {
      week[value] = { on: row.is_active, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5), slot: String(row.slot_minutes), max: row.max_patients ? String(row.max_patients) : "" };
    } else {
      const on = rows && rows.length ? false : fallback ? fallback.days.length === 0 || fallback.days.includes(value) : value !== "fri";
      week[value] = { on, start: fallback?.start?.slice(0, 5) ?? "09:00", end: fallback?.end?.slice(0, 5) ?? "14:00", slot: "20", max: "" };
    }
  }
  return week;
}

export function schedulesFromWeek(week: WeekState): Omit<DoctorSchedule, "id">[] {
  return WEEKDAYS.filter(({ value }) => week[value].on).map(({ value }) => ({
    weekday: value,
    start_time: week[value].start,
    end_time: week[value].end,
    slot_minutes: Number(week[value].slot || 20),
    max_patients: week[value].max ? Number(week[value].max) : null,
    is_active: true,
  }));
}

const cell = "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary disabled:bg-surface-muted disabled:text-muted";

export function ScheduleEditor({ value, onChange }: { value: WeekState; onChange: (next: WeekState) => void }) {
  const set = (day: Weekday, patch: Partial<DayRow>) => onChange({ ...value, [day]: { ...value[day], ...patch } });
  const copyToAll = (day: Weekday) => {
    const src = value[day];
    const next = { ...value };
    for (const { value: d } of WEEKDAYS) if (next[d].on) next[d] = { ...next[d], start: src.start, end: src.end, slot: src.slot, max: src.max };
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-surface-muted text-xs text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Day</th>
            <th className="px-2 py-2 text-left font-semibold">From</th>
            <th className="px-2 py-2 text-left font-semibold">To</th>
            <th className="px-2 py-2 text-left font-semibold">Slot (min)</th>
            <th className="px-2 py-2 text-left font-semibold">Max patients</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {WEEKDAYS.map(({ value: day, label }) => {
            const row = value[day];
            const bad = row.on && row.start && row.end && row.end <= row.start;
            return (
              <tr key={day} className={row.on ? "" : "bg-surface-muted/50"}>
                <td className="px-3 py-1.5">
                  <label className="flex cursor-pointer items-center gap-2 font-semibold">
                    <input type="checkbox" checked={row.on} onChange={(e) => set(day, { on: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                    {label}
                  </label>
                </td>
                <td className="px-2 py-1.5">
                  <input type="time" value={row.start} disabled={!row.on} onChange={(e) => set(day, { start: e.target.value })} className={cell} aria-label={`${label} from`} required={row.on} />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="time"
                    value={row.end}
                    disabled={!row.on}
                    onChange={(e) => set(day, { end: e.target.value })}
                    className={`${cell} ${bad ? "border-danger" : ""}`}
                    aria-label={`${label} to`}
                    required={row.on}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select value={row.slot} disabled={!row.on} onChange={(e) => set(day, { slot: e.target.value })} className={cell} aria-label={`${label} slot length`}>
                    {[10, 15, 20, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={1} value={row.max} disabled={!row.on} placeholder="No limit" onChange={(e) => set(day, { max: e.target.value })} className={cell} aria-label={`${label} max patients`} />
                </td>
                <td className="px-2 py-1.5">
                  {row.on && (
                    <button type="button" onClick={() => copyToAll(day)} className="rounded-md p-1.5 text-muted hover:bg-primary-soft hover:text-primary" title="Copy these hours to all working days">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
