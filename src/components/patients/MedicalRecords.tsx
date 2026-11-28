"use client";

import { AlertTriangle, HeartPulse, History, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { SimpleFormModal, type FieldSpec } from "@/components/SimpleFormModal";
import { Alert, Badge, Button, Card, CardHeader, ConfirmDialog, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { ALLERGY_SEVERITY, CONDITION_STATUS, formatDay, HISTORY_CATEGORIES } from "@/lib/hms";
import type { MedicalCondition, MedicalHistoryEntry, PatientAllergy } from "@/lib/types";
import { useResource } from "@/lib/useList";

const ALLERGY_FIELDS: FieldSpec[] = [
  { name: "allergen", label: "Allergen", required: true, placeholder: "e.g. Penicillin, peanuts, latex", span: 1 },
  {
    name: "severity", label: "Severity", type: "select", required: true, span: 1,
    options: Object.entries(ALLERGY_SEVERITY).map(([value, { label }]) => ({ value, label })),
  },
  { name: "reaction", label: "Reaction", placeholder: "e.g. Rash, swelling, anaphylaxis" },
  { name: "notes", label: "Notes" },
];

const CONDITION_FIELDS: FieldSpec[] = [
  { name: "name", label: "Condition", required: true, placeholder: "e.g. Type 2 diabetes", span: 1 },
  { name: "icd_code", label: "ICD-10 code", placeholder: "e.g. E11", span: 1 },
  {
    name: "status", label: "Status", type: "select", required: true, span: 1,
    options: Object.entries(CONDITION_STATUS).map(([value, { label }]) => ({ value, label })),
  },
  { name: "diagnosed_on", label: "Diagnosed on", type: "date", span: 1 },
  { name: "resolved_on", label: "Resolved on", type: "date", span: 1 },
  { name: "notes", label: "Notes", type: "textarea" },
];

const HISTORY_FIELDS: FieldSpec[] = [
  { name: "category", label: "Type", type: "select", required: true, options: HISTORY_CATEGORIES, span: 1 },
  { name: "event_date", label: "Date", type: "date", span: 1 },
  { name: "title", label: "Title", required: true, placeholder: "e.g. Appendectomy, father had heart disease" },
  { name: "details", label: "Details", type: "textarea" },
];

type Editing<T> = { kind: "allergy" | "condition" | "history"; item: T | null } | null;

export function MedicalRecords({ patientId, onChanged }: { patientId: number; onChanged?: () => void }) {
  const { can } = useAuth();
  const canEdit = can("patients.update");
  const allergies = useResource<PatientAllergy[]>(`/patient-allergies/?patient=${patientId}`);
  const conditions = useResource<MedicalCondition[]>(`/medical-conditions/?patient=${patientId}`);
  const history = useResource<MedicalHistoryEntry[]>(`/medical-history/?patient=${patientId}`);
  const [editing, setEditing] = useState<Editing<Record<string, unknown>>>(null);
  const [deleting, setDeleting] = useState<{ path: string; label: string; reload: () => void } | null>(null);
  const [error, setError] = useState("");

  const config = {
    allergy: { title: "allergy", fields: ALLERGY_FIELDS, path: "/patient-allergies/", reload: allergies.reload },
    condition: { title: "condition", fields: CONDITION_FIELDS, path: "/medical-conditions/", reload: conditions.reload },
    history: { title: "history entry", fields: HISTORY_FIELDS, path: "/medical-history/", reload: history.reload },
  };

  async function remove() {
    if (!deleting) return;
    try {
      await api(deleting.path, { method: "DELETE" });
      deleting.reload();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  }

  const loadError = allergies.error || conditions.error || history.error;
  const actions = (kind: "allergy" | "condition" | "history", item: { id: number }, label: string) =>
    canEdit && (
      <div className="flex shrink-0 gap-0.5">
        <Button variant="ghost" className="px-2 py-1" title="Edit" onClick={() => setEditing({ kind, item: item as unknown as Record<string, unknown> })}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          className="px-2 py-1 hover:text-danger"
          title="Delete"
          onClick={() => setDeleting({ path: `${config[kind].path}${item.id}/`, label, reload: config[kind].reload })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  const addButton = (kind: "allergy" | "condition" | "history") =>
    canEdit && (
      <Button variant="secondary" className="px-3 py-1.5" onClick={() => setEditing({ kind, item: null })}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    );

  return (
    <div className="space-y-6">
      {(loadError || error) && <Alert>{loadError || error}</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Allergies" subtitle="Shown as a warning on the profile" action={addButton("allergy")} />
          <div className="px-5 pb-5">
            {!allergies.data ? (
              <Spinner />
            ) : allergies.data.length === 0 ? (
              <p className="text-sm text-muted">No known allergies recorded.</p>
            ) : (
              <ul className="divide-y divide-border">
                {allergies.data.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {a.allergen} <Badge tone={ALLERGY_SEVERITY[a.severity].tone}>{ALLERGY_SEVERITY[a.severity].label}</Badge>
                      </p>
                      {a.reaction && <p className="text-sm text-muted">Reaction: {a.reaction}</p>}
                      {a.notes && <p className="text-xs text-muted">{a.notes}</p>}
                    </div>
                    {actions("allergy", a, a.allergen)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Medical conditions" subtitle="Diagnoses, active and past" action={addButton("condition")} />
          <div className="px-5 pb-5">
            {!conditions.data ? (
              <Spinner />
            ) : conditions.data.length === 0 ? (
              <p className="text-sm text-muted">No conditions recorded.</p>
            ) : (
              <ul className="divide-y divide-border">
                {conditions.data.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <HeartPulse className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {c.name}
                        {c.icd_code && <span className="font-mono text-xs text-muted">{c.icd_code}</span>}
                        <Badge tone={CONDITION_STATUS[c.status].tone}>{CONDITION_STATUS[c.status].label}</Badge>
                      </p>
                      <p className="text-xs text-muted">
                        {c.diagnosed_on ? `Diagnosed ${formatDay(c.diagnosed_on)}` : "Diagnosis date not recorded"}
                        {c.resolved_on && ` · Resolved ${formatDay(c.resolved_on)}`}
                      </p>
                      {c.notes && <p className="mt-1 text-sm text-muted">{c.notes}</p>}
                    </div>
                    {actions("condition", c, c.name)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Medical history" subtitle="Past illness, surgery, family and social history, immunizations" action={addButton("history")} />
        <div className="px-5 pb-5">
          {!history.data ? (
            <Spinner />
          ) : history.data.length === 0 ? (
            <p className="text-sm text-muted">No history entries yet.</p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-border pl-6">
              {history.data.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[33px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-white">
                    <History className="h-3 w-3" />
                  </span>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {h.category_label}
                        {h.event_date && ` · ${formatDay(h.event_date)}`}
                      </p>
                      <p className="font-semibold">{h.title}</p>
                      {h.details && <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{h.details}</p>}
                      {h.recorded_by_name && <p className="mt-1 text-[11px] text-muted">Recorded by {h.recorded_by_name}</p>}
                    </div>
                    {actions("history", h, h.title)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      {editing && (
        <SimpleFormModal
          title={`${editing.item ? "Edit" : "Add"} ${config[editing.kind].title}`}
          fields={config[editing.kind].fields}
          initial={editing.item ?? (editing.kind === "allergy" ? { severity: "moderate" } : editing.kind === "condition" ? { status: "active" } : { category: "past_illness" })}
          path={editing.item ? `${config[editing.kind].path}${editing.item.id}/` : config[editing.kind].path}
          method={editing.item ? "PATCH" : "POST"}
          extra={{ patient: patientId }}
          onClose={() => setEditing(null)}
          onSaved={() => {
            config[editing.kind].reload();
            setEditing(null);
            onChanged?.();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete record"
        message={<>Delete <strong>{deleting?.label}</strong> from this patient’s record? The change is kept in the activity log.</>}
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
