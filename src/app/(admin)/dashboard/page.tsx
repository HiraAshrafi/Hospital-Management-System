"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  Stethoscope,
  UserPlus,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppointmentFormModal } from "@/components/hms/AppointmentFormModal";
import { AppointmentStatusBadge, AppointmentTypeBadge, BloodBadge } from "@/components/hms/badges";
import { RankedBars, StatusSplit, VisitsChart } from "@/components/hms/charts";
import { PatientDetailModal } from "@/components/hms/PatientDetailModal";
import { PatientFormModal } from "@/components/hms/PatientFormModal";
import { Alert, Avatar, Button, Card, CardHeader, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage, formatDate } from "@/lib/api";
import { doctorName, formatDay, formatMoney, formatShift, formatTime, GENDER_LABEL, trend } from "@/lib/hms";
import type { DashboardStats } from "@/lib/types";

function TrendPill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">No data last month</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  footer,
  href,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  footer: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="group rounded-2xl focus-visible:outline-offset-4">
      <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
          </div>
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">{footer}</div>
      </Card>
    </Link>
  );
}

function ViewAll({ href, children = "View all" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary hover:underline">
      {children} <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [booking, setBooking] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [viewingPatient, setViewingPatient] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<DashboardStats>("/dashboard/stats/")
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const today = stats.appointments_today;
  const nextUp = stats.today_appointments.find((a) => a.status === "scheduled");

  return (
    <div className="space-y-6">
      {/* Greeting + quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{formatDay(stats.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Welcome back, {user?.full_name || "Admin"}</h2>
          <p className="mt-1 text-sm text-muted">
            {today.total} appointments today · {stats.doctors_on_duty} doctors on duty · {stats.pending_requests} hospital requests to review
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setRegistering(true)}>
            <UserPlus className="h-4 w-4" /> Register patient
          </Button>
          <Button onClick={() => setBooking(true)}>
            <CalendarPlus className="h-4 w-4" /> Book appointment
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total patients"
          value={stats.total_patients.toLocaleString()}
          icon={UserRound}
          tone="bg-primary-soft text-primary"
          href="/patients"
          footer={
            <>
              <TrendPill value={trend(stats.new_patients_this_month, stats.new_patients_prev_period)} />
              <span>{stats.new_patients_this_month} new this month</span>
            </>
          }
        />
        <KpiCard
          label="Appointments this month"
          value={stats.appointments_this_month.toLocaleString()}
          icon={CalendarCheck}
          tone="bg-accent-soft text-accent"
          href="/appointments"
          footer={
            <>
              <TrendPill value={trend(stats.appointments_this_month, stats.appointments_prev_period)} />
              <span>vs same days last month</span>
            </>
          }
        />
        <KpiCard
          label="Doctors on duty today"
          value={`${stats.doctors_on_duty}/${stats.total_doctors}`}
          icon={Stethoscope}
          tone="bg-violet-soft text-violet"
          href="/doctors"
          footer={<span>Across {stats.total_departments} departments</span>}
        />
        <KpiCard
          label="Revenue this month"
          value={formatMoney(stats.revenue_this_month)}
          icon={Wallet}
          tone="bg-warning-soft text-warning"
          href="/appointments"
          footer={
            <>
              <TrendPill value={trend(stats.revenue_this_month, stats.revenue_prev_period)} />
              <span>from completed visits</span>
            </>
          }
        />
      </div>

      {/* Visits chart + today's summary */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Patient visits" subtitle="Appointments per month, last 6 months" />
          <VisitsChart data={stats.visits_by_month} />
        </Card>
        <Card className="flex flex-col">
          <CardHeader title="Today’s appointments" subtitle={formatDay(stats.today, { weekday: "long", day: "numeric", month: "short" })} action={<ViewAll href="/appointments">Open</ViewAll>} />
          <div className="flex flex-1 flex-col justify-between px-5 pb-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight tabular-nums">{today.total}</span>
                <span className="text-sm text-muted">booked</span>
              </div>
              {nextUp && (
                <button
                  onClick={() => setViewingPatient(nextUp.patient)}
                  className="mt-4 flex w-full items-center gap-3 rounded-xl border border-border bg-surface-muted p-3 text-left hover:border-primary"
                >
                  <span className="rounded-lg bg-primary px-2 py-1.5 text-center text-xs font-bold leading-tight text-white">
                    {formatTime(nextUp.time)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">Next up</span>
                    <span className="block truncate text-sm font-semibold">{nextUp.patient_info.full_name}</span>
                    <span className="block truncate text-xs text-muted">with {doctorName(nextUp.doctor_info.full_name)}</span>
                  </span>
                </button>
              )}
            </div>
            <div className="mt-6" />
            <StatusSplit
              parts={[
                { label: "Completed", value: today.completed, className: "bg-success" },
                { label: "Waiting", value: today.waiting, className: "bg-primary" },
                { label: "Cancelled & no-show", value: today.cancelled, className: "bg-danger" },
              ]}
            />
          </div>
        </Card>
      </div>

      {/* Today's schedule + doctors on duty */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader title="Today’s schedule" subtitle="Next appointments, earliest first" action={<ViewAll href="/appointments" />} />
          {stats.today_appointments.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-muted">No appointments booked for today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Time</th>
                    <th className="px-5 py-2.5 font-semibold">Patient</th>
                    <th className="px-5 py-2.5 font-semibold">Doctor</th>
                    <th className="px-5 py-2.5 font-semibold">Type</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.today_appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-muted">
                      <td className="whitespace-nowrap px-5 py-3 font-semibold">{formatTime(a.time)}</td>
                      <td className="px-5 py-3">
                        <button className="flex items-center gap-2.5 text-left" onClick={() => setViewingPatient(a.patient)}>
                          <Avatar name={a.patient_info.full_name} email={a.patient_info.mrn} size={30} />
                          <span>
                            <span className="block font-semibold hover:text-primary">{a.patient_info.full_name}</span>
                            <span className="block text-xs text-muted">{a.reason || a.patient_info.mrn}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{doctorName(a.doctor_info.full_name)}</p>
                        <p className="text-xs text-muted">{a.doctor_info.department_name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <AppointmentTypeBadge type={a.type} />
                      </td>
                      <td className="px-5 py-3">
                        <AppointmentStatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Doctors on duty" subtitle="Busiest first" action={<ViewAll href="/doctors" />} />
          <ul className="space-y-1 px-3 pb-4">
            {stats.doctors_today.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted">
                <Avatar name={d.full_name} email={d.full_name} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{doctorName(d.full_name)}</p>
                  <p className="truncate text-xs text-muted">
                    {d.specialization} · {formatShift(d.shift_start, d.shift_end)}
                  </p>
                </div>
                <span className="rounded-lg bg-primary-soft px-2 py-1 text-xs font-bold tabular-nums text-primary" title="Appointments today">
                  {d.appointments_today}
                </span>
              </li>
            ))}
            {stats.doctors_today.length === 0 && <li className="px-2 py-4 text-sm text-muted">No doctors scheduled today.</li>}
          </ul>
        </Card>
      </div>

      {/* Departments, recent patients, network */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Visits by department" subtitle="Last 30 days" action={<ViewAll href="/departments" />} />
          <RankedBars data={stats.visits_by_department} />
        </Card>

        <Card>
          <CardHeader title="Recently registered" subtitle="Newest patients" action={<ViewAll href="/patients" />} />
          <ul className="space-y-1 px-3 pb-4">
            {stats.recent_patients.map((p) => (
              <li key={p.id}>
                <button onClick={() => setViewingPatient(p.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-muted">
                  <Avatar name={p.full_name} email={p.mrn} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                    <span className="block truncate text-xs text-muted">
                      {p.mrn} · {p.age ?? "—"} yrs · {GENDER_LABEL[p.gender]}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <BloodBadge group={p.blood_group} />
                    <span className="text-[11px] text-muted">{formatDate(p.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Hospital network" subtitle="Directory and manager requests" action={<ViewAll href="/hospitals" />} />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Link href="/hospitals" className="rounded-xl bg-surface-muted p-4 hover:bg-primary-soft">
              <Building2 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-extrabold tabular-nums">{stats.total_hospitals}</p>
              <p className="text-xs text-muted">Hospitals listed</p>
            </Link>
            <Link href="/requests" className="rounded-xl bg-warning-soft/60 p-4 hover:bg-warning-soft">
              <ClipboardList className="h-5 w-5 text-warning" />
              <p className="mt-3 text-2xl font-extrabold tabular-nums">{stats.pending_requests}</p>
              <p className="text-xs text-muted">Requests to review</p>
            </Link>
            <div className="col-span-2 rounded-xl border border-border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">With a manager</span>
                <span className="font-semibold tabular-nums">{stats.managed_hospitals}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted">Without a manager</span>
                <span className="font-semibold tabular-nums">{stats.unmanaged_hospitals}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-muted">Hidden from directory</span>
                <span className="font-semibold tabular-nums">{stats.inactive_hospitals}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {booking && (
        <AppointmentFormModal
          appointment={null}
          onClose={() => setBooking(false)}
          onSaved={() => {
            setBooking(false);
            reload();
          }}
        />
      )}
      {registering && (
        <PatientFormModal
          patient={null}
          onClose={() => setRegistering(false)}
          onSaved={() => {
            setRegistering(false);
            reload();
          }}
        />
      )}
      {viewingPatient !== null && <PatientDetailModal key={viewingPatient} patientId={viewingPatient} onClose={() => setViewingPatient(null)} onChanged={reload} />}
    </div>
  );
}
