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

/** "Sat–Mon 9:00 AM – 12:00 PM · Wed 4:00 PM – 9:00 PM" from a weekly schedule (days with the same hours grouped). */
export function scheduleLabel(rows: { weekday: Weekday; start_time: string; end_time: string; is_active?: boolean }[]): string {
  const active = rows.filter((r) => r.is_active !== false);
  if (!active.length) return "No weekly schedule";
  const groups = new Map<string, Weekday[]>();
  for (const r of active) {
    const key = `${formatTime(r.start_time)} – ${formatTime(r.end_time)}`;
    groups.set(key, [...(groups.get(key) ?? []), r.weekday]);
  }
  return [...groups.entries()].map(([hours, days]) => `${daysLabel(days)} ${hours}`).join(" · ");
}

export const ALLERGY_SEVERITY: Record<string, { label: string; tone: BadgeTone }> = {
  mild: { label: "Mild", tone: "neutral" },
  moderate: { label: "Moderate", tone: "warning" },
  severe: { label: "Severe", tone: "danger" },
  life_threatening: { label: "Life-threatening", tone: "danger" },
};

export const CONDITION_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "danger" },
  chronic: { label: "Chronic", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
};

export const HISTORY_CATEGORIES = [
  { value: "past_illness", label: "Past illness" },
  { value: "surgery", label: "Surgery / procedure" },
  { value: "hospitalization", label: "Hospitalization" },
  { value: "family", label: "Family history" },
  { value: "social", label: "Social / lifestyle" },
  { value: "immunization", label: "Immunization" },
  { value: "medication", label: "Long-term medication" },
  { value: "other", label: "Other" },
];

export const DOCUMENT_CATEGORIES = [
  { value: "report", label: "Medical report" },
  { value: "prescription", label: "Prescription" },
  { value: "imaging", label: "Imaging (X-ray, scan)" },
  { value: "discharge", label: "Discharge summary" },
  { value: "id", label: "ID document" },
  { value: "insurance", label: "Insurance" },
  { value: "consent", label: "Consent form" },
  { value: "other", label: "Other" },
];

export const PATIENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
  admitted: { label: "Admitted", tone: "violet" },
  archived: { label: "Archived", tone: "danger" },
};

export const BED_STATUS: Record<string, { label: string; tone: BadgeTone; tile: string }> = {
  available: { label: "Available", tone: "success", tile: "border-success/40 bg-success-soft text-success" },
  occupied: { label: "Occupied", tone: "primary", tile: "border-primary/40 bg-primary-soft text-primary" },
  reserved: { label: "Reserved", tone: "violet", tile: "border-violet/40 bg-violet-soft text-violet" },
  cleaning: { label: "Cleaning", tone: "warning", tile: "border-warning/40 bg-warning-soft text-warning" },
  maintenance: { label: "Out of service", tone: "neutral", tile: "border-border bg-surface-muted text-muted" },
};

export const ADMISSION_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  admitted: { label: "Admitted", tone: "primary" },
  discharged: { label: "Discharged", tone: "success" },
  deceased: { label: "Deceased", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const ADMISSION_TYPES = [
  { value: "planned", label: "Planned" },
  { value: "emergency", label: "Emergency" },
  { value: "transfer_in", label: "Transfer from another hospital" },
  { value: "day_care", label: "Day care" },
  { value: "maternity", label: "Maternity" },
];

export const DISCHARGE_TYPES = [
  { value: "recovered", label: "Recovered" },
  { value: "improved", label: "Improved" },
  { value: "referred", label: "Referred to another hospital" },
  { value: "lama", label: "Left against medical advice" },
  { value: "absconded", label: "Absconded" },
  { value: "deceased", label: "Deceased" },
];

export const WARD_TYPES = [
  { value: "general", label: "General ward" },
  { value: "semi_private", label: "Semi-private" },
  { value: "private", label: "Private cabin" },
  { value: "icu", label: "ICU" },
  { value: "ccu", label: "CCU (cardiac)" },
  { value: "hdu", label: "HDU (high dependency)" },
  { value: "nicu", label: "NICU (newborn)" },
  { value: "picu", label: "PICU (children)" },
  { value: "maternity", label: "Maternity" },
  { value: "emergency", label: "Emergency / observation" },
  { value: "isolation", label: "Isolation" },
];

export const BED_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "icu", label: "ICU bed" },
  { value: "ventilator", label: "Ventilator" },
  { value: "oxygen", label: "With oxygen" },
  { value: "pediatric", label: "Pediatric / cot" },
  { value: "maternity", label: "Maternity" },
  { value: "isolation", label: "Isolation" },
];

/** "2026-11-27T10:30:00+06:00" → "27 Nov 2026, 10:30" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const INVOICE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  issued: { label: "Unpaid", tone: "warning" },
  partially_paid: { label: "Partly paid", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  refunded: { label: "Refunded", tone: "violet" },
};

export const PAYMENT_METHODS: { value: string; label: string; hint: string; needsRef: boolean; color: string }[] = [
  { value: "cash", label: "Cash", hint: "", needsRef: false, color: "bg-accent-soft text-accent" },
  { value: "card", label: "Card (POS)", hint: "Last 4 digits or POS slip no. — never the full card number", needsRef: false, color: "bg-primary-soft text-primary" },
  { value: "bkash", label: "bKash", hint: "bKash transaction ID, e.g. 9GH4K2L1PQ", needsRef: true, color: "bg-[#fde7f1] text-[#c2185b]" },
  { value: "nagad", label: "Nagad", hint: "Nagad transaction ID", needsRef: true, color: "bg-[#fff1e6] text-[#c2410c]" },
  { value: "bank_transfer", label: "Bank transfer", hint: "Bank reference or cheque number", needsRef: true, color: "bg-violet-soft text-violet" },
];

export const SERVICE_CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "admission", label: "Admission / bed" },
  { value: "procedure", label: "Procedure" },
  { value: "laboratory", label: "Laboratory" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "imaging", label: "Imaging" },
  { value: "ambulance", label: "Ambulance" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

/** Money with two decimals, for invoices. */
export function formatMoney2(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return `${CURRENCY}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
