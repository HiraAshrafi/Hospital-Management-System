"use client";

import { Bell, CalendarClock, CheckCheck, ChevronDown, ClipboardList, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PatientDetailModal } from "@/components/hms/PatientDetailModal";
import { NAV_ITEMS } from "@/components/Sidebar";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import type { NotificationItem, Paginated, PatientMini } from "@/lib/types";

function PatientSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientMini[] | null>(null);
  const [open, setOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<Paginated<PatientMini>>(`/patients/${buildQuery({ search: q, page_size: 6 })}`)
        .then((res) => !cancelled && setResults(res.results))
        .catch(() => !cancelled && setResults([]));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showResults = open && query.trim().length >= 2 && results !== null;

  return (
    <div ref={boxRef} className="relative hidden w-full max-w-sm md:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Search patients by name, ID or phone"
        aria-label="Search patients"
        className="w-full rounded-full border border-border bg-surface-muted py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10"
      />
      {showResults && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No patients match “{query.trim()}”</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setViewingId(p.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-background"
              >
                <Avatar name={p.full_name} email={p.mrn} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted">
                    {p.mrn} · {p.phone || "no phone"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
      {viewingId !== null && <PatientDetailModal key={viewingId} patientId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

const LEVEL_TONE: Record<NotificationItem["level"], string> = {
  info: "bg-primary-soft text-primary",
  success: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function Notifications() {
  const { can } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<{ requests: number; waiting: number }>({ requests: 0, waiting: 0 });
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const canAppointments = can("appointments.view");
  const canRequests = can("hospitals.view");

  // Refresh on every page change and every minute so the badge stays roughly current.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<Paginated<NotificationItem>>(`/notifications/${buildQuery({ page_size: 8 })}`)
      .then((res) => !cancelled && setItems(res.results))
      .catch(() => {});
    api<{ count: number }>("/notifications/unread_count/")
      .then((res) => !cancelled && setUnread(res.count))
      .catch(() => {});
    Promise.all([
      canRequests ? api<Paginated<unknown>>(`/hospital-requests/${buildQuery({ status: "pending", page_size: 1 })}`) : null,
      canAppointments ? api<Paginated<unknown>>(`/appointments/${buildQuery({ when: "today", status: "scheduled", page_size: 1 })}`) : null,
    ])
      .then(([r, a]) => !cancelled && setCounts({ requests: r?.count ?? 0, waiting: a?.count ?? 0 }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, tick, canAppointments, canRequests]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const summaries = [
    { href: "/appointments", icon: CalendarClock, text: `${counts.waiting} appointment${counts.waiting === 1 ? "" : "s"} waiting today`, show: counts.waiting > 0 },
    { href: "/requests", icon: ClipboardList, text: `${counts.requests} hospital request${counts.requests === 1 ? "" : "s"} to review`, show: counts.requests > 0 },
  ].filter((i) => i.show);
  const total = unread + summaries.length;

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read_at) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnread((n) => Math.max(0, n - 1));
      api(`/notifications/${item.id}/read/`, { method: "POST" }).catch(() => {});
    }
    if (item.link) router.push(item.link);
  }

  async function readAll() {
    await api("/notifications/read_all/", { method: "POST" }).catch(() => {});
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted hover:bg-primary-soft hover:text-primary"
        aria-label={`Notifications${total ? ` (${total})` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-navy">Notifications</p>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {summaries.map(({ href, icon: Icon, text }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm hover:bg-background">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </Link>
            ))}
            {items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-0 hover:bg-background">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${LEVEL_TONE[n.level]}`}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.read_at ? "font-medium text-muted" : "font-semibold text-foreground"}`}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-xs text-muted">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              </button>
            ))}
            {items.length === 0 && summaries.length === 0 && <p className="px-4 py-4 text-sm text-muted">You’re all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const title = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button className="rounded-lg p-1.5 text-muted hover:bg-background lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold tracking-tight text-navy">{title}</h1>
      {can("patients.view") && <PatientSearch />}
      <Notifications />
      {user && (
        <Link href="/settings" className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3 hover:border-primary/40 hover:bg-primary-soft">
          <Avatar name={user.full_name} email={user.email} src={user.avatar} />
          <div className="hidden text-left xl:block">
            <p className="text-sm font-bold leading-tight text-navy">{user.full_name || "Admin"}</p>
            <p className="text-xs text-muted">{user.role_name || (user.is_superuser ? "Super Admin" : "Staff")}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
        </Link>
      )}
    </header>
  );
}
