"use client";

import { CalendarPlus, HeartPulse, Mail, MapPin, Pencil, Phone, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { AppointmentFormModal } from "@/components/hms/AppointmentFormModal";
import { AppointmentStatusBadge, AppointmentTypeBadge, BloodBadge } from "@/components/hms/badges";
import { PatientFormModal } from "@/components/hms/PatientFormModal";
import { Alert, Avatar, Badge, Button, Modal, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { doctorName, formatDay, formatTime, GENDER_LABEL } from "@/lib/hms";
import type { Appointment, Paginated, Patient } from "@/lib/types";

function Info({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <div className="break-words text-sm font-medium">{children || <span className="font-normal text-muted">—</span>}</div>
      </div>
    </div>
  );
}

/** Patient profile with visit history; can book an appointment or edit the record. */
export function PatientDetailModal({
  patientId,
  onClose,
  onChanged,
}: {
  patientId: number;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Patient>(`/patients/${patientId}/`),
      api<Paginated<Appointment>>(`/appointments/${buildQuery({ patient: patientId, ordering: "-date,-time", page_size: 50 })}`),
    ])
      .then(([p, a]) => {
        if (cancelled) return;
        setPatient(p);
        setHistory(a.results);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [patientId, reloadKey]);

  function changed() {
    setReloadKey((k) => k + 1);
    onChanged?.();
  }

  return (
    <>
      <Modal open title="Patient profile" onClose={onClose} width="max-w-3xl">
        {error && <Alert>{error}</Alert>}
        {!patient ? (
          !error && (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-primary-soft to-surface p-5 sm:flex-row sm:items-center">
              <Avatar name={patient.full_name} email={patient.mrn} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight">{patient.full_name}</h3>
                  {!patient.is_active && <Badge tone="neutral">Inactive</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {patient.mrn} · {GENDER_LABEL[patient.gender]}
                  {patient.age !== null && ` · ${patient.age} yrs`} · Registered {formatDate(patient.created_at)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center sm:w-72">
                <div className="rounded-xl bg-surface px-2 py-2.5">
                  <p className="text-lg font-bold tabular-nums">{patient.appointment_count}</p>
                  <p className="text-[11px] text-muted">Visits</p>
                </div>
                <div className="rounded-xl bg-surface px-2 py-2.5">
                  <p className="text-sm font-bold">{patient.last_visit ? formatDay(patient.last_visit, { day: "2-digit", month: "short" }) : "—"}</p>
                  <p className="text-[11px] text-muted">Last visit</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl bg-surface px-2 py-2.5">
                  <BloodBadge group={patient.blood_group} />
                  <p className="mt-1 text-[11px] text-muted">Blood</p>
                </div>
              </div>
            </div>

            {patient.allergies && (
              <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <strong>Allergies:</strong> {patient.allergies}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Info icon={<Phone className="h-4 w-4" />} label="Phone">{patient.phone}</Info>
              <Info icon={<Mail className="h-4 w-4" />} label="Email">{patient.email}</Info>
              <Info icon={<MapPin className="h-4 w-4" />} label="Address">{[patient.address, patient.city].filter(Boolean).join(", ")}</Info>
              <Info icon={<UserRound className="h-4 w-4" />} label="Emergency contact">
                {patient.emergency_contact_name && `${patient.emergency_contact_name} · ${patient.emergency_contact_phone || "no phone"}`}
              </Info>
            </div>

            {patient.medical_notes && (
              <Info icon={<HeartPulse className="h-4 w-4" />} label="Medical notes">
                <span className="whitespace-pre-line font-normal">{patient.medical_notes}</span>
              </Info>
            )}

            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Appointment history ({history.length})</h4>
              {history.length === 0 ? (
                <p className="text-sm text-muted">No appointments yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-surface-muted text-xs text-muted">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Date</th>
                        <th className="px-4 py-2.5 font-semibold">Doctor</th>
                        <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Type</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {history.map((a) => (
                        <tr key={a.id}>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <p className="font-medium">{formatDay(a.date)}</p>
                            <p className="text-xs text-muted">{formatTime(a.time)}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{doctorName(a.doctor_info.full_name)}</p>
                            <p className="text-xs text-muted">{a.doctor_info.department_name || a.doctor_info.specialization}</p>
                          </td>
                          <td className="hidden px-4 py-2.5 sm:table-cell">
                            <AppointmentTypeBadge type={a.type} />
                          </td>
                          <td className="px-4 py-2.5">
                            <AppointmentStatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit patient
              </Button>
              <Button onClick={() => setBooking(true)}>
                <CalendarPlus className="h-4 w-4" /> Book appointment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {editing && patient && (
        <PatientFormModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            changed();
          }}
        />
      )}
      {booking && patient && (
        <AppointmentFormModal
          appointment={null}
          presetPatient={{ id: patient.id, mrn: patient.mrn, full_name: patient.full_name, gender: patient.gender, age: patient.age, phone: patient.phone, blood_group: patient.blood_group }}
          onClose={() => setBooking(false)}
          onSaved={() => {
            setBooking(false);
            changed();
          }}
        />
      )}
    </>
  );
}
