"use client";

import {
  Ambulance,
  BadgeCheck,
  BedDouble,
  Building,
  Building2,
  CalendarDays,
  ClipboardList,
  History,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  LayoutPanelTop,
  LogOut,
  Map as MapIcon,
  ReceiptText,
  Settings,
  ShieldCheck,
  Stethoscope,
  Tags,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/Brand";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Permission needed to see and open the page (any of, for an array). Empty = every staff member. */
  perm?: string | string[];
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
      { href: "/map", label: "Map", icon: MapIcon, perm: "dashboard.view" },
      { href: "/ambulances", label: "Ambulances", icon: Ambulance, perm: "ambulances.view" },
      { href: "/ambulance-drivers", label: "Drivers & Fares", icon: IdCard, perm: "ambulances.view" },
    ],
  },
  {
    title: "Clinical",
    items: [
      { href: "/appointments", label: "Appointments", icon: CalendarDays, perm: "appointments.view" },
      { href: "/patients", label: "Patients", icon: UserRound, perm: "patients.view" },
      { href: "/doctors", label: "Doctors", icon: Stethoscope, perm: "doctors.view" },
      { href: "/departments", label: "Departments", icon: LayoutGrid, perm: "departments.view" },
    ],
  },
  {
    title: "Inpatient",
    items: [
      { href: "/admissions", label: "Admissions", icon: BedDouble, perm: "admissions.view" },
      { href: "/beds", label: "Bed Board", icon: LayoutPanelTop, perm: "admissions.view" },
      { href: "/wards", label: "Wards & Beds", icon: Building, perm: "wards.manage" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/billing", label: "Billing", icon: ReceiptText, perm: "billing.view" },
      { href: "/payments", label: "Payments", icon: Wallet, perm: "billing.view" },
      { href: "/price-list", label: "Price List", icon: Tags, perm: "billing.view" },
    ],
  },
  {
    title: "Hospital network",
    items: [
      { href: "/hospitals", label: "Hospitals", icon: Building2, perm: "hospitals.view" },
      { href: "/requests", label: "Hospital Requests", icon: ClipboardList, perm: "hospitals.view" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/staff", label: "Staff", icon: BadgeCheck, perm: "staff.view" },
      { href: "/roles", label: "Roles & Permissions", icon: ShieldCheck, perm: "staff.view" },
      { href: "/users", label: "App Users", icon: Users, perm: "staff.view" },
      { href: "/activity", label: "Activity Log", icon: History, perm: "audit.view" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout, can } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-deep/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`brand-sidebar fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-width)] flex-col text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
          <Link href="/dashboard" className="min-w-0 rounded-lg focus-visible:outline-white" onClick={onClose} aria-label="AshrafiTech dashboard">
            <BrandLogo tone="dark" />
          </Link>
          <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => can(item.perm)) }))
            .filter((group) => group.items.length > 0)
            .map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">{group.title}</p>
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-white ${
                        active
                          ? "bg-gradient-to-r from-primary to-primary-bright text-white shadow-[0_8px_18px_-10px_rgba(47,124,240,0.9)]"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          {user && (
            <div className="mb-1 flex items-center gap-3 rounded-xl bg-white/5 px-2.5 py-2">
              <Avatar name={user.full_name} email={user.email} src={user.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.full_name || "Admin"}</p>
                <p className="truncate text-xs text-white/60">{user.role_name || user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
