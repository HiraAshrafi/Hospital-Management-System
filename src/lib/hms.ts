import type { BadgeTone } from "@/components/ui";
import type { AppointmentStatus, AppointmentType, BloodGroup, Gender, Weekday } from "@/lib/types";

/** Currency shown next to fees and revenue. Change here to switch currency. */
export const CURRENCY = "৳";

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
];

export const BLOOD_GROUPS: Exclude<BloodGroup, "">[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const GENDER_LABEL: Record<Gender, string> = { male: "Male", female: "Female", other: "Other", "": "—" };

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  scheduled: { label: "Scheduled", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "warning" },
};

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string; tone: BadgeTone }[] = [
  { value: "consultation", label: "Consultation", tone: "info" },
  { value: "follow_up", label: "Follow-up", tone: "violet" },
  { value: "checkup", label: "Check-up", tone: "neutral" },
  { value: "emergency", label: "Emergency", tone: "danger" },
];

export function appointmentType(value: AppointmentType) {
  return APPOINTMENT_TYPES.find((t) => t.value === value) ?? APPOINTMENT_TYPES[0];
}

/** "14:30:00" → "2:30 PM" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatShift(start: string | null, end: string | null): string {
  return start && end ? `${formatTime(start)} – ${formatTime(end)}` : "No fixed hours";
}

export function formatMoney(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return `${CURRENCY}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** "2026-11-26" (a calendar date, no time zone) → "26 Nov 2026" */
export function formatDay(value: string | null, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", opts);
}

export function daysLabel(days: Weekday[]): string {
  if (days.length === 0 || days.length === 7) return "Every day";
  return WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join(", ");
}

/** Percent change vs a previous value; null when there is nothing to compare against. */
export function trend(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function doctorName(name: string): string {
  return `Dr. ${name}`;
}

export const DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Senior Consultant",
  "Consultant",
  "Junior Consultant",
  "Medical Officer",
  "Resident",
];

/** Centre of Dhaka; the map opens here. */
export const DHAKA = { lat: 23.8103, lng: 90.4125 };

/** Great-circle distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
