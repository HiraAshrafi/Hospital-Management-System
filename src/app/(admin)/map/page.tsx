"use client";

import { Building2, MapPin, MousePointerClick, Phone, Search, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DoctorFormModal } from "@/components/hms/DoctorFormModal";
import { type MapAction, type MapFocus, MapView } from "@/components/hms/MapView";
import { HospitalFormModal } from "@/components/hospitals/HospitalFormModal";
import { Alert, Card, Input, Select, Spinner, Tabs } from "@/components/ui";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { doctorName } from "@/lib/hms";
import { hospitalTypeLabel } from "@/lib/hospitals";
import type { Department, Doctor, Hospital, LatLng, MapData, Paginated } from "@/lib/types";

const RADII = [
  { value: 5, label: "Within 5 km" },
  { value: 10, label: "Within 10 km" },
  { value: 25, label: "Within 25 km (Greater Dhaka)" },
  { value: 50, label: "Within 50 km" },
  { value: 300, label: "All Bangladesh (300 km)" },
];

function LayerToggle({ on, onChange, color, icon, label, count }: { on: boolean; onChange: (v: boolean) => void; color: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
        on ? "border-border bg-surface text-foreground" : "border-dashed border-border bg-transparent text-muted line-through"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: on ? color : "var(--muted)" }}>
        {icon}
      </span>
      {label}
      <span className="rounded-md bg-background px-1.5 text-xs tabular-nums text-muted">{count}</span>
    </button>
  );
}

export default function MapPage() {
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState("");
  const [radius, setRadius] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showDoctors, setShowDoctors] = useState(true);
  const [tab, setTab] = useState<"hospitals" | "doctors">("doctors");
  const [focus, setFocus] = useState<MapFocus>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const focusCounter = useRef(0);

  const [addHospitalAt, setAddHospitalAt] = useState<LatLng | null>(null);
  const [addDoctorAt, setAddDoctorAt] = useState<LatLng | null>(null);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    api<Paginated<Department>>(`/departments/${buildQuery({ page_size: 100 })}`)
      .then((res) => setDepartments(res.results))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api<MapData>(`/map/${buildQuery({ radius_km: radius, search, department })}`)
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
  }, [radius, search, department, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const focusOn = useCallback((kind: "hospital" | "doctor", id: number) => {
    focusCounter.current += 1;
    setFocus({ kind, id, n: focusCounter.current });
  }, []);

  const handleAction = useCallback(
    (action: MapAction) => {
      if (action.type === "add-hospital") setAddHospitalAt(action.at);
      else if (action.type === "add-doctor") setAddDoctorAt(action.at);
      else if (action.type === "edit-hospital")
        api<Hospital>(`/hospitals/${action.id}/`).then(setEditingHospital).catch((err) => setError(errorMessage(err)));
      else if (action.type === "edit-doctor")
        api<Doctor>(`/doctors/${action.id}/`).then(setEditingDoctor).catch((err) => setError(errorMessage(err)));
    },
    [],
  );

  const hospitals = data?.hospitals ?? [];
  const doctors = data?.doctors ?? [];
  const unplaced = data?.unplaced;

  function savedHospital(h: Hospital) {
    setAddHospitalAt(null);
    setEditingHospital(null);
    reload();
    if (h.latitude !== null) {
      setShowHospitals(true);
      setTab("hospitals");
      focusOn("hospital", h.id);
    }
  }

  function savedDoctor(d: Doctor) {
    setAddDoctorAt(null);
    setEditingDoctor(null);
    reload();
    if (d.latitude !== null) {
      setShowDoctors(true);
      setTab("doctors");
      focusOn("doctor", d.id);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search name, specialist, area" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Distance from Dhaka centre">
            {RADII.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Doctor department">
            <option value="">Doctors in all departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <LayerToggle on={showHospitals} onChange={setShowHospitals} color="#e5484d" icon={<Building2 className="h-3 w-3" />} label="Hospitals" count={hospitals.length} />
          <LayerToggle on={showDoctors} onChange={setShowDoctors} color="var(--primary)" icon={<Stethoscope className="h-3 w-3" />} label="Doctors" count={doctors.length} />
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Map */}
        <Card className="relative h-[560px] overflow-hidden xl:h-[calc(100vh-220px)] xl:min-h-[560px]">
          <MapView
            radiusKm={radius}
            hospitals={hospitals}
            doctors={doctors}
            showHospitals={showHospitals}
            showDoctors={showDoctors}
            focus={focus}
            onAction={handleAction}
          />
          <div className="pointer-events-none absolute right-3 top-3 z-10 hidden items-center gap-2 rounded-xl bg-surface/95 px-3 py-2 text-xs font-medium shadow-md sm:flex">
            <MousePointerClick className="h-4 w-4 text-primary" /> Click anywhere on the map to add a hospital or doctor there
          </div>
          <div className="pointer-events-none absolute bottom-6 left-3 z-10 flex flex-col gap-1.5 rounded-xl bg-surface/95 px-3 py-2.5 text-xs shadow-md">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#e5484d] ring-2 ring-white" /> Hospital
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary ring-2 ring-white" /> Doctor
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-dashed border-primary" /> {radius} km from Dhaka centre
            </span>
          </div>
          {!data && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60">
              <Spinner />
            </div>
          )}
        </Card>

        {/* Nearest list */}
        <Card className="flex max-h-[560px] flex-col overflow-hidden xl:max-h-[calc(100vh-220px)] xl:min-h-[560px]">
          <div className="border-b border-border p-4">
            <Tabs
              value={tab}
              onChange={setTab}
              label="List"
              options={[
                { value: "doctors", label: `Doctors (${doctors.length})` },
                { value: "hospitals", label: `Hospitals (${hospitals.length})` },
              ]}
            />
            <p className="mt-2 text-xs text-muted">Nearest to Dhaka centre first. Click one to find it on the map.</p>
          </div>
          <ul className="flex-1 divide-y divide-border overflow-y-auto">
            {tab === "doctors" &&
              doctors.map((d) => (
                <li key={d.id}>
                  <button onClick={() => { setShowDoctors(true); focusOn("doctor", d.id); }} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-muted">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <Stethoscope className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{doctorName(d.full_name)}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">{d.distance_km} km</span>
                      </span>
                      <span className="block truncate text-xs text-primary">
                        {[d.designation, d.specialization].filter(Boolean).join(" · ")}
                      </span>
                      <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                        <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{d.chamber || "Chamber not set"}</span>
                      </span>
                      {d.phone && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <Phone className="h-3 w-3 shrink-0" /> {d.phone}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            {tab === "hospitals" &&
              hospitals.map((h) => (
                <li key={h.id}>
                  <button onClick={() => { setShowHospitals(true); focusOn("hospital", h.id); }} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-muted">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e5484d] text-white">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{h.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">{h.distance_km} km</span>
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {hospitalTypeLabel(h.hospital_type)}
                        {h.emergency_available && " · Emergency"}
                        {h.bed_capacity ? ` · ${h.bed_capacity} beds` : ""}
                      </span>
                      <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                        <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{h.address || "No address"}</span>
                      </span>
                      {h.phone && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <Phone className="h-3 w-3 shrink-0" /> {h.phone}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            {data && (tab === "doctors" ? doctors : hospitals).length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">Nothing found within {radius} km. Try a wider distance or clear the search.</li>
            )}
          </ul>
          {unplaced && (unplaced.hospitals > 0 || unplaced.doctors > 0) && (
            <p className="border-t border-border bg-warning-soft/60 px-4 py-3 text-xs text-warning">
              Not on the map yet: {unplaced.hospitals} hospital{unplaced.hospitals === 1 ? "" : "s"} and {unplaced.doctors} doctor
              {unplaced.doctors === 1 ? "" : "s"} have no location. Add latitude and longitude when editing them.
            </p>
          )}
        </Card>
      </div>

      {addHospitalAt && <HospitalFormModal hospital={null} location={addHospitalAt} onClose={() => setAddHospitalAt(null)} onSaved={savedHospital} />}
      {addDoctorAt && <DoctorFormModal doctor={null} location={addDoctorAt} onClose={() => setAddDoctorAt(null)} onSaved={savedDoctor} />}
      {editingHospital && <HospitalFormModal key={editingHospital.id} hospital={editingHospital} onClose={() => setEditingHospital(null)} onSaved={savedHospital} />}
      {editingDoctor && <DoctorFormModal key={editingDoctor.id} doctor={editingDoctor} onClose={() => setEditingDoctor(null)} onSaved={savedDoctor} />}
    </div>
  );
}
