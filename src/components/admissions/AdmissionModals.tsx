"use client";

import { Siren } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PatientPicker } from "@/components/hms/AppointmentFormModal";
import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { ADMISSION_TYPES, DISCHARGE_TYPES, doctorName, formatMoney } from "@/lib/hms";
import type { Admission, Bed, Doctor, Gender, Paginated, PatientMini } from "@/lib/types";

/** Available beds grouped by ward; ICU/emergency wards first when `emergency`. */
function BedSelect({ value, onChange, beds, emergency }: { value: string; onChange: (v: string) => void; beds: Bed[]; emergency?: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, Bed[]>();
    for (const b of beds) map.set(b.ward_name, [...(map.get(b.ward_name) ?? []), b]);
    const urgent = ["icu", "ccu", "hdu", "emergency", "picu", "nicu"];
    return [...map.entries()].sort(([, a], [, b]) => (emergency ? Number(urgent.includes(b[0].ward_type)) - Number(urgent.includes(a[0].ward_type)) : 0) || a[0].ward_name.localeCompare(b[0].ward_name));
  }, [beds, emergency]);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{beds.length ? `Choose a free bed (${beds.length} available)` : "No free beds"}</option>
      {groups.map(([ward, list]) => (
        <optgroup key={ward} label={ward}>
          {list.map((b) => (
            <option key={b.id} value={b.id}>
              Bed {b.number} · {b.bed_type_label} · {formatMoney(b.effective_rate)}/day{b.status === "reserved" ? " (reserved)" : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

export function AdmitModal({
  emergency = false,
  presetBed,
  presetPatient,
  onClose,
  onSaved,
}: {
  emergency?: boolean;
  presetBed?: Bed;
  presetPatient?: PatientMini;
  onClose: () => void;
  onSaved: (a: Admission) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [patient, setPatient] = useState<PatientMini | null>(presetPatient ?? null);
  const [np, setNp] = useState({ first_name: "", last_name: "", gender: "" as Gender, phone: "", age_years: "" });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [doctor, setDoctor] = useState("");
  const [bed, setBed] = useState(presetBed ? String(presetBed.id) : "");
  const [type, setType] = useState(emergency ? "emergency" : "planned");
  const [reason, setReason] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [expected, setExpected] = useState("");
  const [guardian, setGuardian] = useState({ guardian_name: "", guardian_relation: "", guardian_phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Paginated<Doctor>>(`/doctors/${buildQuery({ page_size: 100, is_active: true })}`).then((r) => setDoctors(r.results)).catch(() => {});
    api<Bed[]>("/beds/?available=1").then(setBeds).catch((err) => setError(errorMessage(err)));
  }, []);
  const bedOptions = presetBed && !beds.some((b) => b.id === presetBed.id) ? [presetBed, ...beds] : beds;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "existing" && !patient) return setError("Choose a patient, or register a new one.");
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {
      doctor: Number(doctor), bed: Number(bed), admission_type: type, reason, diagnosis,
      expected_discharge: expected || null, ...guardian,
    };
    if (mode === "existing") body.patient = patient!.id;
    else body.new_patient = { ...np, age_years: np.age_years === "" ? null : Number(np.age_years) };
    try {
      onSaved(await api<Admission>("/admissions/", { method: "POST", body }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={emergency ? "Emergency admission" : "Admit patient"} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {emergency && (
          <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
            <Siren className="h-4 w-4" /> Emergency: ICU and emergency beds are listed first. Unknown patients can be registered here.
          </div>
        )}
        {error && <Alert>{error}</Alert>}

        <div className="flex gap-2">
          {(["existing", "new"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-navy text-white" : "bg-surface-muted text-muted hover:text-foreground"}`}
            >
              {m === "existing" ? "Registered patient" : "New patient"}
            </button>
          ))}
        </div>
        {mode === "existing" ? (
          <Field label="Patient">
            <PatientPicker value={patient} onChange={setPatient} />
          </Field>
        ) : (
          <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <Field label="First name">
                <Input value={np.first_name} onChange={(e) => setNp({ ...np, first_name: e.target.value })} required placeholder="or “Unknown”" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Last name">
                <Input value={np.last_name} onChange={(e) => setNp({ ...np, last_name: e.target.value })} />
              </Field>
            </div>
            <Field label="Approx. age">
              <Input type="number" min={0} max={130} value={np.age_years} onChange={(e) => setNp({ ...np, age_years: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Gender">
                <Select value={np.gender} onChange={(e) => setNp({ ...np, gender: e.target.value as Gender })}>
                  <option value="">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Phone">
                <Input value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bed">
            <BedSelect value={bed} onChange={setBed} beds={bedOptions} emergency={emergency} />
          </Field>
          <Field label="Admitting doctor">
            <Select value={doctor} onChange={(e) => setDoctor(e.target.value)} required>
              <option value="">Choose a doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {doctorName(d.full_name)} — {d.department_name || d.specialization}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Admission type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {ADMISSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expected discharge">
            <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
          </Field>
        </div>
        <Field label="Reason / chief complaint">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="e.g. High fever for 5 days, chest pain" />
        </Field>
        <Field label="Provisional diagnosis">
          <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Guardian / attendant">
            <Input value={guardian.guardian_name} onChange={(e) => setGuardian({ ...guardian, guardian_name: e.target.value })} />
          </Field>
          <Field label="Relation">
            <Input value={guardian.guardian_relation} onChange={(e) => setGuardian({ ...guardian, guardian_relation: e.target.value })} />
          </Field>
          <Field label="Guardian phone">
            <Input value={guardian.guardian_phone} onChange={(e) => setGuardian({ ...guardian, guardian_phone: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant={emergency ? "danger" : "primary"} loading={saving}>
            Admit patient
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function TransferModal({ admission, onClose, onSaved }: { admission: Admission; onClose: () => void; onSaved: (a: Admission) => void }) {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bed, setBed] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Bed[]>("/beds/?available=1").then(setBeds).catch((err) => setError(errorMessage(err)));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onSaved(await api<Admission>(`/admissions/${admission.id}/transfer/`, { method: "POST", body: { bed: Number(bed), notes } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Transfer to another bed" onClose={onClose} width="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-muted">
          <strong className="text-foreground">{admission.patient_info.full_name}</strong> is in {admission.bed_label || "no bed"}. The current bed is set to
          cleaning after the move.
        </p>
        <Field label="New bed">
          <BedSelect value={bed} onChange={setBed} beds={beds} />
        </Field>
        <Field label="Reason">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Needs ICU care, patient request for cabin" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!bed}>Transfer</Button>
        </div>
      </form>
    </Modal>
  );
}

export function DischargeModal({ admission, onClose, onSaved }: { admission: Admission; onClose: () => void; onSaved: (a: Admission) => void }) {
  const [form, setForm] = useState({
    discharge_type: "recovered", final_diagnosis: admission.diagnosis, discharge_summary: "", discharge_instructions: "", follow_up_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onSaved(await api<Admission>(`/admissions/${admission.id}/discharge/`, { method: "POST", body: { ...form, follow_up_date: form.follow_up_date || null } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Discharge ${admission.patient_info.full_name}`} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Outcome">
            <Select value={form.discharge_type} onChange={(e) => set("discharge_type", e.target.value)}>
              {DISCHARGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Follow-up date">
            <Input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
          </Field>
        </div>
        <Field label="Final diagnosis">
          <Textarea value={form.final_diagnosis} onChange={(e) => set("final_diagnosis", e.target.value)} rows={2} />
        </Field>
        <Field label="Discharge summary">
          <Textarea value={form.discharge_summary} onChange={(e) => set("discharge_summary", e.target.value)} rows={4} placeholder="Course in hospital, procedures, condition at discharge" />
        </Field>
        <Field label="Instructions for the patient">
          <Textarea value={form.discharge_instructions} onChange={(e) => set("discharge_instructions", e.target.value)} rows={3} placeholder="Medicines, diet, activity, warning signs" />
        </Field>
        <p className="text-xs text-muted">The bed is set to cleaning. The discharge summary can be printed from the admission page.</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success" loading={saving}>Discharge</Button>
        </div>
      </form>
    </Modal>
  );
}
