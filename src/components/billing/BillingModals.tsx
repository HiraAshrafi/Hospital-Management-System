"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PatientPicker } from "@/components/hms/AppointmentFormModal";
import { Alert, Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDay, formatMoney2, PAYMENT_METHODS, SERVICE_CATEGORIES } from "@/lib/hms";
import type { Invoice, PatientMini, PaymentRecord, ServiceCharge, UnbilledItem } from "@/lib/types";

type Line = { key: number; service: string; description: string; category: string; quantity: string; unit_price: string };

function useServices() {
  const [services, setServices] = useState<ServiceCharge[]>([]);
  useEffect(() => {
    api<{ results: ServiceCharge[] }>("/service-charges/?page_size=100&is_active=true").then((r) => setServices(r.results)).catch(() => {});
  }, []);
  return services;
}

/** Service-or-custom line editor used by New invoice and Add items. */
function LineEditor({ lines, setLines, services }: { lines: Line[]; setLines: (l: Line[]) => void; services: ServiceCharge[] }) {
  const update = (key: number, patch: Partial<Line>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lines.map((l) => {
        const svc = services.find((s) => String(s.id) === l.service);
        return (
          <div key={l.key} className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-[1.4fr_1.4fr_70px_100px_32px]">
            <Select
              value={l.service}
              onChange={(e) => {
                const s = services.find((x) => String(x.id) === e.target.value);
                update(l.key, { service: e.target.value, unit_price: s ? s.price : l.unit_price, description: s ? "" : l.description });
              }}
              aria-label="Service"
            >
              <option value="">Custom item…</option>
              {SERVICE_CATEGORIES.map((c) => {
                const list = services.filter((s) => s.category === c.value);
                return list.length ? (
                  <optgroup key={c.value} label={c.label}>
                    {list.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatMoney2(s.price)}</option>)}
                  </optgroup>
                ) : null;
              })}
            </Select>
            <Input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder={svc ? svc.name : "Description"} required={!svc} aria-label="Description" />
            <Input type="number" min="1" step="1" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} aria-label="Quantity" />
            <Input type="number" min="0" step="0.01" value={l.unit_price} disabled={Boolean(svc)} onChange={(e) => update(l.key, { unit_price: e.target.value })} aria-label="Unit price" required />
            <button type="button" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className="flex items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove line">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => setLines([...lines, { key: Date.now(), service: "", description: "", category: "service", quantity: "1", unit_price: "" }])}>
        <Plus className="h-4 w-4" /> Add service / item
      </Button>
    </div>
  );
}

function linesToItems(lines: Line[]) {
  return lines
    .filter((l) => l.service || (l.description.trim() && l.unit_price !== ""))
    .map((l) => (l.service ? { service: Number(l.service), quantity: l.quantity || "1", description: l.description.trim() || undefined } : { description: l.description.trim(), category: "other", quantity: l.quantity || "1", unit_price: l.unit_price }));
}

export function NewInvoiceModal({ presetPatient, onClose, onSaved }: { presetPatient?: PatientMini; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const services = useServices();
  const [patient, setPatient] = useState<PatientMini | null>(presetPatient ?? null);
  const [unbilled, setUnbilled] = useState<UnbilledItem[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"draft" | "issue" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    api<UnbilledItem[]>(`/invoices/unbilled/?patient=${patient.id}`)
      .then((rows) => {
        if (cancelled) return;
        setUnbilled(rows);
        setPicked(new Set(rows.map((r) => `${r.source_type}:${r.source_id}`)));
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [patient]);
  const shown = patient ? unbilled : null;

  const estimate = useMemo(() => {
    const fromSources = (shown ?? []).filter((u) => picked.has(`${u.source_type}:${u.source_id}`)).reduce((s, u) => s + Number(u.line_total ?? Number(u.unit_price) * Number(u.quantity)), 0);
    const fromLines = lines.reduce((s, l) => {
      const svc = services.find((x) => String(x.id) === l.service);
      return s + Number(svc ? svc.price : l.unit_price || 0) * Number(l.quantity || 1);
    }, 0);
    return fromSources + fromLines;
  }, [shown, picked, lines, services]);

  async function submit(mode: "draft" | "issue") {
    if (!patient) return setError("Choose a patient.");
    const sources = (shown ?? []).filter((u) => picked.has(`${u.source_type}:${u.source_id}`)).map((u) => ({ source_type: u.source_type, source_id: u.source_id }));
    const items = linesToItems(lines);
    if (!sources.length && !items.length) return setError("Tick an unbilled item or add a service.");
    setSaving(mode);
    setError("");
    try {
      onSaved(await api<Invoice>("/invoices/", { method: "POST", body: { patient: patient.id, sources, items, notes, issue: mode === "issue" } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal open title="New invoice" onClose={onClose} width="max-w-3xl">
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Patient">
          <PatientPicker value={patient} onChange={(p) => { setPatient(p); setUnbilled(null); }} />
        </Field>
        {patient && (
          <div>
            <p className="mb-2 text-sm font-semibold">Unbilled for this patient</p>
            {!shown ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : shown.length === 0 ? (
              <p className="rounded-xl bg-surface-muted px-3 py-2.5 text-sm text-muted">Nothing unbilled. Add services below.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {shown.map((u) => {
                  const key = `${u.source_type}:${u.source_id}`;
                  return (
                    <li key={key}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-muted">
                        <input type="checkbox" checked={picked.has(key)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })} className="h-4 w-4 accent-[var(--primary)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{u.description}</span>
                          <span className="text-xs text-muted">{formatDay(u.date)} · qty {Number(u.quantity)}</span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{formatMoney2(u.line_total ?? Number(u.unit_price) * Number(u.quantity))}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold">Services & other items</p>
          <LineEditor lines={lines} setLines={setLines} services={services} />
        </div>
        <Field label="Note on invoice">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Estimated total <strong className="text-lg text-navy">{formatMoney2(estimate)}</strong> <span className="text-xs">(tax and discounts applied on the invoice)</span>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" loading={saving === "draft"} disabled={saving !== null} onClick={() => submit("draft")}>Save draft</Button>
            <Button loading={saving === "issue"} disabled={saving !== null} onClick={() => submit("issue")}>Create & issue</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function AddItemsModal({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const services = useServices();
  const [lines, setLines] = useState<Line[]>([{ key: 1, service: "", description: "", category: "service", quantity: "1", unit_price: "" }]);
  const [unbilled, setUnbilled] = useState<UnbilledItem[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<UnbilledItem[]>(`/invoices/unbilled/?patient=${invoice.patient}`).then(setUnbilled).catch(() => {});
  }, [invoice.patient]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const sources = unbilled.filter((u) => picked.has(`${u.source_type}:${u.source_id}`)).map((u) => ({ source_type: u.source_type, source_id: u.source_id }));
      onSaved(await api<Invoice>(`/invoices/${invoice.id}/add_items/`, { method: "POST", body: { sources, items: linesToItems(lines) } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Add items" onClose={onClose} width="max-w-3xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {unbilled.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {unbilled.map((u) => {
              const key = `${u.source_type}:${u.source_id}`;
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted">
                    <input type="checkbox" checked={picked.has(key)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; })} className="h-4 w-4 accent-[var(--primary)]" />
                    <span className="flex-1 text-sm">{u.description}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatMoney2(u.line_total ?? Number(u.unit_price) * Number(u.quantity))}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <LineEditor lines={lines} setLines={setLines} services={services} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add to invoice</Button>
        </div>
      </form>
    </Modal>
  );
}

export function PaymentModal({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(invoice.balance);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const info = PAYMENT_METHODS.find((m) => m.value === method)!;
  const change = method === "cash" && Number(amount) > Number(invoice.balance) ? Number(amount) - Number(invoice.balance) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const pay = change > 0 ? invoice.balance : amount;
      onSaved(await api<Invoice>(`/invoices/${invoice.id}/pay/`, { method: "POST", body: { amount: pay, method, reference, notes } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Take payment · ${invoice.invoice_no}`} onClose={onClose} width="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
          <span className="text-sm text-muted">Balance due</span>
          <span className="text-xl font-extrabold tabular-nums text-navy">{formatMoney2(invoice.balance)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => { setMethod(m.value); setReference(""); }}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors ${method === m.value ? "border-primary " + m.color : "border-border text-muted hover:border-primary/40"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={method === "cash" ? "Amount received" : "Amount"}>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          {(info.needsRef || method === "card") && (
            <Field label={info.needsRef ? "Transaction ID" : "Card last 4 / slip no."}>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} required={info.needsRef} maxLength={method === "card" ? 40 : 100} autoComplete="off" />
            </Field>
          )}
        </div>
        {info.hint && <p className="-mt-2 text-xs text-muted">{info.hint}</p>}
        {change > 0 && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">Give change: {formatMoney2(change)}</p>}
        <Field label="Note">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success" loading={saving}>Record payment</Button>
        </div>
      </form>
    </Modal>
  );
}

export function RefundModal({ payment, onClose, onSaved }: { payment: PaymentRecord; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(payment.refundable);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState(payment.method === "sslcommerz" ? "bank_transfer" : payment.method);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/payments/${payment.id}/refund/`, { method: "POST", body: { amount, reason, method, reference } });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Refund ${payment.payment_no}`} onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-muted">
          {payment.method_label} payment of <strong className="text-foreground">{formatMoney2(payment.amount)}</strong>. Up to {formatMoney2(payment.refundable)} can be refunded.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Refund amount">
            <Input type="number" min="0.01" step="0.01" max={payment.refundable} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Paid back by">
            <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="e.g. Test not done, overpayment" />
        </Field>
        <Field label="Reference (optional)">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        {payment.method === "sslcommerz" && <p className="text-xs text-muted">Online payments are refunded from the SSLCommerz merchant panel or by bank; record it here once done.</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={saving}>Refund</Button>
        </div>
      </form>
    </Modal>
  );
}

export function DiscountModal({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const [type, setType] = useState(invoice.discount_type === "none" ? "percent" : invoice.discount_type);
  const [value, setValue] = useState(invoice.discount_type === "none" ? "" : invoice.discount_value);
  const [reason, setReason] = useState(invoice.discount_reason);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(remove = false) {
    setSaving(true);
    try {
      onSaved(await api<Invoice>(`/invoices/${invoice.id}/discount/`, { method: "POST", body: remove ? { discount_type: "none", discount_value: 0 } : { discount_type: type, discount_value: value || 0, discount_reason: reason } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Discount" onClose={onClose} width="max-w-md">
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="percent">Percent (%)</option>
              <option value="amount">Fixed amount</option>
            </Select>
          </Field>
          <Field label={type === "percent" ? "Percent" : "Amount"}>
            <Input type="number" min="0" step="0.01" max={type === "percent" ? 100 : invoice.subtotal} value={value} onChange={(e) => setValue(e.target.value)} required />
          </Field>
        </div>
        <Field label="Reason (kept on record)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="e.g. Poor patient fund, staff family" />
        </Field>
        <div className="flex justify-between gap-3">
          {invoice.discount_type !== "none" ? <Button type="button" variant="ghost" className="text-danger" onClick={() => save(true)}>Remove discount</Button> : <span />}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Apply</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
