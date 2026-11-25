import type { HospitalRequestType, HospitalType, OtherPlatform, RequestStatus } from "@/lib/types";

export const HOSPITAL_TYPES: { value: HospitalType; label: string }[] = [
  { value: "general", label: "General hospital" },
  { value: "specialty", label: "Specialty hospital" },
  { value: "teaching", label: "Teaching hospital" },
  { value: "children", label: "Children's hospital" },
  { value: "maternity", label: "Maternity hospital" },
  { value: "psychiatric", label: "Psychiatric hospital" },
  { value: "clinic", label: "Clinic / urgent care" },
  { value: "other", label: "Other" },
];

export function hospitalTypeLabel(value: HospitalType): string {
  return HOSPITAL_TYPES.find((type) => type.value === value)?.label ?? "Hospital";
}

export const OTHER_PLATFORMS: { value: Exclude<OtherPlatform, "">; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Other" },
];

export function otherPlatformLabel(value: OtherPlatform): string {
  return OTHER_PLATFORMS.find((platform) => platform.value === value)?.label ?? "Other";
}

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: "accent" | "success" | "danger" }> = {
  pending: { label: "Pending", tone: "accent" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const REQUEST_TYPE_LABEL: Record<HospitalRequestType, string> = {
  manager: "Manager request",
  new_hospital: "New hospital",
};

export function withScheme(url: string): string {
  const value = url.trim();
  if (!value) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}
