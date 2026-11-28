"use client";

import { BedDouble, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";

import { SimpleFormModal, type FieldSpec } from "@/components/SimpleFormModal";
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { BED_STATUS, BED_TYPES, formatMoney, WARD_TYPES } from "@/lib/hms";
import type { Bed, Department, Paginated, Ward } from "@/lib/types";
import { useResource } from "@/lib/useList";

function BedList({ ward, onChanged }: { ward: Ward; onChanged: () => void }) {
  const { data, error, reload } = useResource<Bed[]>(`/beds/?ward=${ward.id}`);
  const [editing, setEditing] = useState<Bed | null>(null);
  const [deleting, setDeleting] = useState<Bed | null>(null);
  const [actionError, setActionError] = useState("");
  const fields: FieldSpec[] = [
    { name: "number", label: "Bed number", required: true, span: 1 },
    { name: "bed_type", label: "Bed type", type: "select", options: BED_TYPES, required: true, span: 1 },
    { name: "daily_rate", label: "Daily rate (empty = ward rate)", type: "number", step: "1", min: "0", span: 1, placeholder: String(Number(ward.daily_rate)) },
    { name: "features", label: "Features", span: 1, placeholder: "e.g. Monitor, window side" },
    { name: "is_active", label: "In service", type: "checkbox" },
  ];
  return (
    <div className="bg-surface-muted/60 px-5 py-4">
      {(error || actionError) && <Alert>{error || actionError}</Alert>}
      {!data ? (
        <Spinner />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
              <BedDouble className={`h-4 w-4 ${b.is_active ? "text-primary" : "text-muted"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {b.number} {!b.is_active && <span className="text-xs font-normal text-muted">(inactive)</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {b.bed_type_label} · {formatMoney(b.effective_rate)}
                </p>
              </div>
              <Badge tone={BED_STATUS[b.status].tone}>{BED_STATUS[b.status].label}</Badge>
              <button className="rounded p-1 text-muted hover:text-primary" title="Edit" onClick={() => setEditing(b)}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button className="rounded p-1 text-muted hover:text-danger" title="Delete" onClick={() => setDeleting(b)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {data.length === 0 && <p className="text-sm text-muted">No beds yet. Use “Add beds”.</p>}
        </div>
      )}
      {editing && (
        <SimpleFormModal
          title={`Edit bed ${editing.number}`}
          fields={fields}
          initial={editing as unknown as Record<string, unknown>}
          path={`/beds/${editing.id}/`}
          method="PATCH"
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete bed"
        message={<>Delete bed <strong>{deleting?.number}</strong>? Beds with admission history can’t be deleted; take them out of service instead.</>}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api(`/beds/${deleting?.id}/`, { method: "DELETE" });
            reload();
            onChanged();
          } catch (err) {
            setActionError(errorMessage(err));
          } finally {
            setDeleting(null);
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

export default function WardsPage() {
  const { data, error, reload } = useResource<Ward[]>("/wards/");
  const departments = useResource<Paginated<Department>>("/departments/?page_size=100");
  const [open, setOpen] = useState<number | null>(null);
  const [editing, setEditing] = useState<Ward | null | undefined>(undefined);
  const [addingTo, setAddingTo] = useState<Ward | null>(null);
  const [deleting, setDeleting] = useState<Ward | null>(null);
  const [actionError, setActionError] = useState("");

  const wardFields: FieldSpec[] = [
    { name: "name", label: "Ward name", required: true, span: 1 },
    { name: "code", label: "Code", span: 1, placeholder: "e.g. GW-M" },
    { name: "ward_type", label: "Type", type: "select", options: WARD_TYPES, required: true, span: 1 },
    { name: "gender", label: "Patients", type: "select", options: [{ value: "any", label: "Any" }, { value: "male", label: "Male only" }, { value: "female", label: "Female only" }], required: true, span: 1 },
    { name: "daily_rate", label: "Bed charge per day", type: "number", step: "1", min: "0", required: true, span: 1 },
    { name: "floor", label: "Floor / block", span: 1 },
    { name: "department", label: "Department", type: "select", options: (departments.data?.results ?? []).map((d) => ({ value: String(d.id), label: d.name })), span: 1 },
    { name: "phone", label: "Nurse station phone", span: 1 },
    { name: "description", label: "Description", type: "textarea" },
    { name: "is_active", label: "Ward is open", type: "checkbox" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Set up wards, cabins and ICUs, then add their beds. Rates are used for bed charges on admissions.</p>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Add ward
        </Button>
      </div>
      {(error || actionError) && <Alert>{error || actionError}</Alert>}
      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : data.length === 0 ? (
          <EmptyState icon={<BedDouble className="h-6 w-6" />} title="No wards yet">Add your first ward.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3 font-semibold">Ward</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Rate / day</th>
                  <th className="px-3 py-3 font-semibold">Beds</th>
                  <th className="px-3 py-3 font-semibold">Occupied</th>
                  <th className="px-3 py-3 font-semibold">Free</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((w) => (
                  <Fragment key={w.id}>
                    <tr className="hover:bg-surface-muted">
                      <td className="px-3 py-3">
                        <button onClick={() => setOpen(open === w.id ? null : w.id)} className="text-muted" aria-label="Show beds">
                          {open === w.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => setOpen(open === w.id ? null : w.id)} className="text-left">
                          <p className="font-semibold">{w.name} {!w.is_active && <Badge tone="neutral">Closed</Badge>}</p>
                          <p className="text-xs text-muted">{[w.floor, w.department_name, w.gender !== "any" ? `${w.gender} only` : ""].filter(Boolean).join(" · ") || "—"}</p>
                        </button>
                      </td>
                      <td className="px-3 py-3">{w.is_icu ? <Badge tone="danger">{w.ward_type_label}</Badge> : w.ward_type_label}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMoney(w.daily_rate)}</td>
                      <td className="px-3 py-3 tabular-nums">{w.total_beds}</td>
                      <td className="px-3 py-3 tabular-nums">{w.occupied}</td>
                      <td className="px-3 py-3 tabular-nums text-success">{w.available}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="secondary" className="px-3 py-1.5" onClick={() => setAddingTo(w)}>
                            <Plus className="h-4 w-4" /> Add beds
                          </Button>
                          <Button variant="ghost" className="px-2 py-1.5" title="Edit ward" onClick={() => setEditing(w)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Delete ward" onClick={() => setDeleting(w)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {open === w.id && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <BedList ward={w} onChanged={reload} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing !== undefined && (
        <SimpleFormModal
          title={editing ? `Edit ${editing.name}` : "Add ward"}
          width="max-w-2xl"
          fields={wardFields}
          initial={editing ? ({ ...editing, department: editing.department ? String(editing.department) : "" } as unknown as Record<string, unknown>) : { ward_type: "general", gender: "any", daily_rate: "1000", is_active: true }}
          path={editing ? `/wards/${editing.id}/` : "/wards/"}
          method={editing ? "PATCH" : "POST"}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      {addingTo && (
        <SimpleFormModal
          title={`Add beds to ${addingTo.name}`}
          fields={[
            { name: "count", label: "How many", type: "number", min: "1", required: true, span: 1 },
            { name: "prefix", label: "Number prefix", span: 1, placeholder: "e.g. A-" },
            { name: "start", label: "Start numbering at", type: "number", min: "1", required: true, span: 1 },
            { name: "bed_type", label: "Bed type", type: "select", options: BED_TYPES, required: true, span: 1 },
          ]}
          initial={{ count: "5", prefix: "", start: String(addingTo.total_beds + 1), bed_type: addingTo.is_icu ? "icu" : "standard" }}
          path={`/wards/${addingTo.id}/add_beds/`}
          method="POST"
          submitLabel="Add beds"
          onClose={() => setAddingTo(null)}
          onSaved={() => {
            setAddingTo(null);
            setOpen(addingTo.id);
            reload();
          }}
        >
          <p className="text-sm text-muted">Beds are numbered prefix + number, e.g. A-01, A-02…</p>
        </SimpleFormModal>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete ward"
        message={<>Delete <strong>{deleting?.name}</strong> and its beds? Wards with admission history can’t be deleted; close them instead.</>}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api(`/wards/${deleting?.id}/`, { method: "DELETE" });
            reload();
          } catch (err) {
            setActionError(errorMessage(err));
          } finally {
            setDeleting(null);
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
