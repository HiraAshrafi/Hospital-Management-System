"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Calculator, Download, IdCard, Pencil, Phone, Plus, ReceiptText, Route, Search, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AmbulanceFormModal } from "@/components/ambulances/AmbulanceFormModal";
import { Alert, Avatar, Badge, Button, Card, EmptyState, Input, Pagination, Select, Spinner, Tabs } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { AMBULANCE_TYPES, ambulanceType, LIVE_STATE, lastSeen, liveState, TRIP_STATUS } from "@/lib/ambulances";
import { formatMoney } from "@/lib/hms";
import type { Ambulance, AmbulanceTrip, DriverRow, DriversData, Paginated, StatsPeriod } from "@/lib/types";

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
const TRIP_PAGE_SIZE = 15;

type SortKey = "driver_name" | "per_km_rate" | "quote" | "trips_completed" | "total_km" | "revenue" | "last_trip_at";

function sortValue(row: DriverRow, key: SortKey): string | number {
  if (key === "quote") return row.quote.total;
  if (key === "last_trip_at") return row.last_trip_at ?? "";
  if (key === "driver_name") return row.driver_name.toLowerCase();
  return row[key] ?? -1;
}

function km(value: number | string) {
  return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

type Sort = { key: SortKey; dir: 1 | -1 };

function SortHeader({ k, sort, onSort, children, align = "left" }: { k: SortKey; sort: Sort; onSort: (s: Sort) => void; children: string; align?: "left" | "right" }) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  const firstDir = k === "driver_name" ? 1 : -1; // names A–Z first, numbers biggest first
  return (
    <button
      type="button"
      onClick={() => onSort({ key: k, dir: active ? (sort.dir === 1 ? -1 : 1) : firstDir })}
      className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:text-foreground ${active ? "text-foreground" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
      aria-label={`Sort by ${children}`}
    >
      {children}
      <Icon className="h-3 w-3" />
    </button>
  );
}

function SummaryCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="text-xl font-extrabold tabular-nums">{value}</p>
        {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
      </div>
    </Card>
  );
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AmbulanceDriversPage() {
  const [tab, setTab] = useState<"drivers" | "trips">("drivers");
  const [period, setPeriod] = useState<StatsPeriod>("30d");
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Ambulance | null | undefined>(undefined);

  // Drivers tab
  const [data, setData] = useState<DriversData | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [quoteInput, setQuoteInput] = useState("10");
  const [quoteKm, setQuoteKm] = useState("10");
  const [sort, setSort] = useState<Sort>({ key: "revenue", dir: -1 });

  // Trip log tab
  const [trips, setTrips] = useState<Paginated<AmbulanceTrip> | null>(null);
  const [tripPage, setTripPage] = useState(1);
  const [tripSearchInput, setTripSearchInput] = useState("");
  const [tripSearch, setTripSearch] = useState("");
  const [tripDriver, setTripDriver] = useState("");
  const [tripStatus, setTripStatus] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    const t = setTimeout(() => setQuoteKm(quoteInput), 400);
    return () => clearTimeout(t);
  }, [quoteInput]);
  useEffect(() => {
    const t = setTimeout(() => {
      setTripSearch(tripSearchInput.trim());
      setTripPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [tripSearchInput]);

  useEffect(() => {
    let cancelled = false;
    api<DriversData>(`/ambulances/drivers/${buildQuery({ period, search, type, status, quote_km: quoteKm })}`)
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
  }, [period, search, type, status, quoteKm, reloadKey]);

  useEffect(() => {
    if (tab !== "trips") return;
    let cancelled = false;
    const query = buildQuery({ page: tripPage, page_size: TRIP_PAGE_SIZE, period, search: tripSearch, ambulance: tripDriver, status: tripStatus, ordering: "-created_at" });
    api<Paginated<AmbulanceTrip>>(`/ambulance-trips/${query}`)
      .then((res) => !cancelled && setTrips(res))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [tab, tripPage, period, tripSearch, tripDriver, tripStatus, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const editAmbulance = (id: number) => api<Ambulance>(`/ambulances/${id}/`).then(setEditing).catch((err) => setError(errorMessage(err)));

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data.drivers].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [data, sort]);

  function exportDrivers() {
    if (!data) return;
    const periodLabel = PERIODS.find((p) => p.value === data.period)?.label ?? data.period;
    downloadCsv(
      `ambulance-drivers-${data.period}.csv`,
      ["Driver", "Phone", "Licence", "Vehicle", "Type", "Status", "Base hospital", "Base fare", "Per km", "Minimum fare", `Price for ${data.quote_km} km`,
        `Trips (${periodLabel})`, "Cancelled", "Distance km", "Revenue", "Average fare", "Revenue per km", "Last trip"],
      rows.map((r) => [
        r.driver_name, r.driver_phone, r.driver_license, r.vehicle_no, ambulanceType(r.type).label, LIVE_STATE[liveState(r)].label, r.base_hospital_name,
        r.base_fare, r.per_km_rate, r.min_fare, r.quote.total, r.trips_completed, r.trips_cancelled, r.total_km, r.revenue,
        r.avg_fare ?? "", r.avg_per_km ?? "", r.last_trip_at ? r.last_trip_at.slice(0, 16).replace("T", " ") : "",
      ]),
    );
  }

  const summary = data?.summary;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          label="View"
          options={[
            { value: "drivers", label: "Drivers & fares" },
            { value: "trips", label: "Trip log" },
          ]}
        />
        <Select value={period} onChange={(e) => { setPeriod(e.target.value as StatsPeriod); setTripPage(1); }} className="sm:w-44" aria-label="Period">
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard icon={<IdCard className="h-5 w-5" />} label="Drivers on duty" value={summary ? `${summary.on_duty}/${summary.drivers}` : "—"} tone="bg-primary-soft text-primary" />
        <SummaryCard icon={<ReceiptText className="h-5 w-5" />} label="Completed trips" value={summary ? String(summary.trips) : "—"} sub={summary ? `${summary.cancelled} cancelled · ${periodLabel}` : undefined} tone="bg-success-soft text-success" />
        <SummaryCard icon={<Route className="h-5 w-5" />} label="Distance driven" value={summary ? km(summary.km) : "—"} tone="bg-accent-soft text-accent" />
        <SummaryCard icon={<Wallet className="h-5 w-5" />} label="Revenue" value={summary ? formatMoney(summary.revenue) : "—"} tone="bg-violet-soft text-violet" />
        <SummaryCard
          icon={<Calculator className="h-5 w-5" />}
          label="Average fare"
          value={summary?.avg_fare ? formatMoney(summary.avg_fare) : "—"}
          sub={summary?.avg_per_km ? `${formatMoney(summary.avg_per_km)} per km` : undefined}
          tone="bg-warning-soft text-warning"
        />
      </div>

      {tab === "drivers" ? (
        <>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:flex">
              <div className="relative xl:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input placeholder="Driver, vehicle or phone" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
              </div>
              <Select value={type} onChange={(e) => setType(e.target.value)} className="xl:w-44" aria-label="Type">
                <option value="">All types</option>
                {AMBULANCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="xl:w-36" aria-label="Status">
                <option value="">All statuses</option>
                <option value="available">Available</option>
                <option value="on_trip">On trip</option>
                <option value="offline">Off duty</option>
                <option value="maintenance">Maintenance</option>
              </Select>
              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm xl:w-48" title="Price each ambulance would charge for this distance">
                <Calculator className="h-4 w-4 shrink-0 text-muted" />
                <span className="shrink-0 text-muted">Price for</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step="1"
                  value={quoteInput}
                  onChange={(e) => setQuoteInput(e.target.value)}
                  className="w-full min-w-0 bg-transparent py-2.5 text-right font-semibold outline-none"
                  aria-label="Distance in km for the price column"
                />
                <span className="shrink-0 text-muted">km</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={exportDrivers} disabled={!data} className="whitespace-nowrap">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Button onClick={() => setEditing(null)} className="whitespace-nowrap">
                <Plus className="h-4 w-4" /> Add ambulance
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            {!data ? (
              <div className="flex justify-center py-20">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState icon={<IdCard className="h-6 w-6" />} title="No drivers found">
                Try another search or filter.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
                  <thead className="bg-surface-muted text-xs text-muted">
                    <tr>
                      <th className="px-4 py-3"><SortHeader k="driver_name" sort={sort} onSort={setSort}>Driver &amp; vehicle</SortHeader></th>
                      <th className="w-[105px] px-4 py-3 font-semibold">Status</th>
                      <th className="w-[165px] px-4 py-3"><SortHeader k="per_km_rate" sort={sort} onSort={setSort}>Rate card</SortHeader></th>
                      <th className="w-[105px] px-4 py-3 text-right"><SortHeader k="quote" sort={sort} onSort={setSort} align="right">{`${data.quote_km} km fare`}</SortHeader></th>
                      <th className="w-[80px] px-4 py-3 text-right"><SortHeader k="trips_completed" sort={sort} onSort={setSort} align="right">Trips</SortHeader></th>
                      <th className="w-[90px] px-4 py-3 text-right"><SortHeader k="total_km" sort={sort} onSort={setSort} align="right">Distance</SortHeader></th>
                      <th className="w-[125px] px-4 py-3 text-right"><SortHeader k="revenue" sort={sort} onSort={setSort} align="right">Revenue</SortHeader></th>
                      <th className="w-[95px] px-4 py-3"><SortHeader k="last_trip_at" sort={sort} onSort={setSort}>Last trip</SortHeader></th>
                      <th className="w-[80px] px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => {
                      const state = LIVE_STATE[liveState(r)];
                      return (
                        <tr key={r.id} className="hover:bg-surface-muted">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={r.driver_name} email={r.vehicle_no} size={36} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{r.driver_name}</p>
                                <p className="truncate text-xs tabular-nums">{r.driver_phone || <span className="text-muted">No phone</span>}</p>
                                <p className="truncate text-xs text-muted" title={r.base_hospital_name ? `Base: ${r.base_hospital_name}` : undefined}>
                                  {r.vehicle_no} · {ambulanceType(r.type).short}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={state.tone}>{state.label}</Badge>
                            <p className="mt-1 truncate text-[11px] text-muted">GPS {lastSeen(r.last_seen_seconds)}</p>
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            <p className="whitespace-nowrap font-medium">
                              {formatMoney(r.base_fare)} + {formatMoney(r.per_km_rate)}/km
                            </p>
                            <p className="text-xs text-muted">Minimum {formatMoney(r.min_fare)}</p>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums" title={r.quote.minimum_applied ? "Minimum fare applies" : `${formatMoney(r.quote.base_fare)} + ${r.quote.distance_km} km × ${formatMoney(r.quote.per_km_rate)}`}>
                            <p className="font-bold">{formatMoney(r.quote.total)}</p>
                            <p className="text-[11px] text-muted">{r.quote.minimum_applied ? "minimum" : r.quote.night ? "incl. night +20%" : "standard"}</p>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <p className="font-semibold">{r.trips_completed}</p>
                            {r.trips_cancelled > 0 && <p className="whitespace-nowrap text-[11px] text-muted">{r.trips_cancelled} cancelled</p>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{km(r.total_km)}</td>
                          <td className="px-4 py-3 text-right tabular-nums" title={r.avg_per_km ? `${formatMoney(r.avg_per_km)} per km` : undefined}>
                            <p className="font-semibold">{formatMoney(r.revenue)}</p>
                            {r.avg_fare !== null && <p className="text-[11px] text-muted">avg {formatMoney(r.avg_fare)}/trip</p>}
                          </td>
                          <td className="truncate px-4 py-3 text-muted" title={r.last_trip_at ? formatDate(r.last_trip_at) : undefined}>
                            {r.last_trip_at ? new Date(r.last_trip_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {r.driver_phone && (
                                <a href={`tel:${r.driver_phone.replace(/\s/g, "")}`} className="rounded-lg p-2 text-muted hover:bg-background hover:text-primary" title={`Call ${r.driver_name}`}>
                                  <Phone className="h-4 w-4" />
                                </a>
                              )}
                              <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => editAmbulance(r.id)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-surface-muted text-sm font-semibold tabular-nums">
                    <tr>
                      <td className="px-4 py-3" colSpan={4}>
                        Total · {rows.length} driver{rows.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-right">{rows.reduce((s, r) => s + r.trips_completed, 0)}</td>
                      <td className="px-4 py-3 text-right">{km(rows.reduce((s, r) => s + r.total_km, 0))}</td>
                      <td className="px-4 py-3 text-right">
                        <p>{formatMoney(rows.reduce((s, r) => s + r.revenue, 0))}</p>
                        {summary?.avg_fare && <p className="text-[11px] font-normal text-muted">avg {formatMoney(summary.avg_fare)}/trip</p>}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
          <p className="text-xs text-muted">
            Fare = base fare + per-km rate × road distance, never below the minimum; +20% from 10 PM to 6 AM; rounded to ৳10. Trips, distance and revenue
            count completed trips in the selected period.
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 xl:flex">
            <div className="relative xl:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input placeholder="Patient, phone, vehicle, driver, place" value={tripSearchInput} onChange={(e) => setTripSearchInput(e.target.value)} className="pl-9" />
            </div>
            <Select value={tripDriver} onChange={(e) => { setTripDriver(e.target.value); setTripPage(1); }} className="xl:w-56" aria-label="Driver">
              <option value="">All drivers</option>
              {(data?.drivers ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.driver_name} · {d.vehicle_no}
                </option>
              ))}
            </Select>
            <Select value={tripStatus} onChange={(e) => { setTripStatus(e.target.value); setTripPage(1); }} className="xl:w-48" aria-label="Trip status">
              <option value="">All statuses</option>
              {Object.entries(TRIP_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <Card className="overflow-hidden">
            {!trips ? (
              <div className="flex justify-center py-20">
                <Spinner />
              </div>
            ) : trips.results.length === 0 ? (
              <EmptyState icon={<ReceiptText className="h-6 w-6" />} title="No trips found">
                Try another period or clear the filters.
              </EmptyState>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] table-fixed text-left text-sm">
                    <thead className="bg-surface-muted text-xs text-muted">
                      <tr>
                        <th className="w-[130px] px-4 py-3 font-semibold">When</th>
                        <th className="w-[210px] px-4 py-3 font-semibold">Driver</th>
                        <th className="w-[190px] px-4 py-3 font-semibold">Patient</th>
                        <th className="px-4 py-3 font-semibold">Route</th>
                        <th className="w-[90px] px-4 py-3 text-right font-semibold">Distance</th>
                        <th className="w-[110px] px-4 py-3 text-right font-semibold">Fare</th>
                        <th className="w-[150px] px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {trips.results.map((t) => {
                        const fare = t.status === "completed" ? t.final_fare ?? t.estimated_fare : t.estimated_fare;
                        const b = t.fare_breakdown;
                        return (
                          <tr key={t.id} className="hover:bg-surface-muted">
                            <td className="px-4 py-3">
                              <p className="font-medium">{formatDate(t.created_at)}</p>
                              <p className="text-xs text-muted">
                                {new Date(t.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · #{t.id}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="truncate font-semibold">{t.ambulance_info.driver_name}</p>
                              <p className="truncate text-xs text-muted">
                                {t.ambulance_info.vehicle_no} · {ambulanceType(t.ambulance_info.type).short}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="truncate font-medium">{t.patient_name}</p>
                              <p className="truncate text-xs text-muted">{t.contact_phone}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="truncate text-xs"><span className="font-semibold text-warning">From</span> {t.pickup_address || "Point on map"}</p>
                              <p className="truncate text-xs"><span className="font-semibold text-danger">To</span> {t.destination_address}</p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{km(t.distance_km)}</td>
                            <td
                              className="px-4 py-3 text-right tabular-nums"
                              title={b?.total ? `${formatMoney(b.base_fare)} + ${b.distance_km} km × ${formatMoney(b.per_km_rate)}${b.minimum_applied ? " → minimum fare" : ""}${b.night ? " + night 20%" : ""}` : undefined}
                            >
                              <p className={`font-semibold ${t.status === "cancelled" ? "text-muted line-through" : ""}`}>{formatMoney(fare)}</p>
                              <p className="text-[11px] text-muted">{t.status === "completed" ? "charged" : t.status === "cancelled" ? "not charged" : "estimate"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={TRIP_STATUS[t.status].tone}>{TRIP_STATUS[t.status].label}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={tripPage} pageSize={TRIP_PAGE_SIZE} count={trips.count} onChange={setTripPage} />
              </>
            )}
          </Card>
        </>
      )}

      {editing !== undefined && (
        <AmbulanceFormModal
          key={editing?.id ?? "new"}
          ambulance={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </div>
  );
}
