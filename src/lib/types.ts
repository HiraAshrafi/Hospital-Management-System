export type Gender = "male" | "female" | "other" | "";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  gender: Gender;
  country: string;
  avatar: string | null;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
  updated_at: string;
}

export interface Profile {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  gender: Gender;
  country: string;
  avatar: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  blocked_users: number;
  new_users_this_month: number;
  signups_by_month: { month: string; label: string; count: number }[];
  recent_users: User[];
  total_hospitals: number;
  managed_hospitals: number;
  unmanaged_hospitals: number;
  inactive_hospitals: number;
  pending_requests: number;
  recent_requests: HospitalRequest[];
}

export interface UserMini {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  avatar: string | null;
}

export type OtherPlatform = "youtube" | "tiktok" | "linkedin" | "whatsapp" | "telegram" | "other" | "";

export type HospitalType = "general" | "specialty" | "teaching" | "children" | "maternity" | "psychiatric" | "clinic" | "other";

export interface Hospital {
  id: number;
  name: string;
  hospital_type: HospitalType;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  country: string;
  address: string;
  website: string;
  facebook: string;
  twitter: string;
  instagram: string;
  other_platform: OtherPlatform;
  other_link: string;
  services: string[];
  specialties: string[];
  emergency_available: boolean;
  bed_capacity: number | null;
  operating_hours: string;
  is_active: boolean;
  manager: UserMini | null;
  manager_assigned_at: string | null;
  pending_requests: number;
  created_by: UserMini | null;
  created_at: string;
  updated_at: string;
}

export type RequestStatus = "pending" | "approved" | "rejected";
export type HospitalRequestType = "manager" | "new_hospital";

export interface HospitalRequest {
  id: number;
  hospital: { id: number; name: string; address: string; city: string; country: string; is_active: boolean; manager: number | null };
  user: UserMini | null;
  type: HospitalRequestType;
  first_name: string;
  last_name: string;
  claimant_name: string;
  status: RequestStatus;
  admin_note: string;
  reviewed_by: UserMini | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: Profile;
}
