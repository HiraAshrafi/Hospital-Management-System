"use client";

import {
  AlertTriangle, ArchiveRestore, ArrowLeft, BedDouble, CalendarPlus, Contact, LogIn, Mail, MapPin, Pencil, Phone, ShieldAlert, Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AdmitModal } from "@/components/admissions/AdmissionModals";
import { AppointmentFormModal } from "@/components/hms/AppointmentFormModal";
import { AppointmentStatusBadge, AppointmentTypeBadge, BloodBadge } from "@/components/hms/badges";
import { PatientFormModal } from "@/components/hms/PatientFormModal";
import { MedicalRecords } from "@/components/patients/MedicalRecords";
import { PatientDocuments } from "@/components/patients/PatientDocuments";
import { Alert, Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, Pagination, Spinner, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage, formatDate } from "@/lib/api";
import { CONDITION_STATUS, doctorName, formatDay, formatMoney, formatTime, GENDER_LABEL, PATIENT_STATUS } from "@/lib/hms";
import type { Appointment, Patient, PatientSummary } from "@/lib/types";
import { useList, useResource } from "@/lib/useList";

type Tab = "overview" | "medical" | "documents" | "visits";

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="text-sm">{value || "—"}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

function Visits({ patientId }: { patientId: number }) {
  const [page, setPage] = useState(1);
  const { data, error } = useList<Appointment>("/appointments/", { patient: patientId, page, page_size: 10, ordering: "-date" });
  if (error) return <Alert>{error}</Alert>;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Appointment history" subtitle="All visits, newest first" />
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : data.results.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted">No appointments yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Doctor</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 font-semibold">Reason</th>
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
                      <p className="font-medium">{doctorName(a.doctor_info.full_name)}</p>
                      <p className="text-xs text-muted">{a.doctor_info.department_name}</p>
                    </td>
                    <td className="px-5 py-3"><AppointmentTypeBadge type={a.type} /></td>
                    <td className="max-w-[240px] truncate px-5 py-3 text-muted">{a.reason || "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{formatMoney(a.fee)}</td>
                    <td className="px-5 py-3">
                      <AppointmentStatusBadge status={a.status} />
                      {a.cancel_reason && <p className="mt-1 max-w-[180px] truncate text-xs text-muted">{a.cancel_reason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={10} count={data.count} onChange={setPage} />
        </>
      )}
    </Card>
  );
}

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const medical = can("patients.view_medical");
  const patient = useResource<Patient>(`/patients/${id}/`);
  const summary = useResource<PatientSummary>(`/patients/${id}/summary/`);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const p = patient.data;
  const reloadAll = () => {
    patient.reload();
    summary.reload();
  };

  async function archive() {
    setBusy(true);
    try {
      await api(`/patients/${id}/`, { method: "DELETE" });
      router.push("/patients");
    } catch (err) {
      setError(errorMessage(err));
      setArchiving(false);
    } finally {
      setBusy(false);
    }
  }

  if (patient.error) {
    return (
      <div className="space-y-4">
        <Link href="/patients" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Patients</Link>
        <Alert>{patient.error}</Alert>
      </div>
    );
  }
  if (!p) return <div className="flex justify-center py-20"><Spinner /></div>;

  const status = PATIENT_STATUS[p.status] ?? PATIENT_STATUS.active;
  const allergyList = summary.data?.medical?.allergies ?? [];
  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    ...(medical ? [{ value: "medical" as Tab, label: "Medical history" }, { value: "documents" as Tab, label: "Documents" }] : []),
    { value: "visits", label: "Visits" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/patients" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> All patients
      </Link>
      {error && <Alert>{error}</Alert>}

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary-bright to-accent-bright" />
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={p.full_name} email={p.mrn} size={64} />
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-navy">
                {p.full_name}
                <Badge tone={status.tone}>{status.label}</Badge>
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="font-mono font-semibold text-foreground">{p.mrn}</span>
                <span>{p.age !== null ? `${p.age} yrs` : "Age unknown"} · {GENDER_LABEL[p.gender]}</span>
                <BloodBadge group={p.blood_group} />
                <span>Registered {formatDate(p.created_at)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.deleted_at ? (
              can("patients.delete") && (
                <Button
                  variant="success"
                  onClick={async () => {
                    await api(`/patients/${id}/restore/`, { method: "POST" }).catch((err) => setError(errorMessage(err)));
                    reloadAll();
                  }}
                >
                  <ArchiveRestore className="h-4 w-4" /> Restore record
                </Button>
              )
            ) : (
              <>
                {can("appointments.create") && (
                  <Button onClick={() => setBooking(true)}>
                    <CalendarPlus className="h-4 w-4" /> Book appointment
                  </Button>
                )}
                {can("admissions.manage") && summary.data && !summary.data.current_admission && (
                  <Button variant="secondary" onClick={() => setAdmitting(true)}>
                    <LogIn className="h-4 w-4" /> Admit
                  </Button>
                )}
                {can("patients.update") && (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
                {can("patients.delete") && (
                  <Button variant="ghost" className="hover:text-danger" onClick={() => setArchiving(true)} title="Archive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {medical && allergyList.length > 0 && (
          <div className="flex items-start gap-2 border-t border-danger/20 bg-danger-soft px-5 py-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Allergies:</strong> {allergyList.map((a) => `${a.allergen}${a.severity === "severe" || a.severity === "life_threatening" ? " (severe)" : ""}`).join(", ")}
            </span>
          </div>
        )}
        {summary.data?.current_admission && (
          <Link
            href={`/admissions/${summary.data.current_admission.id}`}
            className={`flex items-center gap-2 border-t px-5 py-3 text-sm font-semibold ${summary.data.current_admission.is_icu ? "border-danger/20 bg-danger-soft text-danger" : "border-violet/20 bg-violet-soft text-violet"}`}
          >
            <BedDouble className="h-4 w-4 shrink-0" />
            Admitted{summary.data.current_admission.is_icu ? " to ICU" : ""} · {summary.data.current_admission.bed} · {doctorName(summary.data.current_admission.doctor)} ·{" "}
            {summary.data.current_admission.reason} <span className="ml-auto font-normal underline">Open admission</span>
          </Link>
        )}
        {p.deleted_at && (
          <div className="flex items-center gap-2 border-t border-border bg-surface-muted px-5 py-3 text-sm text-muted">
            <ShieldAlert className="h-4 w-4" /> This record was archived on {formatDate(p.deleted_at)}. Its history is kept.
          </div>
        )}
      </Card>

      <Tabs label="Patient sections" value={tab} onChange={setTab} options={tabs} />

      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Completed visits" value={summary.data?.visits ?? "…"} tone="bg-primary-soft text-primary" />
              <Stat label="Upcoming" value={summary.data?.upcoming ?? "…"} tone="bg-accent-soft text-accent" />
              <Stat label="Cancelled / no-show" value={summary.data?.cancelled ?? "…"} tone="bg-danger-soft text-danger" />
            </div>
            <Card>
              <CardHeader title="Next appointment" />
              <div className="px-5 pb-5">
                {summary.data?.next_appointment ? (
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-muted p-4">
                    <span className="rounded-xl bg-primary px-3 py-2 text-center text-white">
                      <span className="block text-xs font-semibold">{formatDay(summary.data.next_appointment.date, { month: "short" })}</span>
                      <span className="block text-2xl font-extrabold leading-none">{formatDay(summary.data.next_appointment.date, { day: "numeric" })}</span>
                    </span>
                    <div>
                      <p className="font-semibold">{doctorName(summary.data.next_appointment.doctor_info.full_name)}</p>
                      <p className="text-sm text-muted">
                        {formatTime(summary.data.next_appointment.time)} · {summary.data.next_appointment.doctor_info.department_name}
                      </p>
                      {summary.data.next_appointment.reason && <p className="text-sm text-muted">{summary.data.next_appointment.reason}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No upcoming appointment.</p>
                )}
              </div>
            </Card>
            {medical && summary.data?.medical && (
              <Card>
                <CardHeader
                  title="Active conditions"
                  action={<button onClick={() => setTab("medical")} className="text-sm font-semibold text-primary hover:underline">Medical history</button>}
                />
                <div className="flex flex-wrap gap-2 px-5 pb-5">
                  {summary.data.medical.active_conditions.length === 0 ? (
                    <p className="text-sm text-muted">No active conditions recorded.</p>
                  ) : (
                    summary.data.medical.active_conditions.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm">
                        {c.name} <Badge tone={CONDITION_STATUS[c.status].tone}>{CONDITION_STATUS[c.status].label}</Badge>
                      </span>
                    ))
                  )}
                </div>
              </Card>
            )}
            <Card>
              <CardHeader title="Doctors seen" subtitle="Most recent first" />
              <ul className="space-y-1 px-3 pb-4">
                {(summary.data?.doctors_seen ?? []).map((d) => (
                  <li key={d.doctor}>
                    <Link href={`/doctors/${d.doctor}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted">
                      <Avatar name={`${d.doctor__first_name} ${d.doctor__last_name}`} email="dr" size={34} />
                      <span className="flex-1 text-sm font-semibold">{doctorName(`${d.doctor__first_name} ${d.doctor__last_name}`)}</span>
                      <span className="text-xs text-muted">{d.visits} visit{d.visits === 1 ? "" : "s"} · last {formatDay(d.last)}</span>
                    </Link>
                  </li>
                ))}
                {summary.data && summary.data.doctors_seen.length === 0 && <li className="px-2 py-2 text-sm text-muted">No completed visits yet.</li>}
              </ul>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Contact" />
              <div className="divide-y divide-border px-5 pb-3">
                <InfoRow icon={Phone} label="Phone" value={[p.phone, p.alternate_phone].filter(Boolean).join(" · ")} />
                <InfoRow icon={Mail} label="Email" value={p.email} />
                <InfoRow icon={MapPin} label="Address" value={[p.address, p.city].filter(Boolean).join(", ")} />
                <InfoRow icon={Contact} label="National ID" value={p.national_id} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Emergency contact" />
              <div className="px-5 pb-5 text-sm">
                {p.emergency_contact_name || p.emergency_contact_phone ? (
                  <>
                    <p className="font-semibold">
                      {p.emergency_contact_name || "—"}
                      {p.emergency_contact_relation && <span className="font-normal text-muted"> · {p.emergency_contact_relation}</span>}
                    </p>
                    {p.emergency_contact_phone && (
                      <a href={`tel:${p.emergency_contact_phone}`} className="mt-1 inline-flex items-center gap-1.5 font-semibold text-primary">
                        <Phone className="h-4 w-4" /> {p.emergency_contact_phone}
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-muted">Not recorded.</p>
                )}
              </div>
            </Card>
            {medical && p.medical_notes && (
              <Card>
                <CardHeader title="Notes" />
                <p className="whitespace-pre-line px-5 pb-5 text-sm text-muted">{p.medical_notes}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "medical" && medical && <MedicalRecords patientId={p.id} onChanged={summary.reload} />}
      {tab === "documents" && medical && <PatientDocuments patientId={p.id} />}
      {tab === "visits" && <Visits patientId={p.id} />}

      {editing && (
        <PatientFormModal
          patient={p}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reloadAll();
          }}
        />
      )}
      {booking && (
        <AppointmentFormModal
          appointment={null}
          presetPatient={{ id: p.id, mrn: p.mrn, full_name: p.full_name, gender: p.gender, age: p.age, phone: p.phone, blood_group: p.blood_group }}
          onClose={() => setBooking(false)}
          onSaved={() => {
            setBooking(false);
            summary.reload();
          }}
        />
      )}
      {admitting && (
        <AdmitModal
          presetPatient={{ id: p.id, mrn: p.mrn, full_name: p.full_name, gender: p.gender, age: p.age, phone: p.phone, blood_group: p.blood_group }}
          onClose={() => setAdmitting(false)}
          onSaved={(a) => router.push(`/admissions/${a.id}`)}
        />
      )}
      <ConfirmDialog
        open={archiving}
        title="Archive patient"
        message={<>Archive <strong>{p.full_name}</strong> ({p.mrn})? The record and its history are kept and can be restored later.</>}
        confirmLabel="Archive"
        loading={busy}
        onConfirm={archive}
        onClose={() => setArchiving(false)}
      />
    </div>
  );
}
