"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppointmentStatusBadge } from "@/components/hms/badges";
import { Alert, Button, Card, Spinner } from "@/components/ui";
import { buildQuery } from "@/lib/api";
import { doctorName, formatDay, formatTime } from "@/lib/hms";
import type { CalendarResponse } from "@/lib/types";
import { useResource } from "@/lib/useList";

const WEEK = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const DOT: Record<string, string> = { scheduled: "bg-primary", completed: "bg-success", cancelled: "bg-danger", no_show: "bg-warning" };

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Month grid starting on Saturday, with per-day appointment counts. Clicking a day lists its appointments. */
export function AppointmentCalendar({ filters }: { filters: Record<string, string | number | boolean | undefined> }) {
  const today = iso(new Date());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  // Grid: from the Saturday on/before the 1st, 6 weeks.
  const { gridStart, gridEnd, cells } = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 1) % 7; // Sat=0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    const days = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return { gridStart: iso(days[0]), gridEnd: iso(days[41]), cells: days };
  }, [month]);

  const { data, error } = useResource<CalendarResponse>(`/appointments/calendar/${buildQuery({ ...filters, start: gridStart, end: gridEnd })}`);
  const byDay = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);
  const dayItems = (data?.appointments ?? []).filter((a) => a.date === selected);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg font-extrabold text-navy">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="px-2 py-1.5" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              onClick={() => {
                const d = new Date();
                setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                setSelected(today);
              }}
            >
              Today
            </Button>
            <Button variant="ghost" className="px-2 py-1.5" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && <div className="p-4"><Alert>{error}</Alert></div>}
        <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-center text-xs font-semibold text-muted">
          {WEEK.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d) => {
            const key = iso(d);
            const info = byDay.get(key);
            const inMonth = d.getMonth() === month.getMonth();
            const isSel = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`min-h-[86px] border-b border-r border-border p-2 text-left transition-colors last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                  isSel ? "bg-primary-soft" : "hover:bg-surface-muted"
                } ${inMonth ? "" : "bg-surface-muted/40 text-muted"}`}
                aria-label={`${formatDay(key)}: ${info?.total ?? 0} appointments`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${key === today ? "bg-primary text-white" : ""}`}>
                  {d.getDate()}
                </span>
                {info && info.total > 0 && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs font-bold text-navy">{info.total} appt{info.total === 1 ? "" : "s"}</p>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-chart-track">
                      {(["completed", "scheduled", "no_show", "cancelled"] as const).map((s) =>
                        info[s] ? <span key={s} className={DOT[s]} style={{ width: `${((info[s] ?? 0) / info.total) * 100}%` }} /> : null,
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 px-5 py-3 text-xs text-muted">
          {[["scheduled", "Scheduled"], ["completed", "Completed"], ["no_show", "No-show"], ["cancelled", "Cancelled"]].map(([k, l]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${DOT[k]}`} /> {l}
            </span>
          ))}
        </div>
      </Card>

      <Card className="flex max-h-[720px] flex-col overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-bold text-navy">{formatDay(selected, { weekday: "long", day: "numeric", month: "long" })}</h3>
          <p className="text-xs text-muted">{dayItems.length} appointment{dayItems.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!data ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : dayItems.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nothing booked on this day.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dayItems.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="w-16 shrink-0 text-sm font-bold tabular-nums">{formatTime(a.time)}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${a.patient}`} className="block truncate text-sm font-semibold hover:text-primary">{a.patient_name}</Link>
                    <p className="truncate text-xs text-muted">{doctorName(a.doctor_name)} · {a.department_name || a.mrn}</p>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
