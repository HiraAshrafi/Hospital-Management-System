"use client";

import { Activity, BedDouble, Building2, Hourglass, Plus, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, Avatar, Badge, Card, Spinner } from "@/components/ui";
import { api, errorMessage, formatDate } from "@/lib/api";
import { REQUEST_TYPE_LABEL } from "@/lib/hospitals";
import type { DashboardStats } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Re-runs whenever this page becomes visible again (Next.js keeps visited pages alive).
    let cancelled = false;
    api<DashboardStats>("/dashboard/stats/")
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const cards = [
    { label: "Total Users", value: stats.total_users, icon: Users, tone: "bg-primary-soft text-primary" },
    { label: "Active Users", value: stats.active_users, icon: UserCheck, tone: "bg-success-soft text-success" },
    { label: "Blocked Users", value: stats.blocked_users, icon: UserX, tone: "bg-danger-soft text-danger" },
    { label: "New This Month", value: stats.new_users_this_month, icon: UserPlus, tone: "bg-accent-soft text-warning" },
  ];
  const hospitalCards = [
    { label: "Total hospitals", value: stats.total_hospitals, icon: Building2, tone: "bg-primary-soft text-primary", href: "/hospitals" },
    { label: "Managed hospitals", value: stats.managed_hospitals, icon: UserCheck, tone: "bg-success-soft text-success", href: "/hospitals" },
    { label: "Unmanaged hospitals", value: stats.unmanaged_hospitals, icon: BedDouble, tone: "bg-background text-muted", href: "/hospitals" },
    { label: "Active directory", value: stats.total_hospitals - stats.inactive_hospitals, icon: Activity, tone: "bg-success-soft text-success", href: "/hospitals" },
    { label: "Pending requests", value: stats.pending_requests, icon: Hourglass, tone: "bg-accent-soft text-warning", href: "/requests" },
  ];
  const maxSignups = Math.max(1, ...stats.signups_by_month.map((m) => m.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/75">Hospital network overview</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Hospital operations</h2>
          <p className="mt-1 text-sm text-white/80">Monitor facilities, management requests, and user activity.</p>
        </div>
        <Link href="/hospitals" className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white/90">
          <Plus className="h-4 w-4" /> Add hospital
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {hospitalCards.map(({ label, value, icon: Icon, tone, href }) => (
          <Link key={label} href={href} className="rounded-xl transition-transform hover:-translate-y-0.5">
            <Card className="flex items-center gap-4 p-5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-4 p-5">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-muted">{label}</p>
              <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-5 xl:col-span-2">
          <h2 className="font-semibold">New Signups</h2>
          <p className="text-sm text-muted">Last 6 months</p>
          <div className="mt-6 flex h-56 items-end gap-3">
            {stats.signups_by_month.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-medium tabular-nums">{m.count}</span>
                <div
                  className="w-full max-w-10 rounded-t-md bg-primary"
                  style={{ height: `${Math.max(2, (m.count / maxSignups) * 100)}%` }}
                  title={`${m.label}: ${m.count}`}
                />
                <span className="text-xs text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Recent Users</h2>
            <Link href="/users" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recent_users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} email={u.email} src={u.avatar} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.full_name || "—"}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{u.country || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(u.date_joined)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Active" : "Blocked"}</Badge>
                    </td>
                  </tr>
                ))}
                {stats.recent_users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-semibold">Hospital requests waiting for review</h2>
            <p className="text-sm text-muted">Newest first</p>
          </div>
          <Link href="/requests" className="text-sm font-medium text-primary hover:underline">
            Review all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Hospital</th>
                <th className="px-5 py-3 font-medium">Requested by</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.recent_requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{request.hospital.name}</p>
                    <p className="text-xs text-muted">{[request.hospital.city, request.hospital.country].filter(Boolean).join(", ") || "—"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium">{request.claimant_name}</p>
                    <p className="text-xs text-muted">{request.user?.email ?? "Account deleted"}</p>
                  </td>
                  <td className="px-5 py-3">
                    {request.type === "new_hospital" ? <Badge tone="primary">{REQUEST_TYPE_LABEL[request.type]}</Badge> : <span className="text-muted">{REQUEST_TYPE_LABEL[request.type]}</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(request.created_at)}</td>
                </tr>
              ))}
              {stats.recent_requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted">
                    No hospital requests waiting for review
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
