"use client";

import { BedDouble, Building2, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { HospitalDetailModal } from "@/components/hospitals/HospitalDetailModal";
import { HospitalFormModal } from "@/components/hospitals/HospitalFormModal";
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, Input, Pagination, Select, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { HOSPITAL_TYPES, hospitalTypeLabel } from "@/lib/hospitals";
import type { Hospital, Paginated } from "@/lib/types";

const PAGE_SIZE = 10;

export default function HospitalsPage() {
  const [data, setData] = useState<Paginated<Hospital> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [hospitalType, setHospitalType] = useState("");
  const [visibility, setVisibility] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<Hospital | null | undefined>(undefined);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Hospital | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const query = buildQuery({ page, page_size: PAGE_SIZE, search, hospital_type: hospitalType, is_active: visibility });
    api<Paginated<Hospital>>(`/hospitals/${query}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError("");
        }
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [page, search, hospitalType, visibility, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/hospitals/${deleting.id}/`, { method: "DELETE" });
      setDeleting(null);
      if (data && data.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-white/75">
            <Building2 className="h-4 w-4" /> Facility directory
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Hospitals</h2>
          <p className="mt-1 max-w-xl text-sm text-white/80">Manage hospital profiles, services, capacity, and directory visibility.</p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(null)} className="shrink-0 border-white bg-white hover:bg-white/90">
          <Plus className="h-4 w-4" /> Add hospital
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search hospitals, location, or contact"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={hospitalType} onChange={(e) => { setHospitalType(e.target.value); setPage(1); }} className="sm:w-52" aria-label="Hospital type">
            <option value="">All hospital types</option>
            {HOSPITAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </Select>
          <Select value={visibility} onChange={(e) => { setVisibility(e.target.value); setPage(1); }} className="sm:w-48" aria-label="Directory status">
            <option value="">All statuses</option>
            <option value="true">Active directory</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
        {data && <p className="text-sm text-muted">{data.count.toLocaleString()} hospitals</p>}
        </div>
      </Card>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Hospital</th>
                    <th className="w-[150px] px-5 py-3 font-medium">Type</th>
                    <th className="w-[190px] px-5 py-3 font-medium">Contact</th>
                    <th className="w-[190px] px-5 py-3 font-medium">Services</th>
                    <th className="w-[95px] px-5 py-3 font-medium">Beds</th>
                    <th className="w-[150px] px-5 py-3 font-medium">Manager</th>
                    <th className="w-[110px] px-5 py-3 font-medium">Status</th>
                    <th className="w-[120px] px-5 py-3 font-medium">Added</th>
                    <th className="w-[150px] px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((hospital) => (
                    <tr key={hospital.id} className="transition-colors hover:bg-primary/5">
                      <td className="px-5 py-3">
                        <button className="block max-w-full truncate text-left font-semibold hover:text-primary" onClick={() => setViewingId(hospital.id)}>
                          {hospital.name}
                        </button>
                        <p className="truncate text-xs text-muted">{hospital.address || "No address"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="primary">{hospitalTypeLabel(hospital.hospital_type)}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <p className="truncate">{hospital.phone || "—"}</p>
                        <p className="truncate text-xs">{hospital.email || "No email"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="truncate text-sm">{hospital.services.slice(0, 2).join(", ") || "—"}</p>
                        {hospital.emergency_available && <span className="text-xs font-medium text-success">Emergency care</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 tabular-nums text-muted">
                          <BedDouble className="h-4 w-4" /> {hospital.bed_capacity?.toLocaleString() ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {hospital.manager ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar name={hospital.manager.full_name} email={hospital.manager.email} src={hospital.manager.avatar} size={30} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{hospital.manager.full_name || hospital.manager.email}</p>
                              <p className="truncate text-xs text-muted">{hospital.manager.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                        {hospital.pending_requests > 0 && (
                          <div className="mt-1">
                            <Badge tone="accent">
                              {hospital.pending_requests} pending
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={hospital.is_active ? "success" : "danger"}>{hospital.is_active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(hospital.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2 py-1.5" title="View hospital" onClick={() => setViewingId(hospital.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" className="px-2 py-1.5" title="Edit hospital" onClick={() => setEditing(hospital)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Delete hospital" onClick={() => setDeleting(hospital)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.results.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-14 text-center text-muted">
                        No hospitals match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>

      {editing !== undefined && (
        <HospitalFormModal
          key={editing?.id ?? "new"}
          hospital={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      {viewingId !== null && (
        <HospitalDetailModal key={viewingId} hospitalId={viewingId} onClose={() => setViewingId(null)} onChanged={reload} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete hospital"
        message={
          <>
            Delete <strong>{deleting?.name}</strong> and its management requests? This cannot be undone.
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
