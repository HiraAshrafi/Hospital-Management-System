"use client";

import { ArrowLeft, CalendarOff, Mail, MapPin, Pencil, Phone, Plane, Plus, Stethoscope, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppointmentStatusBadge, AppointmentTypeBadge } from "@/components/hms/badges";
import { VisitsChart } from "@/components/hms/charts";
import { DoctorFormModal } from "@/components/hms/DoctorFormModal";
import { SimpleFormModal } from "@/components/SimpleFormModal";
import { Alert, Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, Pagination, Select, Spinner, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { APPOINTMENT_STATUS, appointmentType, doctorName, formatDay, formatMoney, formatTime, WEEKDAYS } from "@/lib/hms";
import type { Appointment, Doctor, DoctorLeave, DoctorPerformance } from "@/lib/types";
import { useList, useResource } from "@/lib/useList";

type Tab = "overview" | "performance" | "leave" | "appointments";

function Kpi({ label, value, hint, tone = "text-navy" }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function Performance({ doctorId }: { doctorId: number }) {
  const [period, setPeriod] = useState("30d");
  const { data, error } = useResource<DoctorPerformance>(`/doctors/${doctorId}/performance/?period=${period}`);
  if (error) return <Alert>{error}</Alert>;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{data ? `${formatDay(data.start)} – ${formatDay(data.end)}` : "…"}</p>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:w-44" aria-label="Period">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="365d">Last 12 months</option>
        </Select>
      </div>
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Completed visits" value={data.completed} hint={`${data.total} booked in period · ${data.avg_per_day}/day`} tone="text-primary" />
            <Kpi label="Completion rate" value={data.completion_rate === null ? "—" : `${data.completion_rate}%`} hint="of finished appointments" tone="text-accent" />
            <Kpi label="No-show rate" value={data.no_show_rate === null ? "—" : `${data.no_show_rate}%`} hint={`${data.cancelled} cancelled`} tone="text-danger" />
            <Kpi label="Revenue" value={formatMoney(data.revenue)} hint={`${data.patients} unique patients`} tone="text-violet" />
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Last 12 months" subtitle="Appointments per month" />
              <VisitsChart data={data.monthly.map((m) => ({ month: m.month, label: m.label.slice(0, 3), completed: m.completed, missed: Math.max(0, m.total - m.completed) }))} />
            </Card>
            <Card>
              <CardHeader title="By visit type" subtitle="In the selected period" />
              <ul className="space-y-3 px-5 pb-5">
                {data.by_type.length === 0 && <li className="text-sm text-muted">No appointments in this period.</li>}
                {data.by_type.map((t) => {
                  const pct = data.total ? Math.round((t.count / data.total) * 100) : 0;
                  return (
                    <li key={t.type}>
                      <div className="flex justify-between text-sm">
                        <span>{appointmentType(t.type).label}</span>
                        <span className="font-semibold tabular-nums">{t.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-chart-track">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-border px-5 py-3 text-xs text-muted">{data.upcoming} upcoming appointment(s) booked</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function LeaveTab({ doctor }: { doctor: Doctor }) {
  const { can } = useAuth();
  const { data, error, reload } = useResource<DoctorLeave[]>(`/doctor-leaves/?doctor=${doctor.id}`);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<DoctorLeave | null>(null);
  const [actionError, setActionError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader
        title="Leave & time off"
        subtitle="The doctor can't be booked on these days"
        action={can("doctors.manage") && (
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add leave
          </Button>
        )}
      />
      <div className="px-5 pb-5">
        {(error || actionError) && <Alert>{error || actionError}</Alert>}
        {!data ? (
          <Spinner />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted">No leave recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((l) => {
              const current = l.start_date <= today && l.end_date >= today;
              const past = l.end_date < today;
              return (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${current ? "bg-warning-soft text-warning" : past ? "bg-surface-muted text-muted" : "bg-primary-soft text-primary"}`}>
                    <Plane className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {formatDay(l.start_date)}
                      {l.end_date !== l.start_date && ` – ${formatDay(l.end_date)}`}
                      {current && <Badge tone="warning">On leave now</Badge>}
                    </p>
                    <p className="text-sm text-muted">{l.reason || "No reason given"}</p>
                    {l.affected_appointments > 0 && (
                      <p className="mt-0.5 text-xs font-semibold text-danger">
                        {l.affected_appointments} scheduled appointment(s) fall in this leave. Reschedule or cancel them.
                      </p>
                    )}
                  </div>
                  {can("doctors.manage") && !past && (
                    <Button variant="ghost" className="px-2 py-1 hover:text-danger" title="Remove" onClick={() => setDeleting(l)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {adding && (
        <SimpleFormModal
          title={`Add leave for ${doctorName(doctor.full_name)}`}
          fields={[
            { name: "start_date", label: "From", type: "date", required: true, span: 1 },
            { name: "end_date", label: "To", type: "date", required: true, span: 1 },
            { name: "reason", label: "Reason", placeholder: "e.g. Annual leave, conference" },
          ]}
          initial={{ start_date: today, end_date: today }}
          path="/doctor-leaves/"
          method="POST"
          extra={{ doctor: doctor.id }}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Remove leave"
        message="Remove this leave? The doctor becomes bookable on these days again."
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            await api(`/doctor-leaves/${deleting?.id}/`, { method: "DELETE" });
            reload();
          } catch (err) {
            setActionError(errorMessage(err));
          } finally {
            setDeleting(null);
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}

function AppointmentsTab({ doctorId }: { doctorId: number }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, error } = useList<Appointment>("/appointments/", { doctor: doctorId, status, page, page_size: 12, ordering: "-date" });
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Appointment history"
        action={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Status">
            <option value="">All status</option>
            {Object.entries(APPOINTMENT_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </Select>
        }
      />
      {error && <div className="px-5"><Alert>{error}</Alert></div>}
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Patient</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 font-semibold">Fee</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.results.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-muted">
                    <td className="whitespace-nowrap px-5 py-3">
                      <p className="font-semibold">{formatDay(a.date)}</p>
                      <p className="text-xs text-muted">{formatTime(a.time)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/patients/${a.patient}`} className="font-semibold hover:text-primary">{a.patient_info.full_name}</Link>
                      <p className="text-xs text-muted">{a.patient_info.mrn}{a.reason && ` · ${a.reason}`}</p>
                    </td>
                    <td className="px-5 py-3"><AppointmentTypeBadge type={a.type} /></td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(a.fee)}</td>
                    <td className="px-5 py-3"><AppointmentStatusBadge status={a.status} /></td>
                  </tr>
                ))}
                {data.results.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">No appointments.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={12} count={data.count} onChange={setPage} />
        </>
      )}
    </Card>
  );
}

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data: d, error, reload } = useResource<Doctor>(`/doctors/${id}/`);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const upcoming = useList<Appointment>(d ? "/appointments/" : null, { doctor: id, status: "scheduled", when: "upcoming", ordering: "date", page_size: 6 });

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/doctors" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Doctors</Link>
        <Alert>{error}</Alert>
      </div>
    );
  }
  if (!d) return <div className="flex justify-center py-20"><Spinner /></div>;

  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "performance", label: "Performance" },
    { value: "leave", label: "Leave" },
    ...(can("appointments.view") ? [{ value: "appointments" as Tab, label: "Appointments" }] : []),
  ];

  return (
    <div className="space-y-5">
      <Link href="/doctors" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> All doctors
      </Link>

      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary-bright to-accent-bright" />
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={d.full_name} email={d.email || d.full_name} size={64} />
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-navy">
                {doctorName(d.full_name)}
                {d.on_leave_today ? <Badge tone="warning">On leave today</Badge> : d.is_active ? <Badge tone="success">Available</Badge> : <Badge tone="neutral">Not taking appointments</Badge>}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {[d.designation, d.specialization, d.department_name].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {d.qualification || "Qualification not set"} · {d.experience_years} yrs experience · Fee <strong className="text-foreground">{formatMoney(d.consultation_fee)}</strong>
              </p>
            </div>
          </div>
          {can("doctors.manage") && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit profile & schedule
            </Button>
          )}
        </div>
      </Card>

      <Tabs label="Doctor sections" value={tab} onChange={setTab} options={tabs} />

      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Weekly schedule" subtitle="Bookable hours per day" />
            <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
              {WEEKDAYS.map(({ value, label }) => {
                const row = d.schedules.find((s) => s.weekday === value && s.is_active);
                return (
                  <li key={value} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${row ? "border-border" : "border-dashed border-border bg-surface-muted/60"}`}>
                    <span className={`flex h-9 w-12 items-center justify-center rounded-lg text-xs font-bold ${row ? "bg-primary text-white" : "bg-surface text-muted"}`}>{label}</span>
                    {row ? (
                      <span className="text-sm">
                        <span className="font-semibold">{formatTime(row.start_time)} – {formatTime(row.end_time)}</span>
                        <span className="block text-xs text-muted">
                          {row.slot_minutes}-min slots{row.max_patients ? ` · max ${row.max_patients} patients` : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-muted"><CalendarOff className="h-4 w-4" /> Off</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Contact & chamber" />
              <div className="space-y-2 px-5 pb-5 text-sm">
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted" /> {d.phone || "—"}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted" /> {d.email || "—"}</p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted" /> {d.chamber || "—"}</p>
                <p className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-muted" /> Reg. no. {d.registration_no || "—"}</p>
                <p className="pt-1 text-xs text-muted">{d.user_email ? `Logs in as ${d.user_email}` : "No login account linked"}</p>
              </div>
            </Card>
            {can("appointments.view") && (
              <Card>
                <CardHeader title="Upcoming appointments" />
                <ul className="space-y-1 px-3 pb-4">
                  {upcoming.data?.results.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted">
                      <span className="rounded-lg bg-primary-soft px-2 py-1 text-center text-[11px] font-bold leading-tight text-primary">
                        {formatDay(a.date, { day: "2-digit", month: "short" })}
                        <br />
                        {formatTime(a.time)}
                      </span>
                      <Link href={`/patients/${a.patient}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold hover:text-primary">{a.patient_info.full_name}</span>
                        <span className="block truncate text-xs text-muted">{a.reason || a.patient_info.mrn}</span>
                      </Link>
                    </li>
                  ))}
                  {upcoming.data && upcoming.data.results.length === 0 && <li className="px-2 py-2 text-sm text-muted">Nothing booked.</li>}
                </ul>
              </Card>
            )}
          </div>
          {d.bio && (
            <Card className="xl:col-span-3">
              <CardHeader title="About" />
              <p className="whitespace-pre-line px-5 pb-5 text-sm text-muted">{d.bio}</p>
            </Card>
          )}
        </div>
      )}
      {tab === "performance" && <Performance doctorId={d.id} />}
      {tab === "leave" && <LeaveTab doctor={d} />}
      {tab === "appointments" && <AppointmentsTab doctorId={d.id} />}

      {editing && (
        <DoctorFormModal
          doctor={d}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
