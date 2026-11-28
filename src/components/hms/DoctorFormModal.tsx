"use client";

import { useEffect, useState } from "react";

import { CoordinateFields, coordinateBody } from "@/components/hms/CoordinateFields";
import { ScheduleEditor, schedulesFromWeek, weekFromSchedules, type WeekState } from "@/components/hms/ScheduleEditor";
import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { DESIGNATIONS } from "@/lib/hms";
import type { Department, Doctor, Gender, LatLng, Paginated, StaffMember } from "@/lib/types";

interface FormState {
  first_name: string;
  last_name: string;
  gender: Gender;
  email: string;
  phone: string;
  department: string;
  designation: string;
  specialization: string;
  qualification: string;
  registration_no: string;
  chamber: string;
  latitude: string;
  longitude: string;
  experience_years: string;
  consultation_fee: string;
  week: WeekState;
  user: string;
  joined_on: string;
  bio: string;
  is_active: boolean;
}

function initialState(d: Doctor | null, location?: LatLng): FormState {
  return {
    first_name: d?.first_name ?? "",
    last_name: d?.last_name ?? "",
    gender: d?.gender ?? "",
    email: d?.email ?? "",
    phone: d?.phone ?? "",
    department: d?.department ? String(d.department) : "",
    designation: d?.designation ?? "",
    specialization: d?.specialization ?? "",
    qualification: d?.qualification ?? "",
    registration_no: d?.registration_no ?? "",
    chamber: d?.chamber ?? "",
    latitude: d?.latitude ?? (location ? location.lat.toFixed(6) : ""),
    longitude: d?.longitude ?? (location ? location.lng.toFixed(6) : ""),
    experience_years: d ? String(d.experience_years) : "",
    consultation_fee: d ? String(Number(d.consultation_fee)) : "",
    week: weekFromSchedules(d?.schedules, d ? { days: d.available_days, start: d.shift_start, end: d.shift_end } : undefined),
    user: d?.user ? String(d.user) : "",
    joined_on: d?.joined_on ?? "",
    bio: d?.bio ?? "",
    is_active: d?.is_active ?? true,
  };
}

function Section({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted">{children}</h3>;
}

export function DoctorFormModal({
  doctor,
  location,
  onClose,
  onSaved,
}: {
  doctor: Doctor | null;
  /** Pre-fills the map position when adding from the Map page. */
  location?: LatLng;
  onClose: () => void;
  onSaved: (doctor: Doctor) => void;
}) {
  const isEdit = doctor !== null;
  const [form, setForm] = useState<FormState>(() => initialState(doctor, location));
  const [departments, setDepartments] = useState<Department[]>([]);
  const [accounts, setAccounts] = useState<StaffMember[]>([]);
  const { can } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: "first_name" | "last_name" | "email" | "phone" | "designation" | "specialization" | "qualification" | "registration_no" | "chamber" | "experience_years" | "consultation_fee" | "joined_on" | "bio") => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  });

  useEffect(() => {
    api<Paginated<Department>>(`/departments/${buildQuery({ page_size: 100 })}`)
      .then((res) => setDepartments(res.results))
      .catch((err) => setError(errorMessage(err)));
    // Staff accounts with the Doctor role, to link this doctor's login.
    if (can("staff.view")) {
      api<Paginated<StaffMember>>(`/staff/${buildQuery({ role__code: "doctor", page_size: 100, is_active: true })}`)
        .then((res) => setAccounts(res.results))
        .catch(() => {});
    }
  }, [can]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { week, ...rest } = form;
    const body: Record<string, unknown> = {
      ...rest,
      department: form.department ? Number(form.department) : null,
      experience_years: Number(form.experience_years || 0),
      consultation_fee: form.consultation_fee || "0",
      schedules: schedulesFromWeek(week),
      user: form.user ? Number(form.user) : null,
      joined_on: form.joined_on || null,
      ...coordinateBody(form.latitude, form.longitude),
    };
    if (!can("staff.view")) delete body.user;
    try {
      const saved = isEdit
        ? await api<Doctor>(`/doctors/${doctor.id}/`, { method: "PATCH", body })
        : await api<Doctor>("/doctors/", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? `Edit Dr. ${doctor.full_name}` : "Add doctor"} onClose={onClose} width="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Section>Profile</Section>
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
          <Field label="Department">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Designation">
            <Input {...text("designation")} list="doctor-designations" placeholder="e.g. Senior Consultant" />
            <datalist id="doctor-designations">
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label="Specialist in">
            <Input {...text("specialization")} placeholder="e.g. Cardiologist" />
          </Field>
          <Field label="Qualification">
            <Input {...text("qualification")} placeholder="e.g. MBBS, FCPS (Medicine)" />
          </Field>
          <Field label="Medical registration no.">
            <Input {...text("registration_no")} />
          </Field>
          <Field label="Experience (years)">
            <Input {...text("experience_years")} type="number" min={0} max={70} />
          </Field>
          <Field label="Email">
            <Input {...text("email")} type="email" />
          </Field>
          <Field label="Phone">
            <Input {...text("phone")} type="tel" />
          </Field>
        </div>

        <Section>Chamber &amp; map location</Section>
        <Field label="Chamber / practice location">
          <Input {...text("chamber")} placeholder="e.g. Northstar General Hospital, Dhanmondi" />
        </Field>
        <CoordinateFields
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
        />

        <Section>Weekly schedule</Section>
        <ScheduleEditor value={form.week} onChange={(week) => set("week", week)} />
        <p className="-mt-2 text-xs text-muted">Patients can only be booked inside these hours. Leave (holidays, conferences) is added on the doctor’s profile.</p>

        <Section>Fee &amp; account</Section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Consultation fee">
            <Input {...text("consultation_fee")} type="number" min={0} step="1" />
          </Field>
          <Field label="Joined on">
            <Input {...text("joined_on")} type="date" />
          </Field>
          {can("staff.view") && (
            <Field label="Login account">
              <Select value={form.user} onChange={(e) => set("user", e.target.value)}>
                <option value="">Not linked</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}
                  </option>
                ))}
                {doctor?.user && !accounts.some((a) => a.id === doctor.user) && <option value={doctor.user}>{doctor.user_email}</option>}
              </Select>
            </Field>
          )}
        </div>
        <Field label="Short bio">
          <Textarea {...text("bio")} rows={2} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          Available for appointments
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Add doctor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
