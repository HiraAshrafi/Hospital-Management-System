"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { HOSPITAL_TYPES, OTHER_PLATFORMS, withScheme } from "@/lib/hospitals";
import type { Hospital, HospitalType, OtherPlatform } from "@/lib/types";

interface FormState {
  name: string;
  hospital_type: HospitalType;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  country: string;
  website: string;
  facebook: string;
  twitter: string;
  instagram: string;
  other_platform: OtherPlatform;
  other_link: string;
  services_text: string;
  specialties_text: string;
  emergency_available: boolean;
  bed_capacity: string;
  operating_hours: string;
  is_active: boolean;
}

const splitItems = (value: string) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];

function initialState(hospital: Hospital | null): FormState {
  return {
    name: hospital?.name ?? "",
    hospital_type: hospital?.hospital_type ?? "general",
    phone: hospital?.phone ?? "",
    email: hospital?.email ?? "",
    street: hospital?.street ?? "",
    city: hospital?.city ?? "",
    state: hospital?.state ?? "",
    country: hospital?.country ?? "",
    website: hospital?.website ?? "",
    facebook: hospital?.facebook ?? "",
    twitter: hospital?.twitter ?? "",
    instagram: hospital?.instagram ?? "",
    other_platform: hospital?.other_platform ?? "",
    other_link: hospital?.other_link ?? "",
    services_text: hospital?.services.join(", ") ?? "",
    specialties_text: hospital?.specialties.join(", ") ?? "",
    emergency_available: hospital?.emergency_available ?? false,
    bed_capacity: hospital?.bed_capacity?.toString() ?? "",
    operating_hours: hospital?.operating_hours ?? "",
    is_active: hospital?.is_active ?? true,
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="border-t border-border pt-4 text-xs font-semibold uppercase tracking-wide text-muted">{children}</h3>;
}

export function HospitalFormModal({
  hospital,
  onClose,
  onSaved,
}: {
  hospital: Hospital | null;
  onClose: () => void;
  onSaved: (hospital: Hospital) => void;
}) {
  const isEdit = hospital !== null;
  const [form, setForm] = useState<FormState>(() => initialState(hospital));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const text = (key: Exclude<keyof FormState, "emergency_available" | "is_active" | "other_platform" | "hospital_type">) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value),
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: form.name.trim(),
      hospital_type: form.hospital_type,
      phone: form.phone.trim(),
      email: form.email.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      website: withScheme(form.website),
      facebook: withScheme(form.facebook),
      twitter: withScheme(form.twitter),
      instagram: withScheme(form.instagram),
      other_platform: form.other_platform,
      other_link: withScheme(form.other_link),
      services: splitItems(form.services_text),
      specialties: splitItems(form.specialties_text),
      emergency_available: form.emergency_available,
      bed_capacity: form.bed_capacity === "" ? null : Number(form.bed_capacity),
      operating_hours: form.operating_hours.trim(),
      is_active: form.is_active,
    };

    try {
      const saved = isEdit
        ? await api<Hospital>(`/hospitals/${hospital.id}/`, { method: "PATCH", body })
        : await api<Hospital>("/hospitals/", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? "Edit hospital" : "Add hospital"} onClose={onClose} width="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <SectionTitle>Hospital profile</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hospital name">
            <Input {...text("name")} placeholder="e.g. Northstar General Hospital" required />
          </Field>
          <Field label="Hospital type">
            <Select value={form.hospital_type} onChange={(event) => set("hospital_type", event.target.value as HospitalType)}>
              {HOSPITAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </Field>
          <Field label="Phone number">
            <Input {...text("phone")} type="tel" placeholder="+1 555 0100" />
          </Field>
          <Field label="Email">
            <Input {...text("email")} type="email" placeholder="info@hospital.example" />
          </Field>
        </div>

        <SectionTitle>Location</SectionTitle>
        <Field label="Street address">
          <Input {...text("street")} autoComplete="street-address" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City">
            <Input {...text("city")} autoComplete="address-level2" />
          </Field>
          <Field label="State / region">
            <Input {...text("state")} autoComplete="address-level1" />
          </Field>
          <Field label="Country">
            <Input {...text("country")} autoComplete="country-name" />
          </Field>
        </div>

        <SectionTitle>Care &amp; capacity</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Services (comma-separated)">
            <Textarea
              value={form.services_text}
              onChange={(event) => set("services_text", event.target.value)}
              placeholder="Emergency care, Outpatient care, Imaging"
              rows={3}
            />
          </Field>
          <Field label="Specialties (comma-separated)">
            <Textarea
              value={form.specialties_text}
              onChange={(event) => set("specialties_text", event.target.value)}
              placeholder="Cardiology, Pediatrics, Orthopedics"
              rows={3}
            />
          </Field>
          <Field label="Bed capacity">
            <Input {...text("bed_capacity")} type="number" min="0" inputMode="numeric" placeholder="Not specified" />
          </Field>
          <Field label="Operating hours">
            <Input {...text("operating_hours")} placeholder="24/7 or Mon–Fri, 08:00–20:00" />
          </Field>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={form.emergency_available}
            onChange={(event) => set("emergency_available", event.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="block font-medium">Emergency services available</span>
            <span className="text-xs text-muted">Show emergency care as a facility service.</span>
          </span>
        </label>

        <SectionTitle>Website &amp; social links</SectionTitle>
        <Field label="Website">
          <Input {...text("website")} inputMode="url" placeholder="https://" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook">
            <Input {...text("facebook")} inputMode="url" placeholder="facebook.com/…" />
          </Field>
          <Field label="Twitter / X">
            <Input {...text("twitter")} inputMode="url" placeholder="x.com/…" />
          </Field>
          <Field label="Instagram">
            <Input {...text("instagram")} inputMode="url" placeholder="instagram.com/…" />
          </Field>
          <Field label="Other platform">
            <Select value={form.other_platform} onChange={(event) => set("other_platform", event.target.value as OtherPlatform)}>
              <option value="">None</option>
              {OTHER_PLATFORMS.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
            </Select>
          </Field>
        </div>
        {form.other_platform && (
          <Field label="Other platform link">
            <Input {...text("other_link")} inputMode="url" placeholder="https://" />
          </Field>
        )}

        <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => set("is_active", event.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="block font-medium">Active in hospital directory</span>
            <span className="text-xs text-muted">Inactive hospitals stay hidden from directory listings.</span>
          </span>
        </label>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? "Save hospital" : "Add hospital"}</Button>
        </div>
      </form>
    </Modal>
  );
}
