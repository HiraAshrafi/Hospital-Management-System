"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useState } from "react";

/** Round a max value up to a tidy axis top with 4 even steps. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

type MonthRow = { month: string; label: string; completed: number; missed: number };

const SERIES = [
  { key: "completed" as const, label: "Completed visits", color: "var(--chart-1)" },
  { key: "missed" as const, label: "Cancelled & no-show", color: "var(--chart-2)" },
];

/**
 * Stacked monthly visits. Two categorical series (validated pair), legend always shown,
 * per-column hover/focus tooltip, and a table view (slot 2 is below 3:1 on white).
 */
export function VisitsChart({ data }: { data: MonthRow[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  const { top, ticks } = niceScale(Math.max(...data.map((d) => d.completed + d.missed)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted" aria-label="Legend">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === "chart" ? "Chart view" : "Table view"}
              className={`rounded-md p-1.5 ${view === v ? "bg-primary-soft text-primary" : "text-muted hover:text-foreground"}`}
            >
              {v === "chart" ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="px-5 pb-5">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-border">
                <th className="py-2 text-left font-semibold">Month</th>
                <th className="py-2 text-right font-semibold">Completed</th>
                <th className="py-2 text-right font-semibold">Cancelled &amp; no-show</th>
                <th className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {data.map((d) => (
                <tr key={d.month}>
                  <td className="py-2">{d.label}</td>
                  <td className="py-2 text-right">{d.completed}</td>
                  <td className="py-2 text-right">{d.missed}</td>
                  <td className="py-2 text-right font-semibold">{d.completed + d.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3 px-5 pb-5 pt-3">
          {/* y-axis labels */}
          <div className="relative h-60 w-8 shrink-0 text-right text-[11px] tabular-nums text-muted">
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
                {t}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="relative h-60">
              {/* recessive gridlines */}
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${(t / top) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end gap-2 sm:gap-4">
                {data.map((d, i) => {
                  const total = d.completed + d.missed;
                  return (
                    <div
                      key={d.month}
                      tabIndex={0}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      aria-label={`${d.label}: ${d.completed} completed, ${d.missed} cancelled or no-show`}
                      className="relative flex h-full flex-1 cursor-default items-end justify-center rounded-lg outline-none hover:bg-primary-soft/40 focus-visible:bg-primary-soft/60"
                    >
                      <div className="flex w-full max-w-9 flex-col justify-end gap-[2px]" style={{ height: `${(total / top) * 100}%` }}>
                        {d.missed > 0 && <div className="rounded-t-[4px]" style={{ flexGrow: d.missed, background: SERIES[1].color }} />}
                        {d.completed > 0 && (
                          <div className={d.missed > 0 ? "" : "rounded-t-[4px]"} style={{ flexGrow: d.completed, background: SERIES[0].color }} />
                        )}
                      </div>
                      {hover === i && (
                        <div className="pointer-events-none absolute bottom-full z-10 mb-2 w-44 rounded-xl border border-border bg-surface p-3 text-xs shadow-lg">
                          <p className="mb-1.5 font-bold">{d.label}</p>
                          {SERIES.map((s) => (
                            <p key={s.key} className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-muted">
                                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                                {s.key === "completed" ? "Completed" : "Missed"}
                              </span>
                              <span className="font-semibold tabular-nums">{d[s.key]}</span>
                            </p>
                          ))}
                          <p className="mt-1.5 flex justify-between border-t border-border pt-1.5">
                            <span className="text-muted">Total</span>
                            <span className="font-bold tabular-nums">{total}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 flex gap-2 sm:gap-4">
              {data.map((d) => (
                <span key={d.month} className="flex-1 text-center text-xs text-muted">
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars, one hue, value printed on each row; tail folded into "Other". */
export function RankedBars({ data, limit = 6 }: { data: { name: string; count: number }[]; limit?: number }) {
  const rows = data.length > limit ? [...data.slice(0, limit - 1), { name: "Other", count: data.slice(limit - 1).reduce((s, d) => s + d.count, 0) }] : data;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  if (rows.length === 0) return <p className="px-5 pb-5 text-sm text-muted">No visits in the last 30 days.</p>;
  return (
    <ul className="space-y-3 px-5 pb-5">
      {rows.map((r) => (
        <li key={r.name} title={`${r.name}: ${r.count} visits (${Math.round((r.count / total) * 100)}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{r.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              <span className="font-semibold text-foreground">{r.count}</span> · {Math.round((r.count / total) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-chart-track">
            <div className="h-2 rounded-full bg-chart-1" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Thin segmented bar with the figures beside it (status colours, always labelled). */
export function StatusSplit({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-chart-track" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => <div key={p.label} className={p.className} style={{ flexGrow: p.value }} />)}
      </div>
      <ul className="mt-4 space-y-2.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 text-muted">
              <span className={`h-2.5 w-2.5 rounded-sm ${p.className}`} />
              {p.label}
            </span>
            <span className="font-semibold tabular-nums">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
