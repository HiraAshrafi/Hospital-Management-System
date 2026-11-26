"use client";

import {
  Ambulance as AmbulanceIcon,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  Moon,
  MousePointerClick,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Route,
  Siren,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AmbulanceFormModal } from "@/components/ambulances/AmbulanceFormModal";
import { type AmbulanceFocus, AmbulanceMap } from "@/components/ambulances/AmbulanceMap";
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Input, Modal, Spinner, Tabs } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { ambulanceType, LIVE_STATE, lastSeen, liveState, TRIP_STATUS } from "@/lib/ambulances";
import { formatMoney } from "@/lib/hms";
import type { Ambulance, AmbulanceQuote, AmbulanceTrip, LatLng, LiveData, LiveTrip, NearHospital, Paginated } from "@/lib/types";

const POLL_MS = 5000;

type Dispatch = {
  step: "pickup" | "destination" | "ambulance";
  pickup?: LatLng;
  pickupAddress: string;
  hospitals: NearHospital[];
  destination?: LatLng & { hospitalId?: number; label: string };
  quote?: AmbulanceQuote;
  ambulanceId?: number;
  patientName: string;
  contactPhone: string;
  notes: string;
  loading: boolean;
  error: string;
};

const NEW_DISPATCH: Dispatch = { step: "pickup", pickupAddress: "", hospitals: [], patientName: "", contactPhone: "", notes: "", loading: false, error: "" };

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="text-xl font-extrabold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}

function TripProgress({ status }: { status: AmbulanceTrip["status"] }) {
  const step = status === "dispatched" ? 1 : status === "picked_up" ? 2 : 3;
  return (
    <div className="flex gap-1" aria-label={TRIP_STATUS[status].label}>
      {["Dispatched", "Picked up", "At hospital"].map((label, i) => (
        <div key={label} className="flex-1">
          <div className={`h-1.5 rounded-full ${i < step ? (i === step - 1 ? "bg-warning" : "bg-success") : "bg-chart-track"}`} />
          <p className={`mt-1 text-[10px] ${i < step ? "font-semibold text-foreground" : "text-muted"}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AmbulancesPage() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [error, setError] = useState("");
  const [connectionLost, setConnectionLost] = useState(false);
  const [tab, setTab] = useState<"trips" | "fleet" | "history">("trips");
  const [focus, setFocus] = useState<AmbulanceFocus>(null);
  const focusN = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [editing, setEditing] = useState<Ambulance | null | undefined>(undefined);
  const [busyTrip, setBusyTrip] = useState<number | null>(null);
  const [completing, setCompleting] = useState<LiveTrip | null>(null);
  const [finalFare, setFinalFare] = useState("");
  const [cancelling, setCancelling] = useState<LiveTrip | null>(null);
  const [history, setHistory] = useState<AmbulanceTrip[] | null>(null);

  // Live data: poll every few seconds while the tab is visible.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      api<LiveData>("/ambulances/live/")
        .then((data) => {
          if (cancelled) return;
          setLive(data);
          setConnectionLost(false);
        })
        .catch(() => !cancelled && setConnectionLost(true));
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reloadKey]);

  useEffect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    api<Paginated<AmbulanceTrip>>(`/ambulance-trips/${buildQuery({ ordering: "-created_at", page_size: 25 })}`)
      .then((res) => !cancelled && setHistory(res.results.filter((t) => t.status === "completed" || t.status === "cancelled")))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const focusOn = useCallback((id: number) => {
    focusN.current += 1;
    setFocus({ id, n: focusN.current });
  }, []);

  const editAmbulance = useCallback((id: number) => {
    api<Ambulance>(`/ambulances/${id}/`).then(setEditing).catch((err) => setError(errorMessage(err)));
  }, []);

  // ---- dispatch flow -------------------------------------------------------
  const quote = useCallback(async (d: Dispatch, destination?: Dispatch["destination"]) => {
    if (!d.pickup) return;
    setDispatch({ ...d, destination, loading: true, error: "" });
    try {
      const params: Record<string, number | string> = { pickup_lat: d.pickup.lat, pickup_lng: d.pickup.lng };
      if (destination?.hospitalId) params.hospital = destination.hospitalId;
      else if (destination) Object.assign(params, { destination_lat: destination.lat, destination_lng: destination.lng });
      const q = await api<AmbulanceQuote>(`/ambulances/quote/${buildQuery(params)}`);
      setDispatch({
        ...d,
        destination,
        quote: q,
        hospitals: q.nearest_hospitals,
        step: destination ? "ambulance" : "destination",
        ambulanceId: q.options?.[0]?.ambulance.id,
        loading: false,
        error: "",
      });
    } catch (err) {
      setDispatch({ ...d, destination, loading: false, error: errorMessage(err) });
    }
  }, []);

  const onPick = useCallback(
    (at: LatLng) => {
      if (!dispatch) return;
      if (dispatch.step === "pickup") quote({ ...dispatch, pickup: at });
      else if (dispatch.step === "destination") quote(dispatch, { ...at, label: "Point on map" });
    },
    [dispatch, quote],
  );

  async function confirmDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!dispatch?.pickup || !dispatch.destination || !dispatch.ambulanceId) return;
    setDispatch({ ...dispatch, loading: true, error: "" });
    const d = dispatch;
    const body: Record<string, unknown> = {
      ambulance: d.ambulanceId,
      patient_name: d.patientName.trim(),
      contact_phone: d.contactPhone.trim(),
      pickup_address: d.pickupAddress.trim(),
      pickup_lat: d.pickup!.lat.toFixed(6),
      pickup_lng: d.pickup!.lng.toFixed(6),
      notes: d.notes,
    };
    if (d.destination!.hospitalId) body.destination_hospital = d.destination!.hospitalId;
    else Object.assign(body, { destination_lat: d.destination!.lat.toFixed(6), destination_lng: d.destination!.lng.toFixed(6), destination_address: d.destination!.label });
    try {
      const trip = await api<AmbulanceTrip>("/ambulance-trips/", { method: "POST", body });
      setDispatch(null);
      setTab("trips");
      reload();
      focusOn(trip.ambulance);
    } catch (err) {
      setDispatch({ ...d, loading: false, error: errorMessage(err) });
    }
  }

  // ---- trip actions --------------------------------------------------------
  async function advance(trip: LiveTrip, fare?: string) {
    setBusyTrip(trip.id);
    try {
      await api(`/ambulance-trips/${trip.id}/advance/`, { method: "POST", body: fare !== undefined ? { final_fare: fare } : {} });
      setCompleting(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyTrip(null);
    }
  }

  async function cancelTrip() {
    if (!cancelling) return;
    setBusyTrip(cancelling.id);
    try {
      await api(`/ambulance-trips/${cancelling.id}/cancel/`, { method: "POST" });
      setCancelling(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
      setCancelling(null);
    } finally {
      setBusyTrip(null);
    }
  }

  const stats = live?.stats;
  const ambulances = live?.ambulances ?? [];
  const trips = live?.trips ?? [];
  const picking = dispatch?.step === "pickup" ? "pickup" : dispatch?.step === "destination" ? "destination" : null;
  const selectedOption = dispatch?.quote?.options?.find((o) => o.ambulance.id === dispatch.ambulanceId);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={<AmbulanceIcon className="h-5 w-5" />} label="Available now" value={stats?.available ?? "—"} tone="bg-success-soft text-success" />
        <StatTile icon={<Siren className="h-5 w-5" />} label="On a trip" value={stats?.on_trip ?? "—"} tone="bg-warning-soft text-warning" />
        <StatTile icon={<WifiOff className="h-5 w-5" />} label="No GPS signal" value={stats?.no_signal ?? "—"} tone="bg-danger-soft text-danger" />
        <StatTile icon={<Clock className="h-5 w-5" />} label="Off duty" value={stats?.off_duty ?? "—"} tone="bg-background text-muted" />
        <StatTile icon={<Route className="h-5 w-5" />} label="Trips today" value={stats ? `${stats.completed_today}/${stats.trips_today}` : "—"} tone="bg-primary-soft text-primary" />
        <StatTile icon={<Wallet className="h-5 w-5" />} label="Revenue today" value={stats ? formatMoney(stats.revenue_today) : "—"} tone="bg-violet-soft text-violet" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold ${connectionLost ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
            <span className="relative flex h-2 w-2">
              {!connectionLost && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75 motion-reduce:animate-none" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${connectionLost ? "bg-danger" : "bg-success"}`} />
            </span>
            {connectionLost ? "Connection lost, retrying…" : "Live · updates every 5 s"}
          </span>
          {live?.night_pricing && (
            <Badge tone="violet">
              <Moon className="h-3 w-3" /> Night fares (+20%)
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" /> Add ambulance
          </Button>
          <Button variant={dispatch ? "secondary" : "danger"} onClick={() => setDispatch(dispatch ? null : NEW_DISPATCH)}>
            {dispatch ? <X className="h-4 w-4" /> : <Siren className="h-4 w-4" />} {dispatch ? "Cancel dispatch" : "New dispatch"}
          </Button>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Live map */}
        <Card className="relative h-[560px] overflow-hidden xl:h-[calc(100vh-300px)] xl:min-h-[560px]">
          <AmbulanceMap
            ambulances={ambulances}
            trips={trips}
            draft={dispatch ? { pickup: dispatch.pickup, destination: dispatch.destination } : null}
            picking={picking}
            focus={focus}
            onPick={onPick}
            onEditAmbulance={editAmbulance}
          />
          {picking && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
              <MousePointerClick className="h-4 w-4" />
              {picking === "pickup" ? "Click the patient's pickup location" : "Click the destination, or pick a hospital on the right"}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-6 left-3 z-10 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-surface/95 px-3 py-2.5 text-xs shadow-md">
            {(["available", "on_trip", "no_signal"] as const).map((s) => (
              <span key={s} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ background: LIVE_STATE[s].color }} /> {s === "no_signal" ? "No signal / off" : LIVE_STATE[s].label}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span className="trip-dot trip-dot--pickup !h-3.5 !w-3.5 !border text-[7px]">P</span> Pickup
            </span>
            <span className="flex items-center gap-2">
              <span className="trip-dot trip-dot--dest !h-3.5 !w-3.5 !border text-[8px]">+</span> Hospital
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-4 rounded bg-primary/60" /> Route driven
            </span>
          </div>
          {!live && !connectionLost && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60">
              <Spinner />
            </div>
          )}
        </Card>

        {/* Side panel */}
        <Card className="flex max-h-[640px] flex-col overflow-hidden xl:max-h-[calc(100vh-300px)] xl:min-h-[560px]">
          {dispatch ? (
            <form onSubmit={confirmDispatch} className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger-soft text-danger">
                  <Siren className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">New dispatch</p>
                  <p className="text-xs text-muted">
                    Step {dispatch.step === "pickup" ? 1 : dispatch.step === "destination" ? 2 : 3} of 3 ·{" "}
                    {dispatch.step === "pickup" ? "Pickup location" : dispatch.step === "destination" ? "Destination" : "Choose ambulance"}
                  </p>
                </div>
                {dispatch.step !== "pickup" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2"
                    title="Back"
                    onClick={() =>
                      setDispatch(dispatch.step === "ambulance" ? { ...dispatch, step: "destination", destination: undefined, quote: undefined } : { ...NEW_DISPATCH })
                    }
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {dispatch.error && <Alert>{dispatch.error}</Alert>}
                {dispatch.step === "pickup" && (
                  <div className="rounded-xl border border-dashed border-warning/50 bg-warning-soft/50 p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-warning">
                      <MapPin className="h-4 w-4" /> Click the map where the patient is
                    </p>
                    <p className="mt-1 text-muted">Zoom in for accuracy. You can add a written address next.</p>
                  </div>
                )}
                {dispatch.pickup && (
                  <Field label="Pickup address (for the driver)">
                    <Input value={dispatch.pickupAddress} onChange={(e) => setDispatch({ ...dispatch, pickupAddress: e.target.value })} placeholder="House, road, area, landmark" />
                  </Field>
                )}
                {dispatch.loading && (
                  <div className="flex justify-center py-6">
                    <Spinner />
                  </div>
                )}

                {dispatch.step === "destination" && !dispatch.loading && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Nearest hospitals</p>
                    <ul className="space-y-1.5">
                      {dispatch.hospitals.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => quote(dispatch, { lat: h.latitude, lng: h.longitude, hospitalId: h.id, label: h.name })}
                            className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left hover:border-primary hover:bg-primary-soft/40"
                          >
                            <Building2 className="h-4 w-4 shrink-0 text-danger" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{h.name}</span>
                              <span className="block truncate text-xs text-muted">{h.emergency_available ? "Emergency · " : ""}{h.address}</span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">{h.distance_km} km</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted">Or click anywhere on the map to send the patient somewhere else.</p>
                  </div>
                )}

                {dispatch.step === "ambulance" && dispatch.quote && !dispatch.loading && (
                  <>
                    <div className="rounded-xl bg-surface-muted p-3 text-sm">
                      <p className="flex items-center gap-2 font-semibold">
                        <Navigation className="h-4 w-4 text-primary" /> To {dispatch.destination?.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {dispatch.quote.trip_km} km by road · about {dispatch.quote.trip_minutes} min drive
                        {dispatch.quote.night_pricing && " · night fares apply"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Available ambulances · fastest first</p>
                      {dispatch.quote.options?.length ? (
                        <ul className="space-y-1.5">
                          {dispatch.quote.options.map((o) => {
                            const on = o.ambulance.id === dispatch.ambulanceId;
                            return (
                              <li key={o.ambulance.id}>
                                <button
                                  type="button"
                                  onClick={() => setDispatch({ ...dispatch, ambulanceId: o.ambulance.id })}
                                  aria-pressed={on}
                                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? "border-primary bg-primary-soft/60 ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                                >
                                  <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-bold">{o.ambulance.vehicle_no}</span>
                                    <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatMoney(o.fare.total)}</span>
                                  </span>
                                  <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                                    <span className="truncate">
                                      {ambulanceType(o.ambulance.type).short} · {o.ambulance.driver_name}
                                    </span>
                                    <span className="shrink-0 font-semibold text-foreground">~{o.eta_minutes} min away</span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <Alert>No ambulance is available with a live signal right now.</Alert>
                      )}
                      {!!dispatch.quote.available_without_signal && (
                        <p className="mt-2 text-xs text-muted">{dispatch.quote.available_without_signal} available ambulance(s) hidden: no GPS signal.</p>
                      )}
                    </div>
                    {selectedOption && (
                      <div className="rounded-xl border border-border p-3 text-xs">
                        <p className="mb-1.5 font-semibold">Fare for {selectedOption.ambulance.vehicle_no}</p>
                        <div className="space-y-1 tabular-nums">
                          <p className="flex justify-between"><span className="text-muted">Base fare</span>{formatMoney(selectedOption.fare.base_fare)}</p>
                          <p className="flex justify-between"><span className="text-muted">{selectedOption.fare.distance_km} km × {formatMoney(selectedOption.fare.per_km_rate)}</span>{formatMoney(selectedOption.fare.distance_charge)}</p>
                          {selectedOption.fare.minimum_applied && <p className="flex justify-between"><span className="text-muted">Raised to minimum fare</span>{formatMoney(selectedOption.fare.minimum_fare)}</p>}
                          {selectedOption.fare.night && <p className="flex justify-between"><span className="text-muted">Night surcharge (20%)</span>{formatMoney(selectedOption.fare.night_surcharge)}</p>}
                          <p className="flex justify-between border-t border-border pt-1 text-sm font-bold"><span>Total</span>{formatMoney(selectedOption.fare.total)}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <Field label="Patient name">
                        <Input value={dispatch.patientName} onChange={(e) => setDispatch({ ...dispatch, patientName: e.target.value })} required />
                      </Field>
                      <Field label="Contact phone">
                        <Input value={dispatch.contactPhone} onChange={(e) => setDispatch({ ...dispatch, contactPhone: e.target.value })} type="tel" required />
                      </Field>
                    </div>
                    <Field label="Notes for the crew">
                      <Input value={dispatch.notes} onChange={(e) => setDispatch({ ...dispatch, notes: e.target.value })} placeholder="e.g. Needs oxygen, 3rd floor, no lift" />
                    </Field>
                  </>
                )}
              </div>

              {dispatch.step === "ambulance" && (
                <div className="border-t border-border p-4">
                  <Button type="submit" variant="danger" className="w-full" loading={dispatch.loading} disabled={!dispatch.ambulanceId}>
                    <Siren className="h-4 w-4" /> Dispatch {selectedOption ? `${selectedOption.ambulance.vehicle_no} · ${formatMoney(selectedOption.fare.total)}` : ""}
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <>
              <div className="border-b border-border p-4">
                <Tabs
                  value={tab}
                  onChange={setTab}
                  label="Panel"
                  options={[
                    { value: "trips", label: `Active (${trips.length})` },
                    { value: "fleet", label: `Fleet (${ambulances.length})` },
                    { value: "history", label: "History" },
                  ]}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === "trips" &&
                  (trips.length === 0 ? (
                    <p className="px-4 py-12 text-center text-sm text-muted">No active trips. Use “New dispatch” to send an ambulance.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {trips.map((t) => (
                        <li key={t.id} className="space-y-3 p-4">
                          <button type="button" onClick={() => focusOn(t.ambulance)} className="block w-full text-left">
                            <span className="flex items-center justify-between gap-2">
                              <Badge tone={TRIP_STATUS[t.status].tone}>{TRIP_STATUS[t.status].label}</Badge>
                              <span className="text-xs text-muted">#{t.id}</span>
                            </span>
                            <span className="mt-2 block text-sm font-bold">{t.ambulance_info.vehicle_no}</span>
                            <span className="block text-xs text-muted">
                              {ambulanceType(t.ambulance_info.type).short} · {t.ambulance_info.driver_name}
                              {t.ambulance_info.driver_phone && ` · ${t.ambulance_info.driver_phone}`}
                            </span>
                            <span className="mt-2 flex items-start gap-2 text-xs">
                              <span className="trip-dot trip-dot--pickup mt-0.5 !h-4 !w-4 shrink-0 !border text-[8px]">P</span>
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{t.patient_name} · {t.contact_phone}</span>
                                <span className="block truncate text-muted">{t.pickup_address || "Pickup point on map"}</span>
                              </span>
                            </span>
                            <span className="mt-1.5 flex items-start gap-2 text-xs">
                              <span className="trip-dot trip-dot--dest mt-0.5 !h-4 !w-4 shrink-0 !border text-[9px]">+</span>
                              <span className="truncate text-muted">{t.destination_address}</span>
                            </span>
                          </button>
                          <TripProgress status={t.status} />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">
                              {t.eta_minutes !== null ? `${t.remaining_km} km · ~${t.eta_minutes} min ${t.status === "dispatched" ? "to pickup" : "to hospital"}` : "No position"}
                            </span>
                            <span className="font-bold tabular-nums">{formatMoney(t.estimated_fare)}</span>
                          </div>
                          <div className="flex gap-2">
                            {t.status === "dispatched" ? (
                              <Button variant="secondary" className="flex-1 py-2 text-xs" loading={busyTrip === t.id} onClick={() => advance(t)}>
                                <CheckCircle2 className="h-4 w-4 text-primary" /> Patient picked up
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                className="flex-1 py-2 text-xs"
                                onClick={() => {
                                  setFinalFare(String(Number(t.estimated_fare)));
                                  setCompleting(t);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 text-success" /> Complete trip
                              </Button>
                            )}
                            <Button variant="ghost" className="px-3 py-2 text-xs hover:text-danger" onClick={() => setCancelling(t)}>
                              Cancel
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ))}

                {tab === "fleet" && (
                  <ul className="divide-y divide-border">
                    {ambulances.map((a) => {
                      const state = LIVE_STATE[liveState(a)];
                      return (
                        <li key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
                          <button type="button" onClick={() => focusOn(a.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: state.color }}>
                              <AmbulanceIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">{a.vehicle_no}</span>
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {a.driver_name} · {ambulanceType(a.type).short}
                              </span>
                              <span className="mt-0.5 flex items-center gap-3 text-[11px] text-muted">
                                <span className="font-semibold" style={{ color: state.color }}>{state.label}</span>
                                {a.speed_kmh !== null && a.speed_kmh > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Gauge className="h-3 w-3" /> {Math.round(a.speed_kmh)} km/h
                                  </span>
                                )}
                                <span>{lastSeen(a.last_seen_seconds)}</span>
                              </span>
                            </span>
                          </button>
                          {a.driver_phone && (
                            <a href={`tel:${a.driver_phone.replace(/\s/g, "")}`} className="rounded-lg p-2 text-muted hover:bg-background hover:text-primary" title={`Call ${a.driver_name}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => editAmbulance(a.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {tab === "history" &&
                  (!history ? (
                    <div className="flex justify-center py-10">
                      <Spinner />
                    </div>
                  ) : history.length === 0 ? (
                    <p className="px-4 py-12 text-center text-sm text-muted">No finished trips yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {history.map((t) => (
                        <li key={t.id} className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{t.patient_name}</span>
                            <span className="shrink-0 font-bold tabular-nums">{t.status === "completed" ? formatMoney(t.final_fare ?? t.estimated_fare) : "—"}</span>
                          </div>
                          <p className="truncate text-xs text-muted">
                            {t.pickup_address || "Pickup"} → {t.destination_address}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted">
                            <span>
                              {t.ambulance_info.vehicle_no} · {t.distance_km} km · {formatDate(t.created_at)}
                            </span>
                            <Badge tone={TRIP_STATUS[t.status].tone}>{TRIP_STATUS[t.status].label}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ))}
              </div>
            </>
          )}
        </Card>
      </div>

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

      {completing && (
        <Modal open title="Complete trip" onClose={() => setCompleting(null)} width="max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              advance(completing, finalFare);
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted">
              {completing.patient_name} reached {completing.destination_address}. {completing.ambulance_info.vehicle_no} becomes available again.
            </p>
            <Field label="Final fare (৳)">
              <Input type="number" min={0} step="1" value={finalFare} onChange={(e) => setFinalFare(e.target.value)} required />
            </Field>
            <p className="-mt-2 text-xs text-muted">Quoted {formatMoney(completing.estimated_fare)}. Change it if tolls or waiting time were added.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setCompleting(null)}>
                Back
              </Button>
              <Button type="submit" loading={busyTrip === completing.id}>
                Complete trip
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel trip"
        message={
          <>
            Cancel the trip for <strong>{cancelling?.patient_name}</strong>? {cancelling?.ambulance_info.vehicle_no} becomes available again.
          </>
        }
        confirmLabel="Cancel trip"
        loading={busyTrip === cancelling?.id}
        onConfirm={cancelTrip}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}
