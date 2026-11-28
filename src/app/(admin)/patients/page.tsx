"use client";

import { AlertTriangle, ArchiveRestore, Pencil, Search, Trash2, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BloodBadge } from "@/components/hms/badges";
import { PatientFormModal } from "@/components/hms/PatientFormModal";
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Pagination, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage, formatDate } from "@/lib/api";
import { BLOOD_GROUPS, formatDay, GENDER_LABEL, PATIENT_STATUS } from "@/lib/hms";
import type { Patient } from "@/lib/types";
import { useDebounced, useList, usePage } from "@/lib/useList";

const PAGE_SIZE = 10;
const AGE_RANGES: Record<string, [number | undefined, number | undefined]> = {
  "": [undefined, undefined],
  child: [undefined, 17],
  adult: [18, 59],
  senior: [60, undefined],
};

export default function PatientsPage() {
  const { can } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [gender, setGender] = useState("");
  const [blood, setBlood] = useState("");
  const [status, setStatus] = useState("");
  const [age, setAge] = useState("");
  const [upcoming, setUpcoming] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = usePage(search, gender, blood, status, age, upcoming, ordering);
  const [editing, setEditing] = useState<Patient | null | undefined>(undefined);
  const [archiving, setArchiving] = useState<Patient | null>(null);
  const [busy, setBusy] = useState(false);

  const archived = status === "archived";
  const { data, error, setError, reload } = useList<Patient>("/patients/", {
    page, page_size: PAGE_SIZE, search, gender, blood_group: blood, ordering,
    archived: archived ? 1 : undefined,
    is_active: status === "active" ? true : status === "inactive" ? false : undefined,
    status: status === "admitted" ? "admitted" : undefined,
    age_min: AGE_RANGES[age][0], age_max: AGE_RANGES[age][1],
    has_upcoming: upcoming || undefined,
  });

  async function confirmArchive() {
    if (!archiving) return;
    setBusy(true);
    try {
      await api(`/patients/${archiving.id}/`, { method: "DELETE" });
      setArchiving(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
      setArchiving(null);
    } finally {
      setBusy(false);
    }
  }

  async function restore(p: Patient) {
    try {
      await api(`/patients/${p.id}/restore/`, { method: "POST" });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-wrap">
          <div className="relative sm:col-span-2 xl:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Name, patient ID, phone, NID, city" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="xl:w-36" aria-label="Status">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="admitted">Admitted</option>
            {can("patients.delete") && <option value="archived">Archived</option>}
          </Select>
          <Select value={gender} onChange={(e) => setGender(e.target.value)} className="xl:w-32" aria-label="Gender">
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Select value={age} onChange={(e) => setAge(e.target.value)} className="xl:w-32" aria-label="Age">
            <option value="">All ages</option>
            <option value="child">Under 18</option>
            <option value="adult">18–59</option>
            <option value="senior">60+</option>
          </Select>
          <Select value={blood} onChange={(e) => setBlood(e.target.value)} className="xl:w-36" aria-label="Blood group">
            <option value="">All blood groups</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Select value={upcoming} onChange={(e) => setUpcoming(e.target.value)} className="xl:w-48" aria-label="Upcoming appointment">
            <option value="">Any appointments</option>
            <option value="true">Has upcoming visit</option>
            <option value="false">No upcoming visit</option>
          </Select>
          <Select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="xl:w-40" aria-label="Sort">
            <option value="-created_at">Newest first</option>
            <option value="-last_visit">Recent visit</option>
            <option value="-appointment_count">Most visits</option>
            <option value="first_name">Name A–Z</option>
          </Select>
        </div>
        {can("patients.create") && (
          <Button onClick={() => setEditing(null)} className="shrink-0 self-start">
            <UserPlus className="h-4 w-4" /> Register patient
          </Button>
        )}
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
              <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="w-[150px] px-5 py-3 font-semibold">Age / Gender</th>
                    <th className="w-[80px] px-5 py-3 font-semibold">Blood</th>
                    <th className="w-[160px] px-5 py-3 font-semibold">Phone</th>
                    <th className="w-[80px] px-5 py-3 font-semibold">Visits</th>
                    <th className="w-[120px] px-5 py-3 font-semibold">Last visit</th>
                    <th className="w-[110px] px-5 py-3 font-semibold">Status</th>
                    <th className="w-[120px] px-5 py-3 font-semibold">Registered</th>
                    <th className="w-[100px] px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((p) => {
                    const st = PATIENT_STATUS[p.status] ?? PATIENT_STATUS.active;
                    return (
                      <tr key={p.id} className="hover:bg-surface-muted">
                        <td className="px-5 py-3">
                          <Link href={`/patients/${p.id}`} className="flex max-w-full items-center gap-3">
                            <Avatar name={p.full_name} email={p.mrn} size={36} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 truncate font-semibold hover:text-primary">
                                {p.full_name}
                                {p.allergy_list && p.allergy_list.length > 0 && (
                                  <span title={`Allergies: ${p.allergy_list.join(", ")}`}>
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {p.mrn}
                                {p.city && ` · ${p.city}`}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {p.age ?? "—"} {p.age !== null && "yrs"} · {GENDER_LABEL[p.gender]}
                        </td>
                        <td className="px-5 py-3"><BloodBadge group={p.blood_group} /></td>
                        <td className="truncate px-5 py-3 text-muted">{p.phone || "—"}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{p.appointment_count}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDay(p.last_visit)}</td>
                        <td className="px-5 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(p.created_at)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            {archived ? (
                              <Button variant="ghost" className="px-2 py-1.5 text-accent" title="Restore" onClick={() => restore(p)}>
                                <ArchiveRestore className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                {can("patients.update") && (
                                  <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => setEditing(p)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {can("patients.delete") && (
                                  <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Archive" onClick={() => setArchiving(p)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
      <ConfirmDialog
        open={archiving !== null}
        title="Archive patient"
        message={
          <>
            Archive <strong>{archiving?.full_name}</strong> ({archiving?.mrn})? The record, appointments and medical history are kept and the
            patient can be restored from the Archived filter.
          </>
        }
        confirmLabel="Archive"
        loading={busy}
        onConfirm={confirmArchive}
        onClose={() => setArchiving(null)}
      />
    </div>
  );
}
