"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Gender, User } from "@/lib/types";

interface FormState {
  email: string;
  full_name: string;
  phone: string;
  gender: Gender;
  country: string;
  password: string;
  is_active: boolean;
  is_staff: boolean;
}

function initialState(user: User | null): FormState {
  return {
    email: user?.email ?? "",
    full_name: user?.full_name ?? "",
    phone: user?.phone ?? "",
    gender: user?.gender ?? "",
    country: user?.country ?? "",
    password: "",
    is_active: user?.is_active ?? true,
    is_staff: user?.is_staff ?? false,
  };
}

/** Rendered with a `key` per user so the form resets when a different user is opened. */
export function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const isEdit = user !== null;
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { password, ...rest } = form;
      const saved = isEdit
        ? await api<User>(`/users/${user.id}/`, { method: "PATCH", body: rest })
        : await api<User>("/users/", { method: "POST", body: { ...rest, password } });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? "Edit User" : "Add User"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name">
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </Field>
        {!isEdit && (
          <Field label="Password">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <Field label="Country">
          <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_staff} onChange={(e) => set("is_staff", e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Admin panel access
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Create user"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
