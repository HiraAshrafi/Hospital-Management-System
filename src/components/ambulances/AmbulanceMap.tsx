"use client";

import "leaflet/dist/leaflet.css";

import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";

import { ambulanceType, LIVE_STATE, lastSeen, liveState, TRIP_STATUS } from "@/lib/ambulances";
import { CURRENCY, DHAKA } from "@/lib/hms";
import type { LatLng, LiveAmbulance, LiveTrip } from "@/lib/types";

export type AmbulanceFocus = { id: number; n: number } | null;
export type DispatchDraft = { pickup?: LatLng; destination?: LatLng } | null;

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const AMBULANCE_SVG =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M8 8v4"/><path d="M9 18h6"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

const POPUP: Leaflet.PopupOptions = { className: "hms-popup-wrap", maxWidth: 300, autoPanPaddingTopLeft: [56, 64], autoPanPaddingBottomRight: [16, 16] };

function row(label: string, value: string) {
  return value ? `<div class="hms-popup__row"><span>${label}</span><strong>${value}</strong></div>` : "";
}

function ambulancePopup(a: LiveAmbulance, trip: LiveTrip | undefined) {
  const state = LIVE_STATE[liveState(a)];
  const phone = a.driver_phone ? `<a href="tel:${esc(a.driver_phone.replace(/\s/g, ""))}">${esc(a.driver_phone)}</a>` : "";
  return `<div class="hms-popup">
    <div class="hms-popup__tags"><span class="hms-popup__tag" style="background:${state.color}1f;color:${state.color}">${state.label}</span><span class="hms-popup__tag">${esc(ambulanceType(a.type).short)}</span></div>
    <p class="hms-popup__title">${esc(a.vehicle_no)}</p>
    <p class="hms-popup__sub">Driver: ${esc(a.driver_name)}</p>
    ${row("Phone", phone)}
    ${row("Speed", a.speed_kmh !== null ? `${Math.round(a.speed_kmh)} km/h` : "")}
    ${row("Last update", esc(lastSeen(a.last_seen_seconds)))}
    ${row("Base", esc(a.base_hospital_name))}
    ${row("Rate", `${CURRENCY}${a.base_fare} + ${CURRENCY}${a.per_km_rate}/km (min ${CURRENCY}${a.min_fare})`)}
    ${trip ? row("Trip", `${esc(TRIP_STATUS[trip.status].label)} · ${esc(trip.patient_name)}`) : ""}
    ${trip && trip.eta_minutes !== null ? row(trip.status === "dispatched" ? "To pickup" : "To hospital", `${trip.remaining_km} km · ~${trip.eta_minutes} min`) : ""}
    <button type="button" class="hms-popup__btn" data-action="edit-ambulance" data-id="${a.id}">Edit ambulance</button>
  </div>`;
}

type TripLayers = { pickup: Leaflet.Marker; dest: Leaflet.Marker; ahead: Leaflet.Polyline; route: Leaflet.Polyline; trail: Leaflet.Polyline };

export function AmbulanceMap({
  ambulances,
  trips,
  draft,
  picking,
  focus,
  onPick,
  onEditAmbulance,
}: {
  ambulances: LiveAmbulance[];
  trips: LiveTrip[];
  draft: DispatchDraft;
  picking: "pickup" | "destination" | null;
  focus: AmbulanceFocus;
  onPick: (at: LatLng) => void;
  onEditAmbulance: (id: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markers = useRef(new Map<number, { marker: Leaflet.Marker; key: string }>());
  const tripLayers = useRef(new Map<number, TripLayers>());
  const tripGroup = useRef<Leaflet.LayerGroup | null>(null);
  const draftGroup = useRef<Leaflet.LayerGroup | null>(null);
  const callbacks = useRef({ onPick, onEditAmbulance, picking });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacks.current = { onPick, onEditAmbulance, picking };
  });

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let observer: ResizeObserver | null = null;
    const container = containerRef.current;
    const markerStore = markers.current;
    const tripStore = tripLayers.current;
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (btn?.dataset.action === "edit-ambulance") {
        e.preventDefault();
        callbacks.current.onEditAmbulance(Number(btn.dataset.id));
        mapRef.current?.closePopup();
      }
    };
    container?.addEventListener("click", onClick, true);

    import("leaflet").then((mod) => {
      if (cancelled || !container) return;
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      LRef.current = L;
      map = L.map(container).setView([DHAKA.lat, DHAKA.lng], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      tripGroup.current = L.layerGroup().addTo(map);
      draftGroup.current = L.layerGroup().addTo(map);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (callbacks.current.picking) callbacks.current.onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(container);
      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      container?.removeEventListener("click", onClick, true);
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerStore.clear();
      tripStore.clear();
    };
  }, []);

  // Ambulance markers: created once, then moved (CSS eases the movement between updates).
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const tripsById = new Map(trips.map((t) => [t.id, t]));
    const seen = new Set<number>();
    for (const a of ambulances) {
      if (a.latitude === null || a.longitude === null) continue;
      seen.add(a.id);
      const state = liveState(a);
      const key = `${state}`;
      const html = `<div class="amb-pin${state === "on_trip" ? " amb-pin--pulse" : ""}${state === "no_signal" || state === "off_duty" ? " amb-pin--dim" : ""}" style="background:${LIVE_STATE[state].color}">${AMBULANCE_SVG}</div>`;
      const icon = L.divIcon({ className: "hms-marker amb-marker", html, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16] });
      const content = ambulancePopup(a, a.active_trip_id ? tripsById.get(a.active_trip_id) : undefined);
      const existing = markers.current.get(a.id);
      if (existing) {
        existing.marker.setLatLng([a.latitude, a.longitude]);
        if (existing.key !== key) {
          existing.marker.setIcon(icon);
          existing.key = key;
        }
        existing.marker.setPopupContent(content);
      } else {
        const marker = L.marker([a.latitude, a.longitude], { icon, title: `${a.vehicle_no} · ${a.driver_name}`, zIndexOffset: state === "on_trip" ? 500 : 0 })
          .bindPopup(content, POPUP)
          .addTo(map);
        markers.current.set(a.id, { marker, key });
      }
    }
    for (const [id, { marker }] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [ready, ambulances, trips]);

  // Active trips: pickup + hospital markers, the leg still ahead, and the route driven so far.
  useEffect(() => {
    const L = LRef.current;
    const group = tripGroup.current;
    if (!ready || !L || !group) return;
    const byAmbulance = new Map(ambulances.map((a) => [a.id, a]));
    const seen = new Set<number>();
    for (const t of trips) {
      seen.add(t.id);
      const amb = byAmbulance.get(t.ambulance);
      const pickup: [number, number] = [Number(t.pickup_lat), Number(t.pickup_lng)];
      const dest: [number, number] = [Number(t.destination_lat), Number(t.destination_lng)];
      const here: [number, number] | null = amb && amb.latitude !== null && amb.longitude !== null ? [amb.latitude, amb.longitude] : null;
      const toPickup = t.status === "dispatched";
      const ahead = here ? (toPickup ? [here, pickup] : [here, dest]) : [];
      const route = toPickup ? [pickup, dest] : [];
      let layers = tripLayers.current.get(t.id);
      if (!layers) {
        const small = (cls: string, label: string) => L.divIcon({ className: "hms-marker", html: `<div class="trip-dot ${cls}">${label}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
        layers = {
          pickup: L.marker(pickup, { icon: small("trip-dot--pickup", "P"), keyboard: false }).bindTooltip(`Pickup: ${t.pickup_address || "patient"} (${t.patient_name})`).addTo(group),
          dest: L.marker(dest, { icon: small("trip-dot--dest", "+"), keyboard: false }).bindTooltip(`Destination: ${t.destination_address}`).addTo(group),
          ahead: L.polyline([], { color: "#d97706", weight: 3, dashArray: "6 8" }).addTo(group),
          route: L.polyline([], { color: "#64748b", weight: 2, dashArray: "2 6", opacity: 0.8 }).addTo(group),
          trail: L.polyline([], { color: "#1f6fd6", weight: 4, opacity: 0.55 }).addTo(group),
        };
        tripLayers.current.set(t.id, layers);
      }
      layers.ahead.setLatLngs(ahead).setStyle({ color: toPickup ? "#d97706" : "#1f6fd6" });
      layers.route.setLatLngs(route);
      layers.trail.setLatLngs(amb?.trail ?? []);
    }
    for (const [id, layers] of tripLayers.current) {
      if (!seen.has(id)) {
        Object.values(layers).forEach((layer) => group.removeLayer(layer));
        tripLayers.current.delete(id);
      }
    }
  }, [ready, trips, ambulances]);

  // Dispatch draft (pickup / destination being chosen) and the crosshair cursor while picking.
  useEffect(() => {
    const L = LRef.current;
    const group = draftGroup.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    const dot = (cls: string, label: string) => L.divIcon({ className: "hms-marker", html: `<div class="trip-dot trip-dot--lg ${cls}">${label}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    if (draft?.pickup) L.marker([draft.pickup.lat, draft.pickup.lng], { icon: dot("trip-dot--pickup", "P"), interactive: false }).addTo(group);
    if (draft?.destination) L.marker([draft.destination.lat, draft.destination.lng], { icon: dot("trip-dot--dest", "+"), interactive: false }).addTo(group);
    if (draft?.pickup && draft.destination)
      L.polyline([[draft.pickup.lat, draft.pickup.lng], [draft.destination.lat, draft.destination.lng]], { color: "#e5484d", weight: 3, dashArray: "8 6" }).addTo(group);
    if (draft?.pickup && !draft.destination) mapRef.current?.panTo([draft.pickup.lat, draft.pickup.lng]);
  }, [ready, draft]);

  useEffect(() => {
    containerRef.current?.classList.toggle("amb-picking", picking !== null);
  }, [picking]);

  // Fly to an ambulance picked from the list.
  const handled = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus || focus.n === handled.current) return;
    const entry = markers.current.get(focus.id);
    if (!entry) return;
    handled.current = focus.n;
    map.once("moveend", () => entry.marker.openPopup());
    map.flyTo(entry.marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [ready, focus, ambulances]);

  return <div ref={containerRef} className="amb-live relative z-0 h-full w-full" aria-label="Live map of ambulances around Dhaka" />;
}
