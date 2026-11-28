"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { BLOOD_GROUPS } from "@/lib/hms";
import { useAuth } from "@/context/AuthContext";
import type { BloodGroup, Gender, MaritalStatus, Patient } from "@/lib/types";

interface FormState {
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  blood_group: BloodGroup;
  phone: string;
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  national_id: string;
  marital_status: MaritalStatus;
  occupation: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  allergies: string;
  medical_notes: string;
  is_active: boolean;
}

function initialState(p: Patient | null): FormState {
  return {
    first_name: p?.first_name ?? "",
    last_name: p?.last_name ?? "",
    gender: p?.gender ?? "",
    date_of_birth: p?.date_of_birth ?? "",
    blood_group: p?.blood_group ?? "",
    phone: p?.phone ?? "",
    alternate_phone: p?.alternate_phone ?? "",
    email: p?.email ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    national_id: p?.national_id ?? "",
    marital_status: p?.marital_status ?? "",
    occupation: p?.occupation ?? "",
    emergency_contact_name: p?.emergency_contact_name ?? "",
    emergency_contact_relation: p?.emergency_contact_relation ?? "",
    emergency_contact_phone: p?.emergency_contact_phone ?? "",
    allergies: p?.allergies ?? "",
    medical_notes: p?.medical_notes ?? "",
    is_active: p?.is_active ?? true,
  };
}

function Section({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted">{children}</h3>;
}

/** Register or edit a patient. Render with a `key` per patient so the form resets. */
export function PatientFormModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient | null;
  onClose: () => void;
  onSaved: (patient: Patient) => void;
}) {
  const isEdit = patient !== null;
  const { can } = useAuth();
  const medical = can("patients.view_medical");
  const [form, setForm] = useState<FormState>(() => initialState(patient));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: Exclude<keyof FormState, "is_active" | "gender" | "blood_group" | "marital_status">) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { ...form, date_of_birth: form.date_of_birth || null };
    if (!medical) {
      delete body.allergies;
      delete body.medical_notes;
    }
    try {
      const saved = isEdit
        ? await api<Patient>(`/patients/${patient.id}/`, { method: "PATCH", body })
        : await api<Patient>("/patients/", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? `Edit patient · ${patient.mrn}` : "Register patient"} onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Section>Personal details</Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input {...text("first_name")} required />
          </Field>
          <Field label="Last name">
            <Input {...text("last_name")} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input {...text("date_of_birth")} type="date" />
          </Field>
          <Field label="Blood group">
            <Select value={form.blood_group} onChange={(e) => set("blood_group", e.target.value as BloodGroup)}>
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="National ID / birth certificate no.">
            <Input {...text("national_id")} />
          </Field>
          <Field label="Marital status">
            <Select value={form.marital_status} onChange={(e) => set("marital_status", e.target.value as MaritalStatus)}>
              <option value="">Not set</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </Select>
          </Field>
          <Field label="Occupation">
            <Input {...text("occupation")} />
          </Field>
        </div>

        <Section>Contact</Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input {...text("phone")} type="tel" placeholder="+880 1XXX XXXXXX" />
          </Field>
          <Field label="Alternate phone">
            <Input {...text("alternate_phone")} type="tel" />
          </Field>
          <Field label="Email">
            <Input {...text("email")} type="email" />
          </Field>
          <Field label="Address">
            <Input {...text("address")} />
          </Field>
          <Field label="City">
            <Input {...text("city")} />
          </Field>
        </div>

        <Section>Emergency contact</Section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name">
            <Input {...text("emergency_contact_name")} />
          </Field>
          <Field label="Relation">
            <Input {...text("emergency_contact_relation")} placeholder="e.g. Spouse" />
          </Field>
          <Field label="Phone">
            <Input {...text("emergency_contact_phone")} type="tel" />
          </Field>
        </div>

        {medical && (
          <>
            <Section>Medical notes</Section>
            <Field label="Allergies (as reported by the patient)">
              <Textarea {...text("allergies")} rows={2} placeholder="e.g. Penicillin" />
            </Field>
            <Field label="Medical notes">
              <Textarea {...text("medical_notes")} placeholder="Ongoing medication, anything staff should know" />
            </Field>
            <p className="text-xs text-muted">Structured allergies, conditions, history and documents are on the patient’s profile page.</p>
          </>
        )}

        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Active patient record
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Register patient"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
