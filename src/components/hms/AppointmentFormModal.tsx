"use client";

import { Info, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Avatar, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { APPOINTMENT_STATUS, APPOINTMENT_TYPES, doctorName, formatMoney, formatTime, scheduleLabel } from "@/lib/hms";
import type { Appointment, AppointmentStatus, AppointmentType, Availability, Doctor, Paginated, PatientMini } from "@/lib/types";

/** Search-as-you-type patient chooser. */
export function PatientPicker({ value, onChange }: { value: PatientMini | null; onChange: (p: PatientMini | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientMini[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<Paginated<PatientMini>>(`/patients/${buildQuery({ search: q, page_size: 6, is_active: true })}`)
        .then((res) => !cancelled && setResults(res.results))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2">
        <Avatar name={value.full_name} email={value.mrn} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{value.full_name}</p>
          <p className="truncate text-xs text-muted">
            {value.mrn}
            {value.age !== null && ` · ${value.age} yrs`}
            {value.phone && ` · ${value.phone}`}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-muted hover:bg-background" aria-label="Change patient">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, patient ID or phone" className="pl-9" autoFocus />
      </div>
      {query.trim() && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-border">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">No matching patients. Register them on the Patients page first.</p>
          ) : (
            results.map((p) => (
              <button key={p.id} type="button" onClick={() => onChange(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-background">
                <Avatar name={p.full_name} email={p.mrn} size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted">
                    {p.mrn} · {p.phone || "no phone"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Book or edit an appointment. Render with a `key` per appointment. */
export function AppointmentFormModal({
  appointment,
  presetPatient,
  onClose,
  onSaved,
}: {
  appointment: Appointment | null;
  presetPatient?: PatientMini;
  onClose: () => void;
  onSaved: (a: Appointment) => void;
}) {
  const isEdit = appointment !== null;
  const [patient, setPatient] = useState<PatientMini | null>(appointment?.patient_info ?? presetPatient ?? null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState(appointment ? String(appointment.doctor) : "");
  const [date, setDate] = useState(appointment?.date ?? "");
  const [time, setTime] = useState(appointment?.time.slice(0, 5) ?? "");
  const [type, setType] = useState<AppointmentType>(appointment?.type ?? "consultation");
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? "scheduled");
  const [reason, setReason] = useState(appointment?.reason ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [fee, setFee] = useState(appointment ? String(Number(appointment.fee)) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);

  // Free slots for the chosen doctor and day (weekly schedule, leave and existing bookings).
  useEffect(() => {
    if (!doctorId || !date) return;
    let cancelled = false;
    api<Availability>(`/doctors/${doctorId}/availability/${buildQuery({ date })}`)
      .then((res) => !cancelled && setAvailability(res))
      .catch(() => !cancelled && setAvailability(null));
    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);
  const slots = availability && doctorId && date && availability.date === date ? availability : null;

  useEffect(() => {
    api<Paginated<Doctor>>(`/doctors/${buildQuery({ page_size: 100 })}`)
      .then((res) => setDoctors(res.results))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const doctor = doctors.find((d) => String(d.id) === doctorId);
  const byDepartment = useMemo(() => {
    const groups = new Map<string, Doctor[]>();
    for (const d of doctors) {
      if (!d.is_active && String(d.id) !== doctorId) continue;
      const key = d.department_name || "No department";
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [doctors, doctorId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) {
      setError("Choose a patient.");
      return;
    }
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { patient: patient.id, doctor: Number(doctorId), date, time, type, reason, notes };
    if (isEdit) body.status = status;
    if (fee !== "") body.fee = fee; // left empty on a new booking → the doctor's consultation fee
    try {
      const saved = isEdit
        ? await api<Appointment>(`/appointments/${appointment.id}/`, { method: "PATCH", body })
        : await api<Appointment>("/appointments/", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? "Edit appointment" : "Book appointment"} onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Patient">
          <PatientPicker value={patient} onChange={setPatient} />
        </Field>

        <Field label="Doctor">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
            <option value="">{doctors.length ? "Choose a doctor" : "Loading doctors…"}</option>
            {byDepartment.map(([dept, list]) => (
              <optgroup key={dept} label={dept}>
                {list.map((d) => (
                  <option key={d.id} value={d.id}>
                    {doctorName(d.full_name)} — {d.specialization || "General"}
                    {!d.is_active ? " (unavailable)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        {doctor && (
          <p className="-mt-2 flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2 text-xs text-primary">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              {scheduleLabel(doctor.schedules ?? [])} · Fee {formatMoney(doctor.consultation_fee)}
              {doctor.on_leave_today && <strong className="ml-1 text-danger">· On leave today</strong>}
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as AppointmentType)}>
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Reason for visit">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Chest pain, follow-up review" />
            </Field>
          </div>
          <Field label="Fee">
            <Input
              type="number"
              min={0}
              step="1"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder={doctor ? String(Number(doctor.consultation_fee)) : "Doctor's fee"}
            />
          </Field>
        </div>

        {slots && (
          <div className="-mt-1 rounded-xl border border-border p-3">
            {!slots.works ? (
              <p className="text-sm text-danger">{slots.reason}. Choose another day.</p>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold text-muted">
                  Free slots · {slots.slots.filter((s) => s.available).length} of {slots.slots.length} ({slots.slot_minutes} min each)
                </p>
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {slots.slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available && s.time !== appointment?.time.slice(0, 5)}
                      onClick={() => setTime(s.time)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors ${
                        time === s.time
                          ? "border-primary bg-primary text-white"
                          : s.available
                            ? "border-border hover:border-primary hover:text-primary"
                            : "cursor-not-allowed border-transparent bg-surface-muted text-muted line-through"
                      }`}
                      title={s.booked ? "Booked" : s.available ? "Free" : "Past"}
                    >
                      {formatTime(s.time)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {isEdit && (
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
              {Object.entries(APPOINTMENT_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to staff only" />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Book appointment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
