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
  role: string | null;
  role_name: string;
  permissions: string[];
  doctor_id: number | null;
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
  schedules: DoctorSchedule[];
  available_days: Weekday[];
  shift_start: string | null;
  shift_end: string | null;
  user: number | null;
  user_email: string;
  on_leave_today: boolean;
  bio: string;
  is_active: boolean;
  joined_on: string | null;
  upcoming_appointments: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorSchedule {
  id?: number;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  max_patients: number | null;
  is_active: boolean;
}

export interface DoctorLeave {
  id: number;
  doctor: number;
  doctor_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  affected_appointments: number;
  created_at: string;
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
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  national_id: string;
  marital_status: MaritalStatus;
  occupation: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  /** Only present for roles with patients.view_medical. */
  allergies?: string;
  medical_notes?: string;
  allergy_list?: string[];
  is_active: boolean;
  status: "active" | "inactive" | "admitted" | "archived";
  appointment_count: number;
  last_visit: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "";

export interface PatientAllergy {
  id: number;
  patient: number;
  allergen: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening";
  notes: string;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalCondition {
  id: number;
  patient: number;
  name: string;
  icd_code: string;
  status: "active" | "chronic" | "resolved";
  diagnosed_on: string | null;
  resolved_on: string | null;
  notes: string;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalHistoryEntry {
  id: number;
  patient: number;
  category: string;
  category_label: string;
  title: string;
  details: string;
  event_date: string | null;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PatientDocument {
  id: number;
  patient: number;
  title: string;
  category: string;
  category_label: string;
  original_name: string;
  extension: string;
  size: number;
  notes: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface PatientSummary {
  admissions?: number;
  current_admission?: { id: number; admission_no: string; admitted_at: string; bed: string; doctor: string; is_icu: boolean; reason: string } | null;
  visits: number;
  upcoming: number;
  cancelled: number;
  next_appointment: Appointment | null;
  doctors_seen: { doctor: number; doctor__first_name: string; doctor__last_name: string; visits: number; last: string }[];
  medical?: {
    allergies: PatientAllergy[];
    active_conditions: MedicalCondition[];
    documents: number;
    history_entries: number;
  };
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
  reschedule_count: number;
  cancel_reason: string;
  cancelled_at: string | null;
  cancelled_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarItem {
  id: number;
  date: string;
  time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  patient: number;
  patient_name: string;
  mrn: string;
  doctor: number;
  doctor_name: string;
  department_name: string;
}

export interface CalendarResponse {
  start: string;
  end: string;
  days: ({ date: string; total: number } & Partial<Record<AppointmentStatus, number>>)[];
  appointments: CalendarItem[];
}

export interface Availability {
  date: string;
  works: boolean;
  reason: string;
  slot_minutes: number | null;
  slots: { time: string; available: boolean; booked: boolean }[];
}

export interface PerformanceRow {
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  scheduled: number;
  revenue: number;
  patients: number;
  completion_rate: number | null;
  no_show_rate: number | null;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  total: number;
  completed: number;
  revenue: number;
}

export interface DoctorPerformance extends PerformanceRow {
  period: string;
  start: string;
  end: string;
  avg_per_day: number;
  upcoming: number;
  by_type: { type: AppointmentType; count: number }[];
  monthly: MonthlyPoint[];
}

export interface DoctorPerformanceRow extends PerformanceRow {
  id: number;
  full_name: string;
  specialization: string;
  department_name: string;
  is_active: boolean;
}

export interface DepartmentAnalyticsRow extends PerformanceRow {
  id: number;
  name: string;
  is_active: boolean;
  doctors: number;
  monthly?: MonthlyPoint[];
  doctors_table?: DoctorPerformanceRow[];
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

// ---------------------------------------------------------------------------- Staff, roles, audit, notifications
export interface PermissionItem {
  code: string;
  module: string;
  label: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  permissions: string[];
  user_count: number;
  created_at: string;
  updated_at: string;
}

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";

export interface StaffProfile {
  employee_id: string | null;
  designation: string;
  department: number | null;
  department_name: string;
  employment_type: EmploymentType;
  joining_date: string | null;
  national_id: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
}

export interface StaffMember {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  gender: Gender;
  avatar: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
  role_name: string;
  profile: StaffProfile | null;
  doctor_id: number | null;
  last_login: string | null;
  date_joined: string;
}

export interface AuditLogEntry {
  id: number;
  user: number | null;
  user_email: string;
  user_name: string;
  action: string;
  action_label: string;
  module: string;
  model: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, [unknown, unknown]>;
  message: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
}

export interface LoginHistoryEntry {
  id: number;
  user: number | null;
  email: string;
  user_name: string;
  channel: "admin" | "app";
  success: boolean;
  failure_reason: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  category: string;
  level: "info" | "success" | "warning" | "danger";
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------- Admissions & beds
export type BedStatus = "available" | "occupied" | "reserved" | "cleaning" | "maintenance";
export type AdmissionStatus = "admitted" | "discharged" | "deceased" | "cancelled";

export interface Ward {
  id: number;
  name: string;
  code: string;
  ward_type: string;
  ward_type_label: string;
  is_icu: boolean;
  department: number | null;
  department_name: string;
  floor: string;
  gender: "any" | "male" | "female";
  daily_rate: string;
  phone: string;
  description: string;
  is_active: boolean;
  total_beds: number;
  occupied: number;
  available: number;
  cleaning: number;
  out_of_service: number;
}

export interface BedOccupant {
  admission_id: number;
  admission_no: string;
  patient_id: number;
  patient_name: string;
  mrn: string;
  gender: Gender;
  age: number | null;
  doctor_name: string;
  admitted_at: string;
  days: number;
  admission_type: string;
}

export interface Bed {
  id: number;
  ward: number;
  ward_name: string;
  ward_type: string;
  number: string;
  bed_type: string;
  bed_type_label: string;
  status: BedStatus;
  status_label: string;
  daily_rate: string | null;
  effective_rate: string;
  features: string;
  is_active: boolean;
  occupant: BedOccupant | null;
}

export interface BoardWard extends Ward {
  beds: Bed[];
}

export interface Admission {
  id: number;
  admission_no: string;
  patient: number;
  patient_info: PatientMini;
  doctor: number;
  doctor_info: DoctorMini;
  department: number | null;
  department_name: string;
  admission_type: string;
  type_label: string;
  status: AdmissionStatus;
  status_label: string;
  admitted_at: string;
  expected_discharge: string | null;
  reason: string;
  diagnosis: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  notes: string;
  current_bed: number | null;
  bed_label: string;
  ward_name: string;
  is_icu: boolean;
  length_of_stay_days: number;
  discharged_at: string | null;
  discharge_type: string;
  discharge_type_label: string;
  final_diagnosis: string;
  discharge_summary: string;
  discharge_instructions: string;
  follow_up_date: string | null;
  created_by_name: string;
  discharged_by_name: string;
  created_at: string;
}

export interface BedStay {
  id: number;
  bed: number;
  bed_label: string;
  ward_name: string;
  started_at: string;
  ended_at: string | null;
  nights: number;
  daily_rate: string;
  reason: string;
  reason_label: string;
  notes: string;
  moved_by_name: string;
}

export interface AdmissionCharges {
  stays: BedStay[];
  lines: { bed: string; ward: string; nights: number; daily_rate: string; amount: string }[];
  total: string;
  days: number;
}

export interface AdmissionStats {
  admitted: number;
  admitted_today: number;
  emergency_today: number;
  discharged_today: number;
  due_today: number;
  beds_total: number;
  beds_occupied: number;
  beds_available: number;
  beds_cleaning: number;
  occupancy_rate: number;
  icu_total: number;
  icu_occupied: number;
  icu_occupancy_rate: number;
  avg_length_of_stay_days: number | null;
  by_ward: { id: number; name: string; ward_type: string; total: number; occupied: number }[];
}

// ---------------------------------------------------------------------------- Billing
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "bkash" | "nagad" | "sslcommerz";

export interface TaxRate {
  id: number;
  name: string;
  percent: string;
  is_default: boolean;
  is_active: boolean;
}

export interface ServiceCharge {
  id: number;
  code: string;
  name: string;
  category: string;
  category_label: string;
  price: string;
  taxable: boolean;
  is_active: boolean;
}

export interface InvoiceItem {
  id: number;
  category: string;
  category_label: string;
  description: string;
  quantity: string;
  unit_price: string;
  taxable: boolean;
  line_total: string;
  source_type: string;
  source_id: number | null;
  is_void: boolean;
}

export interface PaymentRecord {
  id: number;
  payment_no: string;
  invoice: number;
  invoice_no: string;
  patient_name: string;
  patient_mrn: string;
  amount: string;
  method: PaymentMethod;
  method_label: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  status_label: string;
  reference: string;
  paid_at: string | null;
  received_by_name: string;
  notes: string;
  gateway_card_type: string;
  amount_refunded: string;
  refundable: string;
  created_at: string;
}

export interface RefundRecord {
  id: number;
  refund_no: string;
  payment: number;
  payment_no: string;
  invoice: number;
  invoice_no: string;
  patient_name: string;
  amount: string;
  method: PaymentMethod;
  method_label: string;
  reference: string;
  reason: string;
  refunded_by_name: string;
  created_at: string;
}

export interface InvoiceSummary {
  id: number;
  invoice_no: string;
  patient: number;
  patient_info: PatientMini;
  admission: number | null;
  status: InvoiceStatus;
  status_label: string;
  issued_at: string | null;
  due_date: string | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  amount_paid: string;
  amount_refunded: string;
  net_paid: string;
  balance: string;
  item_count: number;
  created_at: string;
}

export interface Invoice extends InvoiceSummary {
  items: InvoiceItem[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  is_locked: boolean;
  discount_type: "none" | "percent" | "amount";
  discount_value: string;
  discount_reason: string;
  discount_by_name: string;
  tax_rate: number | null;
  tax_percent: string;
  notes: string;
  cancel_reason: string;
  created_by_name: string;
  admission_no: string;
  patient_details: { phone: string; email: string; address: string };
}

export interface UnbilledItem {
  source_type: string;
  source_id: number;
  category: string;
  description: string;
  quantity: string;
  unit_price: string;
  line_total?: string;
  taxable: boolean;
  date: string;
}

export interface BillingStats {
  collected_today: string;
  collected_month: string;
  refunded_month: string;
  outstanding: string;
  due_count: number;
  overdue_count: number;
  draft_count: number;
  by_method: { method: PaymentMethod; label: string; amount: string; count: number }[];
  daily: { date: string; amount: string }[];
}
