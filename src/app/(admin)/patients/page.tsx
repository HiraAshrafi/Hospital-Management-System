"use client";

import { Eye, Pencil, Search, Trash2, UserPlus, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { BloodBadge } from "@/components/hms/badges";
import { PatientDetailModal } from "@/components/hms/PatientDetailModal";
import { PatientFormModal } from "@/components/hms/PatientFormModal";
import { Alert, Avatar, Button, Card, ConfirmDialog, EmptyState, Input, Pagination, Select, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { BLOOD_GROUPS, formatDay, GENDER_LABEL } from "@/lib/hms";
import type { Paginated, Patient } from "@/lib/types";

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const [data, setData] = useState<Paginated<Patient> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [blood, setBlood] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<Patient | null | undefined>(undefined);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api<Paginated<Patient>>(`/patients/${buildQuery({ page, page_size: PAGE_SIZE, search, gender, blood_group: blood, ordering })}`)
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
  }, [page, search, gender, blood, ordering, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/patients/${deleting.id}/`, { method: "DELETE" });
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-row">
          <div className="relative sm:col-span-2 lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search name, patient ID, phone, city" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }} className="lg:w-36" aria-label="Gender">
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Select value={blood} onChange={(e) => { setBlood(e.target.value); setPage(1); }} className="lg:w-36" aria-label="Blood group">
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Select value={ordering} onChange={(e) => { setOrdering(e.target.value); setPage(1); }} className="lg:w-44" aria-label="Sort">
            <option value="-created_at">Newest first</option>
            <option value="-last_visit">Recent visit</option>
            <option value="-appointment_count">Most visits</option>
            <option value="first_name">Name A–Z</option>
          </Select>
        </div>
        <Button onClick={() => setEditing(null)} className="self-start lg:self-auto">
          <UserPlus className="h-4 w-4" /> Register patient
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : data.results.length === 0 ? (
          <EmptyState icon={<UserRound className="h-6 w-6" />} title="No patients found">
            Try a different search or filter.
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] table-fixed text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="w-[160px] px-5 py-3 font-semibold">Age / Gender</th>
                    <th className="w-[90px] px-5 py-3 font-semibold">Blood</th>
                    <th className="w-[170px] px-5 py-3 font-semibold">Phone</th>
                    <th className="w-[90px] px-5 py-3 font-semibold">Visits</th>
                    <th className="w-[130px] px-5 py-3 font-semibold">Last visit</th>
                    <th className="w-[150px] px-5 py-3 font-semibold">Registered</th>
                    <th className="w-[140px] px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <button className="flex max-w-full items-center gap-3 text-left" onClick={() => setViewingId(p.id)}>
                          <Avatar name={p.full_name} email={p.mrn} size={36} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold hover:text-primary">{p.full_name}</span>
                            <span className="block truncate text-xs text-muted">
                              {p.mrn}
                              {p.city && ` · ${p.city}`}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {p.age ?? "—"} {p.age !== null && "yrs"} · {GENDER_LABEL[p.gender]}
                      </td>
                      <td className="px-5 py-3">
                        <BloodBadge group={p.blood_group} />
                      </td>
                      <td className="truncate px-5 py-3 text-muted">{p.phone || "—"}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{p.appointment_count}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDay(p.last_visit)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(p.created_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2 py-1.5" title="View profile" onClick={() => setViewingId(p.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => setEditing(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Delete" onClick={() => setDeleting(p)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>

      {editing !== undefined && (
        <PatientFormModal
          key={editing?.id ?? "new"}
          patient={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      {viewingId !== null && <PatientDetailModal key={viewingId} patientId={viewingId} onClose={() => setViewingId(null)} onChanged={reload} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete patient"
        message={
          <>
            Delete <strong>{deleting?.full_name}</strong> ({deleting?.mrn}) and all {deleting?.appointment_count ?? 0} of their appointments? This cannot be
            undone.
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
