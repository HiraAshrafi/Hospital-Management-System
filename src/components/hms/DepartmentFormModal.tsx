"use client";

import { useEffect, useState } from "react";

import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { doctorName } from "@/lib/hms";
import type { Department, Doctor, Paginated } from "@/lib/types";

export function DepartmentFormModal({
  department,
  onClose,
  onSaved,
}: {
  department: Department | null;
  onClose: () => void;
  onSaved: (department: Department) => void;
}) {
  const isEdit = department !== null;
  const [name, setName] = useState(department?.name ?? "");
  const [code, setCode] = useState(department?.code ?? "");
  const [location, setLocation] = useState(department?.location ?? "");
  const [phone, setPhone] = useState(department?.phone ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [head, setHead] = useState(department?.head ? String(department.head) : "");
  const [isActive, setIsActive] = useState(department?.is_active ?? true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // The head must belong to the department, so only an existing department can pick one.
  useEffect(() => {
    if (!department) return;
    api<Paginated<Doctor>>(`/doctors/${buildQuery({ department: department.id, page_size: 100 })}`)
      .then((res) => setDoctors(res.results))
      .catch((err) => setError(errorMessage(err)));
  }, [department]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { name, code, location, phone, description, is_active: isActive };
    if (isEdit) body.head = head ? Number(head) : null;
    try {
      const saved = isEdit
        ? await api<Department>(`/departments/${department.id}/`, { method: "PATCH", body })
        : await api<Department>("/departments/", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? `Edit ${department.name}` : "Add department"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Department name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Cardiology" />
            </Field>
          </div>
          <Field label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CARD" maxLength={20} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Block A, 3rd floor" />
          </Field>
          <Field label="Phone / extension">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        {isEdit && (
          <Field label="Head of department">
            <Select value={head} onChange={(e) => setHead(e.target.value)}>
              <option value="">Not assigned</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {doctorName(d.full_name)} — {d.specialization || "General"}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          Department is active
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Add department"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
