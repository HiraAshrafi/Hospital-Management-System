import type { BadgeTone } from "@/components/ui";
import type { AmbulanceStatus, AmbulanceType, TripStatus } from "@/lib/types";

export const AMBULANCE_TYPES: { value: AmbulanceType; label: string; short: string }[] = [
  { value: "basic", label: "Basic (BLS)", short: "Basic" },
  { value: "als", label: "Advanced (ALS, oxygen)", short: "ALS · Oxygen" },
  { value: "icu", label: "ICU ambulance", short: "ICU" },
  { value: "freezer", label: "Freezer van", short: "Freezer" },
];

export function ambulanceType(value: AmbulanceType) {
  return AMBULANCE_TYPES.find((t) => t.value === value) ?? AMBULANCE_TYPES[0];
}

/** Suggested rates shown as hints; the backend (ambulances/pricing.py) applies them when left empty. */
export const SUGGESTED_RATES: Record<AmbulanceType, { base: number; perKm: number; min: number }> = {
  basic: { base: 500, perKm: 40, min: 800 },
  als: { base: 1000, perKm: 60, min: 1500 },
  icu: { base: 3000, perKm: 120, min: 5000 },
  freezer: { base: 1500, perKm: 50, min: 2000 },
};

export const AMBULANCE_STATUS: Record<AmbulanceStatus, { label: string; tone: BadgeTone }> = {
  available: { label: "Available", tone: "success" },
  on_trip: { label: "On trip", tone: "warning" },
  offline: { label: "Off duty", tone: "neutral" },
  maintenance: { label: "Maintenance", tone: "neutral" },
};

export const TRIP_STATUS: Record<TripStatus, { label: string; tone: BadgeTone }> = {
  dispatched: { label: "Heading to pickup", tone: "warning" },
  picked_up: { label: "Patient on board", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

/** What the live map shows for an ambulance, combining its status and its GPS signal. */
export function liveState(a: { status: AmbulanceStatus; is_online: boolean }): "available" | "on_trip" | "no_signal" | "off_duty" {
  if (a.status === "offline" || a.status === "maintenance") return "off_duty";
  if (!a.is_online) return "no_signal";
  return a.status === "on_trip" ? "on_trip" : "available";
}

export const LIVE_STATE: Record<ReturnType<typeof liveState>, { label: string; color: string; tone: BadgeTone }> = {
  available: { label: "Available", color: "#15803d", tone: "success" },
  on_trip: { label: "On trip", color: "#d97706", tone: "warning" },
  no_signal: { label: "No signal", color: "#94a3b8", tone: "danger" },
  off_duty: { label: "Off duty", color: "#94a3b8", tone: "neutral" },
};

export function lastSeen(seconds: number | null): string {
  if (seconds === null) return "never";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}
