"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { VisitsChart } from "@/components/hms/charts";
import { Alert, Avatar, Badge, Button, Card, CardHeader, Input, Modal, Select, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { doctorName, formatDay, formatMoney } from "@/lib/hms";
import type { DepartmentAnalyticsRow, Doctor, Paginated } from "@/lib/types";
import { useResource } from "@/lib/useList";

type Resp = { period: string; start: string; end: string; results: DepartmentAnalyticsRow[] };
type Detail = { period: string; start: string; end: string } & DepartmentAnalyticsRow;

function Rate({ value, good }: { value: number | null; good: boolean }) {
  if (value === null) return <span className="text-muted">—</span>;
  return <span className={`font-semibold tabular-nums ${good ? "text-success" : "text-danger"}`}>{value}%</span>;
}

function DepartmentDetail({ id, period, onClose }: { id: number; period: string; onClose: () => void }) {
  const { data, error } = useResource<Detail>(`/departments/${id}/analytics/?period=${period}`);
  return (
    <Modal open title={data ? `${data.name} · performance` : "Department performance"} onClose={onClose} width="max-w-4xl">
      {error && <Alert>{error}</Alert>}
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Completed visits", data.completed, "text-primary"],
              ["Unique patients", data.patients, "text-accent"],
              ["No-show rate", data.no_show_rate === null ? "—" : `${data.no_show_rate}%`, "text-danger"],
              ["Revenue", formatMoney(data.revenue), "text-violet"],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-muted">{label}</p>
                <p className={`text-xl font-extrabold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader title="Last 12 months" />
            <VisitsChart data={(data.monthly ?? []).map((m) => ({ month: m.month, label: m.label.slice(0, 3), completed: m.completed, missed: Math.max(0, m.total - m.completed) }))} />
          </Card>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Doctor</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Completed</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Patients</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Completion</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.doctors_table ?? []).map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/doctors/${d.id}`} className="font-semibold hover:text-primary">{doctorName(d.full_name)}</Link>
                      <p className="text-xs text-muted">{d.specialization}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{d.completed}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{d.patients}</td>
                    <td className="px-4 py-2.5 text-right"><Rate value={d.completion_rate} good={(d.completion_rate ?? 0) >= 80} /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function DepartmentAnalytics() {
  const [period, setPeriod] = useState("30d");
  const [open, setOpen] = useState<number | null>(null);
  const { data, error } = useResource<Resp>(`/departments/analytics/?period=${period}`);
  const max = useMemo(() => Math.max(1, ...(data?.results ?? []).map((r) => r.completed)), [data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Department performance"
        subtitle={data ? `${formatDay(data.start)} – ${formatDay(data.end)}` : ""}
        action={
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:w-44" aria-label="Period">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last 12 months</option>
          </Select>
        }
      />
      {error && <div className="px-5"><Alert>{error}</Alert></div>}
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-surface-muted text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Completed visits</th>
                <th className="px-5 py-3 text-right font-semibold">Patients</th>
                <th className="px-5 py-3 text-right font-semibold">Doctors</th>
                <th className="px-5 py-3 text-right font-semibold">Completion</th>
                <th className="px-5 py-3 text-right font-semibold">No-show</th>
                <th className="px-5 py-3 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.results.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-surface-muted" onClick={() => setOpen(r.id)}>
                  <td className="px-5 py-3">
                    <p className="font-semibold hover:text-primary">{r.name}</p>
                    {!r.is_active && <Badge tone="neutral">Inactive</Badge>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-chart-track">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.completed / max) * 100}%` }} />
                      </div>
                      <span className="font-semibold tabular-nums">{r.completed}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.patients}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.doctors}</td>
                  <td className="px-5 py-3 text-right"><Rate value={r.completion_rate} good={(r.completion_rate ?? 0) >= 80} /></td>
                  <td className="px-5 py-3 text-right"><Rate value={r.no_show_rate} good={(r.no_show_rate ?? 0) < 10} /></td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatMoney(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open !== null && <DepartmentDetail id={open} period={period} onClose={() => setOpen(null)} />}
    </Card>
  );
}

export function AssignDoctorsModal({ departmentId, departmentName, onClose, onSaved }: { departmentId: number; departmentName: string; onClose: () => void; onSaved: () => void }) {
  const { data } = useResource<Paginated<Doctor>>(`/doctors/${buildQuery({ page_size: 100 })}`);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const list = (data?.results ?? []).filter((d) => d.department !== departmentId && `${d.full_name} ${d.specialization} ${d.department_name}`.toLowerCase().includes(query.toLowerCase()));

  async function save() {
    setSaving(true);
    try {
      await api(`/departments/${departmentId}/assign_doctors/`, { method: "POST", body: { doctors: [...picked] } });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Assign doctors to ${departmentName}`} onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search doctors in other departments" className="pl-9" />
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {!data && <li className="p-4"><Spinner /></li>}
          {list.map((d) => (
            <li key={d.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-muted">
                <input
                  type="checkbox"
                  checked={picked.has(d.id)}
                  onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; })}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <Avatar name={d.full_name} email={d.email || d.full_name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{doctorName(d.full_name)}</span>
                  <span className="block truncate text-xs text-muted">{d.specialization} · now in {d.department_name || "no department"}</span>
                </span>
              </label>
            </li>
          ))}
          {data && list.length === 0 && <li className="px-3 py-4 text-sm text-muted">No other doctors match.</li>}
        </ul>
        <p className="text-xs text-muted">Moving a doctor removes them as head of their old department.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={picked.size === 0}>
            Assign {picked.size || ""} doctor{picked.size === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
