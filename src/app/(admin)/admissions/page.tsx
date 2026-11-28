"use client";

import { BedDouble, HeartPulse, LogIn, LogOut, Search, Siren, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdmitModal } from "@/components/admissions/AdmissionModals";
import { Alert, Avatar, Badge, Button, Card, EmptyState, Input, Pagination, Select, Spinner, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ADMISSION_STATUS, ADMISSION_TYPES, doctorName, formatDateTime, formatDay } from "@/lib/hms";
import type { Admission, AdmissionStats, Ward } from "@/lib/types";
import { useDebounced, useList, usePage, useResource } from "@/lib/useList";

const PAGE_SIZE = 12;

function Stat({ icon: Icon, label, value, hint, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint?: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="text-xl font-extrabold tabular-nums text-navy">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

export default function AdmissionsPage() {
  const router = useRouter();
  const { user, can } = useAuth();
  const [tab, setTab] = useState<"admitted" | "past" | "">("admitted");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [ward, setWard] = useState("");
  const [type, setType] = useState("");
  const [icu, setIcu] = useState("");
  const [mine, setMine] = useState(user?.role === "doctor" && Boolean(user.doctor_id));
  const [page, setPage] = usePage(tab, search, ward, type, icu, mine);
  const [admitting, setAdmitting] = useState<"normal" | "emergency" | null>(null);

  const stats = useResource<AdmissionStats>("/admissions/stats/");
  const wards = useResource<Ward[]>("/wards/");
  const { data, error, reload } = useList<Admission>("/admissions/", {
    page, page_size: PAGE_SIZE, search, ward, admission_type: type, icu: icu || undefined, mine: mine || undefined,
    status: tab === "admitted" ? "admitted" : undefined,
    past: tab === "past" ? true : undefined,
    ordering: tab === "past" ? "-discharged_at" : "-admitted_at",
  });
  const rows = data?.results;
  const s = stats.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat icon={BedDouble} label="Admitted now" value={s?.admitted ?? "…"} hint={s ? `${s.due_today} due for discharge` : ""} tone="bg-primary-soft text-primary" />
        <Stat icon={BedDouble} label="Bed occupancy" value={s ? `${s.occupancy_rate}%` : "…"} hint={s ? `${s.beds_occupied}/${s.beds_total} · ${s.beds_available} free` : ""} tone="bg-accent-soft text-accent" />
        <Stat icon={HeartPulse} label="ICU occupancy" value={s ? `${s.icu_occupancy_rate}%` : "…"} hint={s ? `${s.icu_occupied}/${s.icu_total} ICU beds` : ""} tone="bg-danger-soft text-danger" />
        <Stat icon={LogIn} label="Admitted today" value={s?.admitted_today ?? "…"} hint={s ? `${s.emergency_today} emergency` : ""} tone="bg-violet-soft text-violet" />
        <Stat icon={LogOut} label="Discharged today" value={s?.discharged_today ?? "…"} tone="bg-success-soft text-success" />
        <Stat icon={Timer} label="Avg. stay (30 days)" value={s?.avg_length_of_stay_days != null ? `${s.avg_length_of_stay_days} d` : "—"} tone="bg-warning-soft text-warning" />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs label="Admissions" value={tab} onChange={setTab} options={[{ value: "admitted", label: "Currently admitted" }, { value: "past", label: "Discharged" }, { value: "", label: "All" }]} />
          {user?.doctor_id && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              My patients
            </label>
          )}
        </div>
        {can("admissions.manage") && (
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setAdmitting("emergency")}>
              <Siren className="h-4 w-4" /> Emergency admission
            </Button>
            <Button onClick={() => setAdmitting("normal")}>
              <LogIn className="h-4 w-4" /> Admit patient
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Patient, admission no., doctor, diagnosis" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <Select value={ward} onChange={(e) => setWard(e.target.value)} aria-label="Ward">
          <option value="">All wards</option>
          {(wards.data ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="">All admission types</option>
          {ADMISSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select value={icu} onChange={(e) => setIcu(e.target.value)} aria-label="ICU">
          <option value="">ICU and wards</option>
          <option value="true">ICU / critical care only</option>
          <option value="false">Excluding ICU</option>
        </Select>
      </div>

      {(error || stats.error) && <Alert>{error || stats.error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !rows || rows.length === 0 ? (
          <EmptyState icon={<BedDouble className="h-6 w-6" />} title={tab === "admitted" ? "No patients admitted" : "No admissions found"}>
            {tab === "admitted" && can("admissions.manage") ? "Admit a patient to see them here." : "Try other filters."}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 font-semibold">Bed</th>
                    <th className="px-5 py-3 font-semibold">Doctor</th>
                    <th className="px-5 py-3 font-semibold">Reason</th>
                    <th className="px-5 py-3 font-semibold">Admitted</th>
                    <th className="px-5 py-3 font-semibold">Stay</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((a) => {
                    const st = ADMISSION_STATUS[a.status];
                    const overdue = a.status === "admitted" && a.expected_discharge && a.expected_discharge < new Date().toISOString().slice(0, 10);
                    return (
                      <tr key={a.id} className="cursor-pointer hover:bg-surface-muted" onClick={() => router.push(`/admissions/${a.id}`)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={a.patient_info.full_name} email={a.patient_info.mrn} size={36} />
                            <div className="min-w-0">
                              <Link href={`/admissions/${a.id}`} className="block truncate font-semibold hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                {a.patient_info.full_name}
                              </Link>
                              <p className="truncate text-xs text-muted">{a.admission_no} · {a.patient_info.mrn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {a.bed_label ? (
                            <>
                              <p className="font-semibold">{a.bed_label.split(" · ")[1]}</p>
                              <p className="text-xs text-muted">{a.ward_name}</p>
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                          {a.is_icu && <Badge tone="danger">ICU</Badge>}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{doctorName(a.doctor_info.full_name)}</p>
                          <p className="text-xs text-muted">{a.department_name}</p>
                        </td>
                        <td className="max-w-[220px] px-5 py-3">
                          <p className="truncate">{a.reason}</p>
                          {a.admission_type === "emergency" && <Badge tone="danger">Emergency</Badge>}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(a.admitted_at)}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <p className="font-semibold tabular-nums">{a.length_of_stay_days} day{a.length_of_stay_days === 1 ? "" : "s"}</p>
                          {a.expected_discharge && a.status === "admitted" && (
                            <p className={`text-xs ${overdue ? "font-semibold text-danger" : "text-muted"}`}>Due {formatDay(a.expected_discharge)}</p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {a.discharge_type_label && a.status !== "admitted" && <p className="mt-1 text-xs text-muted">{a.discharge_type_label}</p>}
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

      {admitting && (
        <AdmitModal
          emergency={admitting === "emergency"}
          onClose={() => setAdmitting(null)}
          onSaved={(a) => {
            setAdmitting(null);
            reload();
            stats.reload();
            router.push(`/admissions/${a.id}`);
          }}
        />
      )}
    </div>
  );
}
