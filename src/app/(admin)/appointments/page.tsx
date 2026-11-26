"use client";

import { CalendarDays, CalendarPlus, Check, Pencil, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppointmentFormModal } from "@/components/hms/AppointmentFormModal";
import { AppointmentStatusBadge, AppointmentTypeBadge } from "@/components/hms/badges";
import { PatientDetailModal } from "@/components/hms/PatientDetailModal";
import { Alert, Avatar, Button, Card, ConfirmDialog, EmptyState, Input, Pagination, Select, Spinner, Tabs } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { APPOINTMENT_STATUS, doctorName, formatDay, formatMoney, formatTime } from "@/lib/hms";
import type { Appointment, AppointmentStatus, Department, Doctor, Paginated } from "@/lib/types";

const PAGE_SIZE = 10;
type When = "today" | "upcoming" | "past" | "";
const WHEN_TABS: { value: When; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "", label: "All" },
];

export default function AppointmentsPage() {
  const [data, setData] = useState<Paginated<Appointment> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [when, setWhen] = useState<When>("today");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [doctor, setDoctor] = useState("");
  const [department, setDepartment] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [editing, setEditing] = useState<Appointment | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [viewingPatient, setViewingPatient] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api<Paginated<Doctor>>(`/doctors/${buildQuery({ page_size: 100 })}`),
      api<Paginated<Department>>(`/departments/${buildQuery({ page_size: 100 })}`),
    ])
      .then(([d, dep]) => {
        setDoctors(d.results);
        setDepartments(dep.results);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    // Today and upcoming read soonest-first; past and all read newest-first.
    const ordering = when === "today" || when === "upcoming" ? "date,time" : "-date,-time";
    const query = buildQuery({ page, page_size: PAGE_SIZE, when, search, status, doctor, department, ordering });
    api<Paginated<Appointment>>(`/appointments/${query}`)
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
  }, [page, when, search, status, doctor, department, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  async function setAppointmentStatus(a: Appointment, next: AppointmentStatus) {
    setBusyId(a.id);
    try {
      const updated = await api<Appointment>(`/appointments/${a.id}/`, { method: "PATCH", body: { status: next } });
      setData((d) => d && { ...d, results: d.results.map((x) => (x.id === updated.id ? updated : x)) });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api(`/appointments/${deleting.id}/`, { method: "DELETE" });
      setDeleting(null);
      if (data && data.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={when} options={WHEN_TABS} onChange={resetPage(setWhen)} label="When" />
        <Button onClick={() => setEditing(null)} className="self-start xl:self-auto">
          <CalendarPlus className="h-4 w-4" /> Book appointment
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Patient, ID, phone or doctor" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(APPOINTMENT_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={department} onChange={(e) => resetPage(setDepartment)(e.target.value)} aria-label="Department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select value={doctor} onChange={(e) => resetPage(setDoctor)(e.target.value)} aria-label="Doctor">
          <option value="">All doctors</option>
          {doctors
            .filter((d) => !department || String(d.department) === department)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {doctorName(d.full_name)}
              </option>
            ))}
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : data.results.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No appointments found">
            {when === "today" ? "Nothing booked for today with these filters." : "Try another tab or clear the filters."}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="w-[150px] px-5 py-3 font-semibold">Date &amp; time</th>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="w-[230px] px-5 py-3 font-semibold">Doctor</th>
                    <th className="w-[130px] px-5 py-3 font-semibold">Type</th>
                    <th className="w-[100px] px-5 py-3 font-semibold">Fee</th>
                    <th className="w-[120px] px-5 py-3 font-semibold">Status</th>
                    <th className="w-[160px] px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <p className="font-semibold">{formatTime(a.time)}</p>
                        <p className="text-xs text-muted">{formatDay(a.date, { weekday: "short", day: "2-digit", month: "short" })}</p>
                      </td>
                      <td className="px-5 py-3">
                        <button className="flex max-w-full items-center gap-3 text-left" onClick={() => setViewingPatient(a.patient)}>
                          <Avatar name={a.patient_info.full_name} email={a.patient_info.mrn} size={34} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold hover:text-primary">{a.patient_info.full_name}</span>
                            <span className="block truncate text-xs text-muted">
                              {a.patient_info.mrn}
                              {a.reason && ` · ${a.reason}`}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <p className="truncate font-medium">{doctorName(a.doctor_info.full_name)}</p>
                        <p className="truncate text-xs text-muted">{a.doctor_info.department_name || a.doctor_info.specialization}</p>
                      </td>
                      <td className="px-5 py-3">
                        <AppointmentTypeBadge type={a.type} />
                      </td>
                      <td className="px-5 py-3 tabular-nums">{formatMoney(a.fee)}</td>
                      <td className="px-5 py-3">
                        <AppointmentStatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {a.status === "scheduled" && (
                            <>
                              <Button variant="ghost" className="px-2 py-1.5 text-success" title="Mark completed" loading={busyId === a.id} onClick={() => setAppointmentStatus(a, "completed")}>
                                {busyId !== a.id && <Check className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Cancel appointment" disabled={busyId === a.id} onClick={() => setAppointmentStatus(a, "cancelled")}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => setEditing(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {a.status !== "scheduled" && (
                            <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Delete" onClick={() => setDeleting(a)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
        <AppointmentFormModal
          key={editing?.id ?? "new"}
          appointment={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      {viewingPatient !== null && (
        <PatientDetailModal key={viewingPatient} patientId={viewingPatient} onClose={() => setViewingPatient(null)} onChanged={reload} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete appointment"
        message={
          <>
            Delete the appointment for <strong>{deleting?.patient_info.full_name}</strong> on {deleting && formatDay(deleting.date)}? This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        loading={busyId === deleting?.id}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
