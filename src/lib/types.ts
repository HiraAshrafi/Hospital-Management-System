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

export type Weekday = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type AppointmentType = "consultation" | "follow_up" | "checkup" | "emergency";

export interface DoctorMini {
  id: number;
  full_name: string;
  specialization: string;
  department: number | null;
  department_name: string;
  gender: Gender;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  location: string;
  phone: string;
  head: number | null;
  head_info: DoctorMini | null;
  is_active: boolean;
  doctor_count: number;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: Gender;
  email: string;
  phone: string;
  department: number | null;
  department_name: string;
  designation: string;
  specialization: string;
  qualification: string;
  registration_no: string;
  chamber: string;
  latitude: string | null;
  longitude: string | null;
  experience_years: number;
  consultation_fee: string;
  available_days: Weekday[];
  shift_start: string | null;
  shift_end: string | null;
  bio: string;
  is_active: boolean;
  joined_on: string | null;
  upcoming_appointments: number;
  created_at: string;
  updated_at: string;
}

export interface PatientMini {
  id: number;
  mrn: string;
  full_name: string;
  gender: Gender;
  age: number | null;
  phone: string;
  blood_group: BloodGroup;
}

export interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string | null;
  age: number | null;
  blood_group: BloodGroup;
  phone: string;
  email: string;
  address: string;
  city: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  allergies: string;
  medical_notes: string;
  is_active: boolean;
  appointment_count: number;
  last_visit: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  patient: number;
  patient_info: PatientMini;
  doctor: number;
  doctor_info: DoctorMini;
  date: string;
  time: string;
  type: AppointmentType;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  fee: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  today: string;
  total_patients: number;
  new_patients_this_month: number;
  new_patients_prev_period: number;
  total_doctors: number;
  doctors_on_duty: number;
  total_departments: number;
  appointments_today: { total: number; completed: number; waiting: number; cancelled: number };
  appointments_this_month: number;
  appointments_prev_period: number;
  revenue_this_month: number;
  revenue_prev_period: number;
  visits_by_month: { month: string; label: string; completed: number; missed: number }[];
  visits_by_department: { name: string; count: number }[];
  today_appointments: Appointment[];
  doctors_today: {
    id: number;
    full_name: string;
    gender: Gender;
    specialization: string;
    department_name: string;
    shift_start: string | null;
    shift_end: string | null;
    appointments_today: number;
  }[];
  recent_patients: {
    id: number;
    mrn: string;
    full_name: string;
    gender: Gender;
    age: number | null;
    blood_group: BloodGroup;
    city: string;
    created_at: string;
  }[];
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
  latitude: string | null;
  longitude: string | null;
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

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapHospital {
  id: number;
  name: string;
  hospital_type: HospitalType;
  phone: string;
  email: string;
  address: string;
  emergency_available: boolean;
  bed_capacity: number | null;
  operating_hours: string;
  specialties: string[];
  is_active: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface MapDoctor {
  id: number;
  full_name: string;
  designation: string;
  specialization: string;
  qualification: string;
  department_name: string;
  phone: string;
  email: string;
  chamber: string;
  available_days: Weekday[];
  shift_start: string | null;
  shift_end: string | null;
  consultation_fee: string;
  is_active: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface MapData {
  center: { name: string; lat: number; lng: number };
  radius_km: number;
  hospitals: MapHospital[];
  doctors: MapDoctor[];
  unplaced: { hospitals: number; doctors: number };
}

export type AmbulanceType = "basic" | "als" | "icu" | "freezer";
export type AmbulanceStatus = "available" | "on_trip" | "offline" | "maintenance";
export type TripStatus = "dispatched" | "picked_up" | "completed" | "cancelled";

export interface Ambulance {
  id: number;
  vehicle_no: string;
  type: AmbulanceType;
  driver_name: string;
  driver_phone: string;
  driver_license: string;
  base_hospital: number | null;
  base_hospital_name: string;
  base_fare: string;
  per_km_rate: string;
  min_fare: string;
  status: AmbulanceStatus;
  latitude: string | null;
  longitude: string | null;
  speed_kmh: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  last_seen_seconds: number | null;
  active_trip: { id: number; status: TripStatus } | null;
  tracking_token: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FareBreakdown {
  base_fare: number;
  per_km_rate: number;
  distance_km: number;
  distance_charge: number;
  minimum_fare: number;
  minimum_applied: boolean;
  night: boolean;
  night_surcharge: number;
  total: number;
}

export interface AmbulanceTrip {
  id: number;
  ambulance: number;
  ambulance_info: { id: number; vehicle_no: string; type: AmbulanceType; driver_name: string; driver_phone: string };
  patient: number | null;
  patient_mrn: string;
  patient_name: string;
  contact_phone: string;
  pickup_address: string;
  pickup_lat: string;
  pickup_lng: string;
  destination_hospital: number | null;
  destination_hospital_name: string;
  destination_address: string;
  destination_lat: string;
  destination_lng: string;
  distance_km: string;
  estimated_fare: string;
  fare_breakdown: FareBreakdown;
  final_fare: string | null;
  status: TripStatus;
  notes: string;
  created_at: string;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface LiveAmbulance {
  id: number;
  vehicle_no: string;
  type: AmbulanceType;
  driver_name: string;
  driver_phone: string;
  status: AmbulanceStatus;
  base_hospital_name: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  is_online: boolean;
  last_seen_seconds: number | null;
  active_trip_id: number | null;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  trail: [number, number][];
}

export interface LiveTrip extends AmbulanceTrip {
  remaining_km: number | null;
  eta_minutes: number | null;
}

export interface LiveData {
  server_time: string;
  signal_timeout_seconds: number;
  night_pricing: boolean;
  stats: {
    total: number;
    available: number;
    on_trip: number;
    off_duty: number;
    no_signal: number;
    trips_today: number;
    completed_today: number;
    revenue_today: number;
  };
  ambulances: LiveAmbulance[];
  trips: LiveTrip[];
}

export interface NearHospital {
  id: number;
  name: string;
  address: string;
  emergency_available: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface AmbulanceQuote {
  pickup: LatLng;
  nearest_hospitals: NearHospital[];
  night_pricing: boolean;
  pricing_rules: { road_factor: number; avg_speed_kmh: number; night_surcharge_percent: number; default_rates: Record<AmbulanceType, [number, number, number]> };
  destination?: LatLng;
  trip_km?: number;
  trip_minutes?: number;
  options?: {
    ambulance: { id: number; vehicle_no: string; type: AmbulanceType; driver_name: string; driver_phone: string };
    to_pickup_km: number;
    eta_minutes: number;
    fare: FareBreakdown;
  }[];
  available_without_signal?: number;
}

export type StatsPeriod = "today" | "7d" | "30d" | "all";

export interface DriverRow {
  id: number;
  vehicle_no: string;
  type: AmbulanceType;
  driver_name: string;
  driver_phone: string;
  driver_license: string;
  status: AmbulanceStatus;
  is_online: boolean;
  last_seen_seconds: number | null;
  base_hospital_name: string;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  quote: FareBreakdown;
  trips_completed: number;
  trips_cancelled: number;
  total_km: number;
  revenue: number;
  avg_fare: number | null;
  avg_per_km: number | null;
  last_trip_at: string | null;
  active_trip: { id: number; status: TripStatus } | null;
}

export interface DriversData {
  period: StatsPeriod;
  since: string | null;
  quote_km: number;
  night_pricing: boolean;
  summary: { drivers: number; on_duty: number; trips: number; cancelled: number; km: number; revenue: number; avg_fare: number | null; avg_per_km: number | null };
  drivers: DriverRow[];
}
