"use client";

import { ArrowLeft, Ban, CreditCard, Globe, Percent, Plus, Printer, Send, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AddItemsModal, DiscountModal, PaymentModal, RefundModal } from "@/components/billing/BillingModals";
import { BrandLogo, BRAND_TAGLINE } from "@/components/Brand";
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Input, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatDay, formatMoney2, INVOICE_STATUS } from "@/lib/hms";
import type { Invoice, PaymentRecord, TaxRate } from "@/lib/types";
import { useResource } from "@/lib/useList";

const RESULT: Record<string, { tone: "success" | "danger"; text: string }> = {
  success: { tone: "success", text: "Online payment received and confirmed with SSLCommerz." },
  failed: { tone: "danger", text: "The online payment did not go through. No money was taken for this invoice." },
  cancelled: { tone: "danger", text: "The online payment was cancelled." },
  pending: { tone: "danger", text: "The payment could not be confirmed yet. It will update when SSLCommerz notifies us." },
};

function TotalRow({ label, value, strong, tone }: { label: React.ReactNode; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between gap-6 py-1 ${strong ? "border-t border-border pt-2 text-base font-extrabold text-navy" : "text-sm"}`}>
      <span className={strong ? "" : "text-muted"}>{label}</span>
      <span className={`tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const { data: inv, setData, error, reload } = useResource<Invoice>(`/invoices/${id}/`);
  const taxes = useResource<TaxRate[]>("/tax-rates/");
  const [modal, setModal] = useState<"pay" | "items" | "discount" | "cancel" | "delete" | null>(null);
  const [refunding, setRefunding] = useState<PaymentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const result = params.get("payment");

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setActionError("");
    try {
      setData(await api<Invoice>(`/invoices/${id}/${path}`, { method: "POST", body }));
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function payOnline() {
    setBusy(true);
    setActionError("");
    try {
      const res = await api<{ gateway_url: string }>(`/invoices/${id}/pay_online/`, { method: "POST", body: {} });
      window.location.href = res.gateway_url;
    } catch (err) {
      setActionError(errorMessage(err));
      setBusy(false);
    }
  }

  async function removeItem(itemId: number) {
    try {
      setData(await api<Invoice>(`/invoices/${id}/items/${itemId}/`, { method: "DELETE" }));
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Billing</Link>
        <Alert>{error}</Alert>
      </div>
    );
  }
  if (!inv) return <div className="flex justify-center py-20"><Spinner /></div>;

  const st = INVOICE_STATUS[inv.status];
  const open = !["cancelled", "refunded"].includes(inv.status);
  const editable = !inv.is_locked && open;
  const balance = Number(inv.balance);

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All invoices</Link>
        <div className="flex flex-wrap gap-2">
          {inv.status === "draft" && can("billing.manage") && (
            <Button variant="secondary" loading={busy} onClick={() => act("issue/")}><Send className="h-4 w-4" /> Issue</Button>
          )}
          {open && balance > 0 && can("billing.collect") && (
            <>
              <Button variant="success" onClick={() => setModal("pay")}><CreditCard className="h-4 w-4" /> Take payment</Button>
              <Button variant="secondary" loading={busy} onClick={payOnline} title="Card, bKash, Nagad via SSLCommerz"><Globe className="h-4 w-4" /> Pay online</Button>
            </>
          )}
          {editable && can("billing.manage") && <Button variant="secondary" onClick={() => setModal("items")}><Plus className="h-4 w-4" /> Add items</Button>}
          {editable && can("billing.discount") && <Button variant="secondary" onClick={() => setModal("discount")}><Percent className="h-4 w-4" /> Discount</Button>}
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          {inv.status === "draft" && can("billing.manage") && (
            <Button variant="ghost" className="hover:text-danger" onClick={() => setModal("delete")} title="Delete draft"><Trash2 className="h-4 w-4" /></Button>
          )}
          {inv.status !== "draft" && open && can("billing.manage") && (
            <Button variant="ghost" className="hover:text-danger" onClick={() => setModal("cancel")} title="Cancel invoice"><Ban className="h-4 w-4" /></Button>
          )}
        </div>
      </div>
      {result && RESULT[result] && <div className="no-print"><Alert tone={RESULT[result].tone}>{RESULT[result].text}</Alert></div>}
      {actionError && <div className="no-print"><Alert>{actionError}</Alert></div>}

      <Card className="print-card mx-auto max-w-4xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary-bright to-accent-bright" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <BrandLogo size="lg" />
            <div className="sm:text-right">
              <p className="text-3xl font-extrabold tracking-tight text-navy">INVOICE</p>
              <p className="mt-1 font-mono text-sm font-semibold">{inv.invoice_no}</p>
              <p className="mt-1"><Badge tone={st.tone}>{st.label}</Badge></p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Bill to</p>
              <Link href={`/patients/${inv.patient}`} className="mt-1 block text-lg font-bold text-navy hover:text-primary">{inv.patient_info.full_name}</Link>
              <p className="text-sm text-muted">Patient ID {inv.patient_info.mrn}</p>
              {inv.patient_details.phone && <p className="text-sm text-muted">{inv.patient_details.phone}</p>}
              {inv.patient_details.address && <p className="text-sm text-muted">{inv.patient_details.address}</p>}
              {inv.admission_no && <p className="mt-1 text-sm text-muted">Admission {inv.admission_no}</p>}
            </div>
            <div className="text-sm sm:text-right">
              <p><span className="text-muted">Created</span> {formatDateTime(inv.created_at)}</p>
              {inv.issued_at && <p><span className="text-muted">Issued</span> {formatDateTime(inv.issued_at)}</p>}
              {inv.due_date && <p><span className="text-muted">Due</span> {formatDay(inv.due_date)}</p>}
              {inv.created_by_name && <p className="text-muted">Prepared by {inv.created_by_name}</p>}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b-2 border-navy/20 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Description</th>
                  <th className="py-2 pr-3 text-right font-semibold">Qty</th>
                  <th className="py-2 pr-3 text-right font-semibold">Unit price</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                  {editable && can("billing.manage") && <th className="no-print w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inv.items.map((it, i) => (
                  <tr key={it.id}>
                    <td className="py-2.5 pr-3 text-muted">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{it.description}</p>
                      <p className="text-xs text-muted">{it.category_label}{it.taxable && " · VAT"}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{Number(it.quantity)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney2(it.unit_price)}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{formatMoney2(it.line_total)}</td>
                    {editable && can("billing.manage") && (
                      <td className="no-print py-2.5 text-right">
                        <button onClick={() => removeItem(it.id)} className="rounded p-1 text-muted hover:text-danger" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    )}
                  </tr>
                ))}
                {inv.items.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted">No items yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:justify-between">
            <div className="max-w-sm text-sm text-muted">
              {inv.notes && <p className="whitespace-pre-line">{inv.notes}</p>}
              {inv.cancel_reason && <p className="mt-2 font-semibold text-danger">Cancelled: {inv.cancel_reason}</p>}
              {editable && can("billing.manage") && (
                <div className="no-print mt-3 max-w-[220px]">
                  <Field label="VAT">
                    <Select value={inv.tax_rate ?? ""} onChange={(e) => act("tax/", { tax_rate: e.target.value ? Number(e.target.value) : null })} disabled={busy}>
                      <option value="">No VAT</option>
                      {(taxes.data ?? []).filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name} ({Number(t.percent)}%)</option>)}
                    </Select>
                  </Field>
                </div>
              )}
            </div>
            <div className="w-full sm:w-80">
              <TotalRow label="Subtotal" value={formatMoney2(inv.subtotal)} />
              {Number(inv.discount_amount) > 0 && (
                <TotalRow
                  label={<>Discount{inv.discount_type === "percent" && ` (${Number(inv.discount_value)}%)`}<span className="block text-[11px]">{inv.discount_reason}{inv.discount_by_name && ` · by ${inv.discount_by_name}`}</span></>}
                  value={`− ${formatMoney2(inv.discount_amount)}`}
                  tone="text-success"
                />
              )}
              {Number(inv.tax_amount) > 0 && <TotalRow label={`VAT (${Number(inv.tax_percent)}%)`} value={formatMoney2(inv.tax_amount)} />}
              <TotalRow label="Total" value={formatMoney2(inv.total)} strong />
              <TotalRow label="Paid" value={formatMoney2(inv.amount_paid)} />
              {Number(inv.amount_refunded) > 0 && <TotalRow label="Refunded" value={`− ${formatMoney2(inv.amount_refunded)}`} tone="text-violet" />}
              <div className={`mt-2 flex justify-between rounded-xl px-4 py-3 ${balance > 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
                <span className="font-bold">Balance due</span>
                <span className="text-lg font-extrabold tabular-nums">{formatMoney2(inv.balance)}</span>
              </div>
            </div>
          </div>

          {inv.payments.length > 0 && (
            <div className="mt-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Payments</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {inv.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{p.method_label}{p.gateway_card_type && ` · ${p.gateway_card_type}`}</p>
                        <p className="text-xs text-muted">{p.payment_no}{p.reference && ` · Ref ${p.reference}`}{p.received_by_name && ` · ${p.received_by_name}`}</p>
                        {p.notes && <p className="text-xs text-danger">{p.notes}</p>}
                      </td>
                      <td className="py-2 pr-3 text-muted">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={p.status === "completed" ? "success" : p.status === "pending" ? "warning" : "danger"}>{p.status_label}</Badge>
                        {Number(p.amount_refunded) > 0 && <span className="ml-1 text-xs text-violet">−{formatMoney2(p.amount_refunded)} refunded</span>}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">{formatMoney2(p.amount)}</td>
                      <td className="no-print w-10 py-2 text-right">
                        {can("billing.refund") && Number(p.refundable) > 0 && (
                          <button onClick={() => setRefunding(p)} className="rounded p-1 text-muted hover:text-violet" title="Refund"><Undo2 className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-10 border-t border-border pt-4 text-center text-xs text-muted">
            Thank you for choosing AshrafiTech · {BRAND_TAGLINE}
          </div>
        </div>
      </Card>

      {modal === "pay" && <PaymentModal invoice={inv} onClose={() => setModal(null)} onSaved={(i) => { setData(i); setModal(null); }} />}
      {modal === "items" && <AddItemsModal invoice={inv} onClose={() => setModal(null)} onSaved={(i) => { setData(i); setModal(null); }} />}
      {modal === "discount" && <DiscountModal invoice={inv} onClose={() => setModal(null)} onSaved={(i) => { setData(i); setModal(null); }} />}
      {refunding && <RefundModal payment={refunding} onClose={() => setRefunding(null)} onSaved={() => { setRefunding(null); reload(); }} />}
      <ConfirmDialog
        open={modal === "cancel"}
        title="Cancel invoice"
        message={
          <div className="space-y-3">
            <p>Cancelled invoices stay on record. Their items become billable again. Invoices with payments must be refunded first.</p>
            <Field label="Reason">
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Created for the wrong patient" />
            </Field>
          </div>
        }
        confirmLabel="Cancel invoice"
        loading={busy}
        onConfirm={async () => {
          await act("cancel/", { reason: cancelReason });
          setModal(null);
        }}
        onClose={() => setModal(null)}
      />
      <ConfirmDialog
        open={modal === "delete"}
        title="Delete draft"
        message="Delete this draft invoice? Its items become billable again."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await api(`/invoices/${id}/`, { method: "DELETE" });
            router.push("/billing");
          } catch (err) {
            setActionError(errorMessage(err));
            setModal(null);
          }
        }}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
