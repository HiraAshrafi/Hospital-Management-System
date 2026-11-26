import { Badge } from "@/components/ui";
import { APPOINTMENT_STATUS, appointmentType } from "@/lib/hms";
import type { AppointmentStatus, AppointmentType } from "@/lib/types";

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, tone } = APPOINTMENT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function AppointmentTypeBadge({ type }: { type: AppointmentType }) {
  const { label, tone } = appointmentType(type);
  return <Badge tone={tone}>{label}</Badge>;
}

export function BloodBadge({ group }: { group: string }) {
  if (!group) return <span className="text-muted">—</span>;
  return <Badge tone="danger">{group}</Badge>;
}
