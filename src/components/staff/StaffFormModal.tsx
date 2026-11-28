"use client";

import { useEffect, useState } from "react";

import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { EMPLOYMENT_LABEL } from "@/lib/staff";
import type { Department, EmploymentType, Gender, Paginated, Role, StaffMember } from "@/lib/types";

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  gender: Gender;
  role: string;
  password: string;
  designation: string;
  department: string;
  employment_type: EmploymentType;
  joining_date: string;
  national_id: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
}

function initial(staff: StaffMember | null): FormState {
  const p = staff?.profile;
  return {
    full_name: staff?.full_name ?? "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    gender: staff?.gender ?? "",
    role: staff?.role ?? "",
    password: "",
    designation: p?.designation ?? "",
    department: p?.department ? String(p.department) : "",
    employment_type: p?.employment_type ?? "full_time",
    joining_date: p?.joining_date ?? "",
    national_id: p?.national_id ?? "",
    address: p?.address ?? "",
    emergency_contact_name: p?.emergency_contact_name ?? "",
    emergency_contact_phone: p?.emergency_contact_phone ?? "",
    notes: p?.notes ?? "",
  };
}

export function StaffFormModal({ staff, onClose, onSaved }: { staff: StaffMember | null; onClose: () => void; onSaved: () => void }) {
  const { user: me, can } = useAuth();
  const [form, setForm] = useState<FormState>(() => initial(staff));
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isNew = staff === null;
  const isMe = staff?.id === me?.id;

  useEffect(() => {
    api<Role[]>("/roles/").then((r) => setRoles(r.filter((role) => role.is_active))).catch(() => {});
    if (can("departments.view")) {
      api<Paginated<Department>>("/departments/?page_size=100").then((r) => setDepartments(r.results)).catch(() => {});
    }
  }, [can]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      role: form.role,
      profile: {
        designation: form.designation.trim(),
        department: form.department ? Number(form.department) : null,
        employment_type: form.employment_type,
        joining_date: form.joining_date || null,
        national_id: form.national_id.trim(),
        address: form.address.trim(),
        emergency_contact_name: form.emergency_contact_name.trim(),
        emergency_contact_phone: form.emergency_contact_phone.trim(),
        notes: form.notes.trim(),
      },
    };
    if (form.password) body.password = form.password;
    if (isMe) delete body.role;
    try {
      await api(isNew ? "/staff/" : `/staff/${staff.id}/`, { method: isNew ? "POST" : "PATCH", body });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isNew ? "Add staff member" : `Edit ${staff.full_name || staff.email}`} onClose={onClose} width="max-w-3xl">
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Account</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
            </Field>
            <Field label="Email (login)">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => set("role", e.target.value)} required disabled={isMe}>
                <option value="">Choose a role…</option>
                {roles
                  .filter((r) => r.code !== "super_admin" || me?.is_superuser || form.role === "super_admin")
                  .map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={isNew ? "Password" : "New password (leave empty to keep)"}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                minLength={8}
                required={isNew}
                placeholder={isNew ? "At least 8 characters" : "••••••••"}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
          {isMe && <p className="mt-2 text-xs text-muted">You can’t change your own role.</p>}
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Employment</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Designation">
              <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Senior Staff Nurse" />
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Employment type">
              <Select value={form.employment_type} onChange={(e) => set("employment_type", e.target.value as EmploymentType)}>
                {Object.entries(EMPLOYMENT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Joining date">
              <Input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} />
            </Field>
            <Field label="National ID">
              <Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Emergency contact name">
              <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </Field>
            <Field label="Emergency contact phone">
              <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isNew ? "Create account" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
