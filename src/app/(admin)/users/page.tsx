"use client";

import { Ban, CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, Input, Pagination, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import type { Paginated, User } from "@/lib/types";

import { UserFormModal } from "./UserFormModal";

const PAGE_SIZE = 10;

export default function UsersPage() {
  const { user: me } = useAuth();
  const [data, setData] = useState<Paginated<User> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("false");
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<User | null | undefined>(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const query = buildQuery({ page, page_size: PAGE_SIZE, search, is_active: status, is_staff: role });
    api<Paginated<User>>(`/users/${query}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError("");
        }
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [page, search, status, role, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function toggleActive(user: User) {
    setBusyId(user.id);
    try {
      const updated = await api<User>(`/users/${user.id}/toggle_active/`, { method: "POST" });
      setData((d) => d && { ...d, results: d.results.map((u) => (u.id === updated.id ? updated : u)) });
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
      await api(`/users/${deleting.id}/`, { method: "DELETE" });
      setDeleting(null);
      if (data && data.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
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
            <Input
              placeholder="Search name, email, phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Role">
            <option value="false">App users</option>
            <option value="true">Admins</option>
            <option value="">All</option>
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-40" aria-label="Status">
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Blocked</option>
          </Select>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-background text-xs uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Country</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((u) => {
                    const isMe = u.id === me?.id;
                    return (
                      <tr key={u.id} className="hover:bg-background/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.full_name} email={u.email} src={u.avatar} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate font-medium">
                                {u.full_name || "—"}
                                {u.is_staff && <Badge tone="primary">Admin</Badge>}
                              </p>
                              <p className="truncate text-xs text-muted">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted">{u.phone || "—"}</td>
                        <td className="px-5 py-3 text-muted">{u.country || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(u.date_joined)}</td>
                        <td className="px-5 py-3">
                          <Badge tone={u.is_active ? "success" : "danger"}>{u.is_active ? "Active" : "Blocked"}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" className="px-2 py-1.5" title="Edit" onClick={() => setEditing(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!isMe && (
                              <>
                                <Button
                                  variant="ghost"
                                  className="px-2 py-1.5"
                                  title={u.is_active ? "Block" : "Unblock"}
                                  loading={busyId === u.id}
                                  onClick={() => toggleActive(u)}
                                >
                                  {busyId !== u.id &&
                                    (u.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-success" />)}
                                </Button>
                                <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Delete" onClick={() => setDeleting(u)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data.results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center text-muted">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>

      {editing !== undefined && (
        <UserFormModal
          key={editing?.id ?? "new"}
          user={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete user"
        message={
          <>
            Delete <strong>{deleting?.full_name || deleting?.email}</strong>? This cannot be undone.
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
