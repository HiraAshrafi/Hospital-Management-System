"use client";

import { CalendarClock, Clock, GraduationCap, Mail, Pencil, Phone, Plus, Search, Stethoscope, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DoctorFormModal } from "@/components/hms/DoctorFormModal";
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Pagination, Select, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { doctorName, formatMoney, formatShift, WEEKDAYS } from "@/lib/hms";
import type { Department, Doctor, Paginated } from "@/lib/types";

const PAGE_SIZE = 12;

export default function DoctorsPage() {
  const [data, setData] = useState<Paginated<Doctor> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [active, setActive] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [editing, setEditing] = useState<Doctor | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Doctor | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    api<Paginated<Department>>(`/departments/${buildQuery({ page_size: 100 })}`)
      .then((res) => setDepartments(res.results))
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
    api<Paginated<Doctor>>(`/doctors/${buildQuery({ page, page_size: PAGE_SIZE, search, department, is_active: active })}`)
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
  }, [page, search, department, active, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/doctors/${deleting.id}/`, { method: "DELETE" });
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
        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:flex">
          <div className="relative lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search name or specialization" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="lg:w-52" aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} className="lg:w-44" aria-label="Availability">
            <option value="">Any availability</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </Select>
        </div>
        <Button onClick={() => setEditing(null)} className="self-start lg:self-auto">
          <Plus className="h-4 w-4" /> Add doctor
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : data.results.length === 0 ? (
        <Card>
          <EmptyState icon={<Stethoscope className="h-6 w-6" />} title="No doctors found">
            Try a different search or department.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.results.map((d) => (
              <Card key={d.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={d.full_name} email={d.email || d.full_name} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{doctorName(d.full_name)}</p>
                    <p className="truncate text-sm text-primary">{d.specialization || "General practice"}</p>
                    <p className="truncate text-xs text-muted">{d.department_name || "No department"}</p>
                  </div>
                  <Badge tone={d.is_active ? "success" : "neutral"}>{d.is_active ? "Available" : "Off"}</Badge>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted">
                  <p className="flex items-center gap-2 truncate">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {d.qualification || "—"} · {d.experience_years} yrs
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" /> {formatShift(d.shift_start, d.shift_end)}
                  </p>
                  {d.phone && (
                    <p className="flex items-center gap-2 truncate">
                      <Phone className="h-4 w-4 shrink-0" /> {d.phone}
                    </p>
                  )}
                  {d.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{d.email}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-1" aria-label="Working days">
                  {WEEKDAYS.map((w) => {
                    const on = d.available_days.length === 0 || d.available_days.includes(w.value);
                    return (
                      <span
                        key={w.value}
                        title={`${w.label}: ${on ? "working" : "off"}`}
                        className={`flex-1 rounded-md py-1 text-center text-[11px] font-semibold ${on ? "bg-primary-soft text-primary" : "bg-background text-muted/60 line-through"}`}
                      >
                        {w.label.slice(0, 2)}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted">Consultation</p>
                    <p className="font-bold tabular-nums">{formatMoney(d.consultation_fee)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Upcoming</p>
                    <p className="flex items-center justify-end gap-1 font-bold tabular-nums">
                      <CalendarClock className="h-4 w-4 text-muted" /> {d.upcoming_appointments}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1 py-2" onClick={() => setEditing(d)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="ghost" className="px-3 py-2 hover:text-danger" title="Delete" onClick={() => setDeleting(d)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </Card>
        </>
      )}

      {editing !== undefined && (
        <DoctorFormModal
          key={editing?.id ?? "new"}
          doctor={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete doctor"
        message={
          <>
            Delete <strong>{deleting && doctorName(deleting.full_name)}</strong>? Doctors with appointment history can’t be deleted — mark them unavailable
            instead.
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
