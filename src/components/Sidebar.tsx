"use client";

import {
  Ambulance,
  Building2,
  CalendarDays,
  ClipboardList,
  Hospital,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Map as MapIcon,
  Settings,
  Stethoscope,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/map", label: "Map", icon: MapIcon },
      { href: "/ambulances", label: "Ambulances", icon: Ambulance },
      { href: "/ambulance-drivers", label: "Drivers & Fares", icon: IdCard },
    ],
  },
  {
    title: "Clinical",
    items: [
      { href: "/appointments", label: "Appointments", icon: CalendarDays },
      { href: "/patients", label: "Patients", icon: UserRound },
      { href: "/doctors", label: "Doctors", icon: Stethoscope },
      { href: "/departments", label: "Departments", icon: LayoutGrid },
    ],
  },
  {
    title: "Hospital network",
    items: [
      { href: "/hospitals", label: "Hospitals", icon: Building2 },
      { href: "/requests", label: "Hospital Requests", icon: ClipboardList },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-width)] flex-col border-r border-border bg-surface transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-[0_6px_16px_-6px_var(--primary)]">
              <Hospital className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight">Hospital</span>
              <span className="block text-[11px] font-medium text-muted">Management System</span>
            </span>
          </Link>
          <button className="rounded-lg p-1.5 text-muted hover:bg-background lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active ? "bg-primary-soft text-primary" : "text-muted hover:bg-background hover:text-foreground"
                      }`}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
                      <Icon className="h-[18px] w-[18px]" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          {user && (
            <div className="mb-1 flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar name={user.full_name} email={user.email} src={user.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.full_name || "Admin"}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
