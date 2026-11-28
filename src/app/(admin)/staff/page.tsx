"use client";

import { Ban, CheckCircle2, Pencil, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import { StaffFormModal } from "@/components/staff/StaffFormModal";
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Pagination, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage, formatDate } from "@/lib/api";
import { ROLE_TONE } from "@/lib/staff";
import type { Role, StaffMember } from "@/lib/types";
import { useDebounced, useList, usePage } from "@/lib/useList";

const PAGE_SIZE = 12;

export default function StaffPage() {
  const { user: me, can } = useAuth();
  const canManage = can("staff.manage");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = usePage(search, role, status);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<StaffMember | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, setData, error, setError, reload } = useList<StaffMember>("/staff/", {
    page, page_size: PAGE_SIZE, search, role__code: role, is_active: status,
  });

  useEffect(() => {
    api<Role[]>("/roles/").then(setRoles).catch(() => {});
  }, []);

  async function toggleActive(member: StaffMember) {
    setBusyId(member.id);
    try {
      const updated = await api<StaffMember>(`/staff/${member.id}/toggle_active/`, { method: "POST" });
      setData((d) => d && { ...d, results: d.results.map((m) => (m.id === updated.id ? updated : m)) });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api(`/staff/${deleting.id}/`, { method: "DELETE" });
      setDeleting(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search name, email, employee ID" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-52" aria-label="Role">
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label="Status">
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </Select>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4" /> Add staff
          </Button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : data.results.length === 0 ? (
          <EmptyState icon={<UsersRound className="h-6 w-6" />} title="No staff found">
            {canManage ? "Add staff accounts and give each one a role." : "Try another search."}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Staff member</th>
                    <th className="px-5 py-3 font-semibold">Employee ID</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Last login</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    {canManage && <th className="px-5 py-3 text-right font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((m) => {
                    const isMe = m.id === me?.id;
                    return (
                      <tr key={m.id} className="hover:bg-surface-muted">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={m.full_name} email={m.email} src={m.avatar} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {m.full_name || "—"} {isMe && <span className="text-xs font-normal text-muted">(you)</span>}
                              </p>
                              <p className="truncate text-xs text-muted">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums">{m.profile?.employee_id ?? "—"}</td>
                        <td className="px-5 py-3">
                          {m.role ? <Badge tone={ROLE_TONE[m.role] ?? "neutral"}>{m.role_name}</Badge> : <span className="text-muted">No role</span>}
                          {m.profile?.designation && <p className="mt-1 text-xs text-muted">{m.profile.designation}</p>}
                        </td>
                        <td className="px-5 py-3 text-muted">{m.profile?.department_name || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted">{m.last_login ? formatDate(m.last_login) : "Never"}</td>
                        <td className="px-5 py-3">
                          <Badge tone={m.is_active ? "success" : "danger"}>{m.is_active ? "Active" : "Deactivated"}</Badge>
                        </td>
                        {canManage && (
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => setEditing(m)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!isMe && (
                                <>
                                  <Button
                                    variant="ghost"
                                    className="px-2 py-1.5"
                                    title={m.is_active ? "Deactivate" : "Activate"}
                                    loading={busyId === m.id}
                                    onClick={() => toggleActive(m)}
                                  >
                                    {busyId !== m.id && (m.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-success" />)}
                                  </Button>
                                  <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Delete" onClick={() => setDeleting(m)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>

      {editing !== undefined && (
        <StaffFormModal
          key={editing?.id ?? "new"}
          staff={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete staff account"
        message={
          <>
            Delete <strong>{deleting?.full_name || deleting?.email}</strong>? Their history in the activity log is kept. To keep the
            account for later, deactivate it instead.
          </>
        }
        confirmLabel="Delete"
        loading={busyId === deleting?.id}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
