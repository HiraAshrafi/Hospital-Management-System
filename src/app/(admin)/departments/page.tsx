"use client";

import { LayoutGrid, MapPin, Pencil, Phone, Plus, Search, Stethoscope, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DepartmentFormModal } from "@/components/hms/DepartmentFormModal";
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { doctorName } from "@/lib/hms";
import type { Department, Paginated } from "@/lib/types";

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[] | null>(null);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Department | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api<Paginated<Department>>(`/departments/${buildQuery({ search, page_size: 100 })}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.results);
          setError("");
        }
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [search, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/departments/${deleting.id}/`, { method: "DELETE" });
      setDeleting(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search departments" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setEditing(null)} className="self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add department
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title="No departments found" />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((d) => (
            <Card key={d.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-extrabold text-primary">
                    {d.code || d.name.slice(0, 3).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{d.name}</p>
                    <p className="truncate text-xs text-muted">{d.description || "No description"}</p>
                  </div>
                </div>
                <Badge tone={d.is_active ? "success" : "neutral"}>{d.is_active ? "Active" : "Closed"}</Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted">
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" /> {d.location || "Location not set"}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" /> {d.phone || "No phone"}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
                {d.head_info ? (
                  <>
                    <Avatar name={d.head_info.full_name} email={d.head_info.full_name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted">Head of department</p>
                      <p className="truncate text-sm font-semibold">{doctorName(d.head_info.full_name)}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">No head assigned</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                <Link
                  href="/doctors"
                  className="mr-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  title="Doctors page"
                >
                  <Stethoscope className="h-4 w-4" /> {d.doctor_count} doctor{d.doctor_count === 1 ? "" : "s"}
                </Link>
                <Button variant="secondary" className="px-3 py-2" onClick={() => setEditing(d)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="ghost" className="px-3 py-2 hover:text-danger" title="Delete" onClick={() => setDeleting(d)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <DepartmentFormModal
          key={editing?.id ?? "new"}
          department={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete department"
        message={
          <>
            Delete <strong>{deleting?.name}</strong>? Its {deleting?.doctor_count ?? 0} doctor(s) will be kept but left without a department.
          </>
        }
        confirmLabel="Delete"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
