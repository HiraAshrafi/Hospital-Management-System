"use client";

import { Check, Lock, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Badge, Button, Card, ConfirmDialog, Field, Input, Modal, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import type { PermissionItem, Role } from "@/lib/types";

function NewRoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (role: Role) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const role = await api<Role>("/roles/", { method: "POST", body: { code, name: name.trim(), description: description.trim(), permissions: [] } });
      onCreated(role);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="New role" onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Role name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ward Manager" required />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" />
        </Field>
        <p className="text-xs text-muted">The new role starts with no permissions. Tick what it needs, then save.</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function RolesPage() {
  const { can } = useAuth();
  const canEdit = can("roles.manage");
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([api<Role[]>("/roles/"), api<PermissionItem[]>("/permissions/")])
      .then(([r, p]) => {
        setRoles(r);
        setCatalog(p);
        if (r.length) {
          setSelectedId(r[0].id);
          setDraft(new Set(r[0].permissions));
        }
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const selected = roles?.find((r) => r.id === selectedId) ?? null;
  const locked = !canEdit || selected?.code === "super_admin";
  const modules = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of catalog) map.set(p.module, [...(map.get(p.module) ?? []), p]);
    return [...map.entries()];
  }, [catalog]);
  const dirty = selected ? selected.permissions.length !== draft.size || selected.permissions.some((p) => !draft.has(p)) : false;

  function select(role: Role) {
    setSelectedId(role.id);
    setDraft(new Set(role.permissions));
    setNotice("");
    setError("");
  }

  function toggle(code: string) {
    if (locked) return;
    setDraft((d) => {
      const next = new Set(d);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleModule(items: PermissionItem[]) {
    if (locked) return;
    const all = items.every((p) => draft.has(p.code));
    setDraft((d) => {
      const next = new Set(d);
      for (const p of items) {
        if (all) next.delete(p.code);
        else next.add(p.code);
      }
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api<Role>(`/roles/${selected.id}/`, { method: "PATCH", body: { permissions: [...draft] } });
      setRoles((list) => list && list.map((r) => (r.id === updated.id ? { ...updated, user_count: r.user_count } : r)));
      setNotice(`Saved. ${updated.name} now has ${updated.permissions.length} permissions. Staff in this role see the change next time they load a page.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!selected) return;
    try {
      const updated = await api<Role>(`/roles/${selected.id}/`, { method: "PATCH", body: { is_active: !selected.is_active } });
      setRoles((list) => list && list.map((r) => (r.id === updated.id ? { ...updated, user_count: r.user_count } : r)));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove() {
    if (!selected) return;
    try {
      await api(`/roles/${selected.id}/`, { method: "DELETE" });
      const rest = (roles ?? []).filter((r) => r.id !== selected.id);
      setRoles(rest);
      if (rest[0]) select(rest[0]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (!roles) {
    return error ? <Alert>{error}</Alert> : <div className="flex justify-center py-20"><Spinner /></div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-navy">Roles</h2>
            <p className="text-xs text-muted">{roles.length} roles</p>
          </div>
          {canEdit && (
            <Button variant="secondary" className="px-3 py-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>
        <ul className="p-2">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => select(r)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${r.id === selectedId ? "bg-primary-soft" : "hover:bg-surface-muted"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.id === selectedId ? "bg-primary text-white" : "bg-surface-muted text-primary"}`}>
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${r.is_active ? "" : "text-muted line-through"}`}>{r.name}</span>
                  <span className="block text-xs text-muted">
                    {r.permissions.length} permissions · {r.user_count} staff
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {selected && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-extrabold text-navy">
                {selected.name}
                {selected.is_system && <Badge tone="neutral">Built-in</Badge>}
                {!selected.is_active && <Badge tone="danger">Inactive</Badge>}
              </h2>
              <p className="mt-0.5 text-sm text-muted">{selected.description || "No description"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Users className="h-3.5 w-3.5" /> {selected.user_count} active staff in this role
              </p>
            </div>
            {canEdit && selected.code !== "super_admin" && (
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={toggleActive}>
                  {selected.is_active ? "Deactivate" : "Activate"}
                </Button>
                {!selected.is_system && (
                  <Button variant="ghost" className="hover:text-danger" onClick={() => setDeleting(true)} title="Delete role">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={save} loading={saving} disabled={!dirty}>
                  <Check className="h-4 w-4" /> Save
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 p-5">
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            {locked && (
              <p className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
                <Lock className="h-3.5 w-3.5" />
                {selected.code === "super_admin" ? "Super Admin always has every permission." : "You can view this role. Editing roles needs the “Edit roles” permission."}
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {modules.map(([module, items]) => {
                const on = items.filter((p) => draft.has(p.code)).length;
                return (
                  <div key={module} className="rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => toggleModule(items)}
                      disabled={locked}
                      className="flex w-full items-center justify-between border-b border-border bg-surface-muted px-4 py-2.5 text-left disabled:cursor-default"
                    >
                      <span className="text-sm font-bold text-navy">{module}</span>
                      <span className="text-xs font-semibold text-muted">
                        {on}/{items.length}
                      </span>
                    </button>
                    <ul className="divide-y divide-border">
                      {items.map((p) => (
                        <li key={p.code}>
                          <label className={`flex items-start gap-3 px-4 py-2.5 text-sm ${locked ? "" : "cursor-pointer hover:bg-surface-muted"}`}>
                            <input
                              type="checkbox"
                              checked={draft.has(p.code)}
                              onChange={() => toggle(p.code)}
                              disabled={locked}
                              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                            />
                            <span>
                              <span className="block">{p.label}</span>
                              <span className="block font-mono text-[11px] text-muted">{p.code}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {creating && (
        <NewRoleModal
          onClose={() => setCreating(false)}
          onCreated={(role) => {
            setCreating(false);
            setRoles((list) => [...(list ?? []), role]);
            select(role);
          }}
        />
      )}
      <ConfirmDialog
        open={deleting}
        title="Delete role"
        message={<>Delete the <strong>{selected?.name}</strong> role? Roles that still have staff can’t be deleted.</>}
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
