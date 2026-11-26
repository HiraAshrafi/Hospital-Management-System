"use client";

import "leaflet/dist/leaflet.css";

import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";

import { CURRENCY, DHAKA, daysLabel, distanceKm, formatShift } from "@/lib/hms";
import { hospitalTypeLabel } from "@/lib/hospitals";
import type { LatLng, MapDoctor, MapHospital } from "@/lib/types";

export type MapAction =
  | { type: "add-hospital" | "add-doctor"; at: LatLng }
  | { type: "edit-hospital" | "edit-doctor"; id: number };

export type MapFocus = { kind: "hospital" | "doctor"; id: number; n: number } | null;

// Keep opened popups clear of the zoom buttons (top-left) and the hint chip (top-right).
const POPUP_OPTIONS: Leaflet.PopupOptions = {
  className: "hms-popup-wrap",
  maxWidth: 300,
  autoPanPaddingTopLeft: [56, 64],
  autoPanPaddingBottomRight: [16, 16],
};

/** Everything shown in popups comes from the database, so it is escaped before going into HTML. */
const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const SVG = {
  hospital: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  doctor:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>',
};

function row(label: string, value: string) {
  return value ? `<div class="hms-popup__row"><span>${label}</span><strong>${value}</strong></div>` : "";
}

function hospitalPopup(h: MapHospital) {
  const phone = h.phone ? `<a href="tel:${esc(h.phone.replace(/\s/g, ""))}">${esc(h.phone)}</a>` : "";
  return `<div class="hms-popup">
    <div class="hms-popup__tags"><span class="hms-popup__tag hms-popup__tag--hospital">Hospital</span><span class="hms-popup__tag">${esc(hospitalTypeLabel(h.hospital_type))}</span>${h.is_active ? "" : '<span class="hms-popup__tag">Inactive</span>'}</div>
    <p class="hms-popup__title">${esc(h.name)}</p>
    <p class="hms-popup__sub">${esc(h.address || "No address")}</p>
    ${row("Phone", phone)}
    ${row("Emergency", h.emergency_available ? "Available" : "Not available")}
    ${row("Beds", h.bed_capacity ? esc(h.bed_capacity) : "")}
    ${row("Hours", esc(h.operating_hours))}
    ${row("Specialties", esc(h.specialties.slice(0, 3).join(", ")))}
    ${row("Distance", `${h.distance_km} km from Dhaka centre`)}
    <button type="button" class="hms-popup__btn" data-action="edit-hospital" data-id="${h.id}">Edit hospital</button>
  </div>`;
}

function doctorPopup(d: MapDoctor) {
  const phone = d.phone ? `<a href="tel:${esc(d.phone.replace(/\s/g, ""))}">${esc(d.phone)}</a>` : "";
  return `<div class="hms-popup">
    <div class="hms-popup__tags"><span class="hms-popup__tag hms-popup__tag--doctor">Doctor</span>${d.designation ? `<span class="hms-popup__tag">${esc(d.designation)}</span>` : ""}${d.is_active ? "" : '<span class="hms-popup__tag">Unavailable</span>'}</div>
    <p class="hms-popup__title">Dr. ${esc(d.full_name)}</p>
    <p class="hms-popup__sub">${esc([d.specialization, d.department_name].filter(Boolean).join(" · ") || "General practice")}</p>
    ${row("Phone", phone)}
    ${row("Chamber", esc(d.chamber))}
    ${row("Hours", esc(formatShift(d.shift_start, d.shift_end)))}
    ${row("Days", esc(daysLabel(d.available_days)))}
    ${row("Fee", `${CURRENCY}${esc(Number(d.consultation_fee).toLocaleString("en-US"))}`)}
    ${row("Degree", esc(d.qualification))}
    ${row("Distance", `${d.distance_km} km from Dhaka centre`)}
    <button type="button" class="hms-popup__btn" data-action="edit-doctor" data-id="${d.id}">Edit doctor</button>
  </div>`;
}

function addPopup(at: LatLng) {
  const coords = `data-lat="${at.lat}" data-lng="${at.lng}"`;
  return `<div class="hms-popup">
    <p class="hms-popup__title">Add at this spot?</p>
    <p class="hms-popup__sub">${at.lat.toFixed(5)}, ${at.lng.toFixed(5)} · ${distanceKm(at, DHAKA).toFixed(1)} km from Dhaka centre</p>
    <div class="hms-popup__actions">
      <button type="button" class="hms-popup__btn hms-popup__btn--hospital" data-action="add-hospital" ${coords}>+ Hospital</button>
      <button type="button" class="hms-popup__btn" data-action="add-doctor" ${coords}>+ Doctor</button>
    </div>
  </div>`;
}

export function MapView({
  radiusKm,
  hospitals,
  doctors,
  showHospitals,
  showDoctors,
  focus,
  onAction,
}: {
  radiusKm: number;
  hospitals: MapHospital[];
  doctors: MapDoctor[];
  showHospitals: boolean;
  showDoctors: boolean;
  focus: MapFocus;
  onAction: (action: MapAction) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const markersRef = useRef<{ hospital: Map<number, Leaflet.Marker>; doctor: Map<number, Leaflet.Marker> }>({ hospital: new Map(), doctor: new Map() });
  const onActionRef = useRef(onAction);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onActionRef.current = onAction;
  });

  // Create the map once. Leaflet touches `window`, so it is loaded in the browser only.
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let observer: ResizeObserver | null = null;
    const container = containerRef.current;

    // Buttons inside popups are plain HTML; route their clicks back to React (capture phase,
    // so Leaflet's own click handling can't swallow them).
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!btn) return;
      e.preventDefault();
      const { action, id, lat, lng } = btn.dataset;
      if (action === "add-hospital" || action === "add-doctor") onActionRef.current({ type: action, at: { lat: Number(lat), lng: Number(lng) } });
      if (action === "edit-hospital" || action === "edit-doctor") onActionRef.current({ type: action, id: Number(id) });
      mapRef.current?.closePopup();
    };
    container?.addEventListener("click", onClick, true);

    import("leaflet").then((mod) => {
      if (cancelled || !container) return;
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      LRef.current = L;
      map = L.map(container, { zoomControl: true, attributionControl: true }).setView([DHAKA.lat, DHAKA.lng], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker([DHAKA.lat, DHAKA.lng], {
        icon: L.divIcon({ className: "hms-marker", html: '<div class="hms-center"><span></span>Dhaka</div>', iconSize: [70, 24], iconAnchor: [9, 12] }),
        interactive: false,
        keyboard: false,
      }).addTo(map);
      circleRef.current = L.circle([DHAKA.lat, DHAKA.lng], {
        radius: 1000,
        color: "#1f6fd6",
        weight: 1.5,
        dashArray: "6 6",
        fillColor: "#1f6fd6",
        fillOpacity: 0.04,
        interactive: false,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);

      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        L.popup({ ...POPUP_OPTIONS, maxWidth: 280 }).setLatLng(e.latlng).setContent(addPopup({ lat: e.latlng.lat, lng: e.latlng.lng })).openOn(e.target);
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
    };
  }, []);

  // Radius ring; zoom so the whole ring fits.
  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!ready || !map || !circle) return;
    circle.setRadius(radiusKm * 1000);
    map.fitBounds(circle.getBounds(), { padding: [12, 12] });
  }, [ready, radiusKm]);

  // Markers.
  useEffect(() => {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    markersRef.current = { hospital: new Map(), doctor: new Map() };

    const icon = (kind: "hospital" | "doctor", active: boolean) =>
      L.divIcon({
        className: "hms-marker",
        html: `<div class="hms-pin hms-pin--${kind}${active ? "" : " hms-pin--inactive"}"><span>${SVG[kind]}</span></div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 39],
        popupAnchor: [0, -34],
      });

    if (showHospitals) {
      for (const h of hospitals) {
        const m = L.marker([h.latitude, h.longitude], { icon: icon("hospital", h.is_active), title: h.name, riseOnHover: true })
          .bindPopup(hospitalPopup(h), POPUP_OPTIONS)
          .addTo(layer);
        markersRef.current.hospital.set(h.id, m);
      }
    }
    if (showDoctors) {
      for (const d of doctors) {
        const m = L.marker([d.latitude, d.longitude], { icon: icon("doctor", d.is_active), title: `Dr. ${d.full_name}`, riseOnHover: true })
          .bindPopup(doctorPopup(d), POPUP_OPTIONS)
          .addTo(layer);
        markersRef.current.doctor.set(d.id, m);
      }
    }
  }, [ready, hospitals, doctors, showHospitals, showDoctors]);

  // Fly to a marker picked from the list. Each request runs once; if its marker isn't loaded
  // yet (e.g. a record just saved), it is retried when the markers change.
  const handledFocus = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus || focus.n === handledFocus.current) return;
    const marker = markersRef.current[focus.kind].get(focus.id);
    if (!marker) return;
    handledFocus.current = focus.n;
    // Open the popup after the flight so auto-pan can make room for it above the marker.
    map.once("moveend", () => marker.openPopup());
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [ready, focus, hospitals, doctors, showHospitals, showDoctors]);

  return <div ref={containerRef} className="relative z-0 h-full w-full" aria-label="Map of hospitals and doctors around Dhaka" />;
}
