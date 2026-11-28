"use client";

import { ChevronDown, ChevronRight, History, KeyRound, Search } from "lucide-react";
import { Fragment, useState } from "react";

import { Alert, Badge, Card, EmptyState, Input, Pagination, Select, Spinner, Tabs } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import type { AuditLogEntry, LoginHistoryEntry } from "@/lib/types";
import { useDebounced, useList, usePage } from "@/lib/useList";

const PAGE_SIZE = 20;

const ACTION_TONE: Record<string, BadgeTone> = {
  create: "success",
  update: "primary",
  delete: "danger",
  restore: "info",
  view: "neutral",
  download: "neutral",
  export: "violet",
  status: "warning",
  payment: "success",
  other: "neutral",
};

const MODULES = ["patients", "doctors", "appointments", "departments", "staff", "roles", "users", "hospitals", "ambulances"];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function browser(ua: string) {
  if (!ua) return "—";
  const name = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /okhttp|Dart|CFNetwork/i.test(ua) ? "Mobile app" : "Other";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${name} · ${os}` : name;
}

function ActivityTab() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = usePage(search, module, action, dateFrom, dateTo);
  const [open, setOpen] = useState<number | null>(null);
  const { data, error } = useList<AuditLogEntry>("/audit-logs/", {
    page, page_size: PAGE_SIZE, search, module, action, date_from: dateFrom, date_to: dateTo,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search user, record or note" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <Select value={module} onChange={(e) => setModule(e.target.value)} className="md:w-44" aria-label="Module">
          <option value="">All modules</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m[0].toUpperCase() + m.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="md:w-40" aria-label="Action">
          <option value="">All actions</option>
          {Object.keys(ACTION_TONE).map((a) => (
            <option key={a} value={a}>
              {a[0].toUpperCase() + a.slice(1)}
            </option>
          ))}
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="md:w-40" aria-label="From date" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="md:w-40" aria-label="To date" />
      </div>
      {error && <Alert>{error}</Alert>}
      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : data.results.length === 0 ? (
          <EmptyState icon={<History className="h-6 w-6" />} title="No activity yet">Changes made in the admin panel appear here.</EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="px-3 py-3 font-semibold">When</th>
                    <th className="px-3 py-3 font-semibold">User</th>
                    <th className="px-3 py-3 font-semibold">Action</th>
                    <th className="px-3 py-3 font-semibold">Record</th>
                    <th className="px-3 py-3 font-semibold">IP address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((log) => {
                    const changes = Object.entries(log.changes ?? {});
                    const expanded = open === log.id;
                    return (
                      <Fragment key={log.id}>
                        <tr className={`hover:bg-surface-muted ${changes.length ? "cursor-pointer" : ""}`} onClick={() => changes.length && setOpen(expanded ? null : log.id)}>
                          <td className="px-3 py-3 text-muted">
                            {changes.length > 0 && (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted">{when(log.created_at)}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold">{log.user_name || log.user_email || "System"}</p>
                            {log.user_name && <p className="text-xs text-muted">{log.user_email}</p>}
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone={ACTION_TONE[log.action] ?? "neutral"}>{log.action_label}</Badge>
                            {log.message && <p className="mt-1 text-xs text-muted">{log.message}</p>}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium">{log.object_repr || "—"}</p>
                            <p className="text-xs capitalize text-muted">
                              {log.module || log.model} {log.object_id && `#${log.object_id}`}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted">{log.ip_address ?? "—"}</td>
                        </tr>
                        {expanded && (
                          <tr className="bg-surface-muted/60">
                            <td />
                            <td colSpan={5} className="px-3 pb-4">
                              <table className="w-full text-xs">
                                <thead className="text-muted">
                                  <tr>
                                    <th className="py-1.5 text-left font-semibold">Field</th>
                                    <th className="py-1.5 text-left font-semibold">Before</th>
                                    <th className="py-1.5 text-left font-semibold">After</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {changes.map(([field, [before, after]]) => (
                                    <tr key={field}>
                                      <td className="py-1.5 pr-4 font-mono">{field}</td>
                                      <td className="py-1.5 pr-4 text-danger">{show(before)}</td>
                                      <td className="py-1.5 text-success">{show(after)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

function LoginsTab() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [success, setSuccess] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = usePage(search, success, channel);
  const { data, error } = useList<LoginHistoryEntry>("/login-history/", { page, page_size: PAGE_SIZE, search, success, channel });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search email or IP" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <Select value={success} onChange={(e) => setSuccess(e.target.value)} className="md:w-44" aria-label="Result">
          <option value="">All attempts</option>
          <option value="true">Successful</option>
          <option value="false">Failed</option>
        </Select>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="md:w-44" aria-label="Channel">
          <option value="">Admin & app</option>
          <option value="admin">Admin panel</option>
          <option value="app">Mobile app</option>
        </Select>
      </div>
      {error && <Alert>{error}</Alert>}
      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : data.results.length === 0 ? (
          <EmptyState icon={<KeyRound className="h-6 w-6" />} title="No logins recorded yet" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">When</th>
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">Where</th>
                    <th className="px-5 py-3 font-semibold">Result</th>
                    <th className="px-5 py-3 font-semibold">IP address</th>
                    <th className="px-5 py-3 font-semibold">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-muted">
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{when(row.created_at)}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{row.user_name || row.email}</p>
                        {row.user_name && <p className="text-xs text-muted">{row.email}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted">{row.channel === "admin" ? "Admin panel" : "Mobile app"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={row.success ? "success" : "danger"}>{row.success ? "Signed in" : "Failed"}</Badge>
                        {row.failure_reason && <p className="mt-1 text-xs text-muted">{row.failure_reason}</p>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{row.ip_address ?? "—"}</td>
                      <td className="px-5 py-3 text-muted">{browser(row.user_agent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

export default function ActivityPage() {
  const [tab, setTab] = useState<"activity" | "logins">("activity");
  return (
    <div className="space-y-4">
      <Tabs
        label="Log type"
        value={tab}
        onChange={setTab}
        options={[
          { value: "activity", label: "Activity" },
          { value: "logins", label: "Login history" },
        ]}
      />
      {tab === "activity" ? <ActivityTab /> : <LoginsTab />}
    </div>
  );
}
