"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { doctorName, formatDay, formatTime } from "@/lib/hms";
import type { Appointment, Availability, Doctor, Paginated } from "@/lib/types";

export function RescheduleModal({ appointment, onClose, onSaved }: { appointment: Appointment; onClose: () => void; onSaved: (a: Appointment) => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState(String(appointment.doctor));
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Paginated<Doctor>>(`/doctors/${buildQuery({ page_size: 100, is_active: true })}`).then((r) => setDoctors(r.results)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!doctorId || !date) return;
    let cancelled = false;
    api<Availability>(`/doctors/${doctorId}/availability/${buildQuery({ date })}`)
      .then((r) => !cancelled && setAvailability(r))
      .catch(() => !cancelled && setAvailability(null));
    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);
  const slots = availability?.date === date ? availability : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!time) return setError("Choose a free time slot.");
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { date, time, reason };
      if (Number(doctorId) !== appointment.doctor) body.doctor = Number(doctorId);
      onSaved(await api<Appointment>(`/appointments/${appointment.id}/reschedule/`, { method: "POST", body }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Reschedule appointment" onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm">
          <CalendarClock className="h-5 w-5 text-primary" />
          <span>
            <strong>{appointment.patient_info.full_name}</strong> · now {formatDay(appointment.date)} at {formatTime(appointment.time)} with{" "}
            {doctorName(appointment.doctor_info.full_name)}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor">
            <Select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setTime(""); }}>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {doctorName(d.full_name)} — {d.department_name || d.specialization}
                </option>
              ))}
              {!doctors.some((d) => d.id === appointment.doctor) && <option value={appointment.doctor}>{doctorName(appointment.doctor_info.full_name)}</option>}
            </Select>
          </Field>
          <Field label="New date">
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} required />
          </Field>
        </div>
        <div className="rounded-xl border border-border p-3">
          {!slots ? (
            <p className="text-sm text-muted">Loading free slots…</p>
          ) : !slots.works ? (
            <p className="text-sm text-danger">{slots.reason}. Choose another day.</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-muted">Choose a free slot</p>
              <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                {slots.slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setTime(s.time)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums ${
                      time === s.time ? "border-primary bg-primary text-white" : s.available ? "border-border hover:border-primary hover:text-primary" : "cursor-not-allowed border-transparent bg-surface-muted text-muted line-through"
                    }`}
                  >
                    {formatTime(s.time)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Field label="Reason (sent to the doctor and patient)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Doctor in surgery, patient request" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Keep as is
          </Button>
          <Button type="submit" loading={saving} disabled={!time}>
            Reschedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CancelModal({ appointment, onClose, onSaved }: { appointment: Appointment; onClose: () => void; onSaved: (a: Appointment) => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onSaved(await api<Appointment>(`/appointments/${appointment.id}/cancel/`, { method: "POST", body: { reason } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Cancel appointment" onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-muted">
          Cancel <strong className="text-foreground">{appointment.patient_info.full_name}</strong>’s appointment with {doctorName(appointment.doctor_info.full_name)} on{" "}
          {formatDay(appointment.date)} at {formatTime(appointment.time)}? The slot becomes free again.
        </p>
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Patient unwell, called to cancel" autoFocus />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Keep appointment
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            Cancel appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
