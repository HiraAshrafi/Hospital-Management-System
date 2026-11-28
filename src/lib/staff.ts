import type { BadgeTone } from "@/components/ui";
import type { EmploymentType } from "@/lib/types";

export const ROLE_TONE: Record<string, BadgeTone> = {
  super_admin: "violet",
  hospital_admin: "primary",
  doctor: "info",
  nurse: "success",
  receptionist: "warning",
  pharmacist: "violet",
  lab_technician: "info",
  accountant: "neutral",
  hr_manager: "primary",
};

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};
