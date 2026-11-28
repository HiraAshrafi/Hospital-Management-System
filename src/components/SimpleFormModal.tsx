"use client";

import { useState } from "react";

import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "number" | "time" | "email" | "tel" | "checkbox" | "datetime-local";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  /** Grid columns this field spans (1 or 2) on wide screens. */
  span?: 1 | 2;
  step?: string;
  min?: string;
  help?: string;
};

type Values = Record<string, string | boolean>;

function toValues(fields: FieldSpec[], initial: Record<string, unknown> | null): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = initial?.[f.name];
    out[f.name] = f.type === "checkbox" ? Boolean(v ?? false) : v === null || v === undefined ? "" : String(v);
  }
  return out;
}

/**
 * A small create/edit form driven by a field list. Empty optional values are sent as null for
 * date/number/select fields, so the API clears them. `extra` is merged into the request body.
 */
export function SimpleFormModal<T>({
  title,
  fields,
  initial,
  path,
  method,
  extra,
  submitLabel = "Save",
  width = "max-w-lg",
  onClose,
  onSaved,
  children,
}: {
  title: string;
  fields: FieldSpec[];
  initial: Record<string, unknown> | null;
  path: string;
  method: "POST" | "PATCH";
  extra?: Record<string, unknown>;
  submitLabel?: string;
  width?: string;
  onClose: () => void;
  onSaved: (saved: T) => void;
  children?: React.ReactNode;
}) {
  const [values, setValues] = useState<Values>(() => toValues(fields, initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { ...extra };
    for (const f of fields) {
      const v = values[f.name];
      if (f.type === "checkbox") body[f.name] = v;
      else if (v === "" && ["date", "number", "select", "time", "datetime-local"].includes(f.type ?? "text") && !f.required) body[f.name] = null;
      else body[f.name] = typeof v === "string" ? v.trim() : v;
    }
    try {
      onSaved(await api<T>(path, { method, body }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={title} onClose={onClose} width={width}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {children}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const span = f.span === 1 ? "" : "sm:col-span-2";
            const common = {
              required: f.required,
              placeholder: f.placeholder,
            };
            if (f.type === "checkbox") {
              return (
                <label key={f.name} className={`flex items-center gap-2 text-sm ${span}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.name])}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {f.label}
                </label>
              );
            }
            return (
              <div key={f.name} className={span}>
                <Field label={f.label}>
                  {f.type === "textarea" ? (
                    <Textarea {...common} value={String(values[f.name])} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} rows={3} />
                  ) : f.type === "select" ? (
                    <Select {...common} value={String(values[f.name])} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                      {!f.required && <option value="">—</option>}
                      {f.required && !values[f.name] && <option value="">Choose…</option>}
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      {...common}
                      type={f.type ?? "text"}
                      step={f.step}
                      min={f.min}
                      value={String(values[f.name])}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </Field>
                {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
