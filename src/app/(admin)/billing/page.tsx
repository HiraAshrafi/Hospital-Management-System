"use client";

import { AlertCircle, Banknote, FileText, Plus, ReceiptText, RotateCcw, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NewInvoiceModal } from "@/components/billing/BillingModals";
import { Alert, Avatar, Badge, Button, Card, EmptyState, Input, Pagination, Spinner, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { formatDay, formatMoney2, INVOICE_STATUS } from "@/lib/hms";
import type { BillingStats, InvoiceSummary } from "@/lib/types";
import { useDebounced, useList, usePage, useResource } from "@/lib/useList";

const PAGE_SIZE = 12;
type Tab = "" | "due" | "overdue" | "paid" | "draft" | "cancelled";

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string; tone: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <p className="text-sm font-semibold text-muted">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("due");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const [page, setPage] = usePage(tab, search);
  const [creating, setCreating] = useState(false);
  const stats = useResource<BillingStats>("/invoices/stats/");
  const { data, error } = useList<InvoiceSummary>("/invoices/", {
    page, page_size: PAGE_SIZE, search,
    due: tab === "due" ? true : undefined,
    overdue: tab === "overdue" ? true : undefined,
    status: tab === "paid" || tab === "draft" || tab === "cancelled" ? tab : undefined,
    ordering: tab === "due" || tab === "overdue" ? "due_date" : "-created_at",
  });
  const s = stats.data;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Banknote} label="Collected today" value={s ? formatMoney2(s.collected_today) : "…"} tone="bg-accent-soft text-accent" />
        <Kpi icon={Wallet} label="Collected this month" value={s ? formatMoney2(s.collected_month) : "…"} hint={s?.by_method.map((m) => `${m.label} ${formatMoney2(m.amount)}`).join(" · ")} tone="bg-primary-soft text-primary" />
        <Kpi icon={AlertCircle} label="Outstanding dues" value={s ? formatMoney2(s.outstanding) : "…"} hint={s ? `${s.due_count} unpaid invoice(s) · ${s.overdue_count} overdue` : ""} tone="bg-danger-soft text-danger" />
        <Kpi icon={RotateCcw} label="Refunded this month" value={s ? formatMoney2(s.refunded_month) : "…"} hint={s ? `${s.draft_count} draft invoice(s)` : ""} tone="bg-violet-soft text-violet" />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Tabs
            label="Invoices"
            value={tab}
            onChange={setTab}
            options={[
              { value: "due", label: "Unpaid" },
              { value: "overdue", label: "Overdue" },
              { value: "paid", label: "Paid" },
              { value: "draft", label: "Drafts" },
              { value: "cancelled", label: "Cancelled" },
              { value: "", label: "All" },
            ]}
          />
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Invoice no., patient, ID, phone" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
          </div>
        </div>
        {can("billing.manage") && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        )}
      </div>

      {(error || stats.error) && <Alert>{error || stats.error}</Alert>}
      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : data.results.length === 0 ? (
          <EmptyState icon={<ReceiptText className="h-6 w-6" />} title="No invoices here">
            {tab === "due" ? "Nothing waiting for payment." : "Try another tab."}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-surface-muted text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Invoice</th>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                    <th className="px-5 py-3 text-right font-semibold">Paid</th>
                    <th className="px-5 py-3 text-right font-semibold">Balance</th>
                    <th className="px-5 py-3 font-semibold">Due</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((inv) => {
                    const st = INVOICE_STATUS[inv.status];
                    const overdue = ["issued", "partially_paid"].includes(inv.status) && inv.due_date && inv.due_date < today;
                    return (
                      <tr key={inv.id} className="cursor-pointer hover:bg-surface-muted" onClick={() => router.push(`/billing/${inv.id}`)}>
                        <td className="px-5 py-3">
                          <Link href={`/billing/${inv.id}`} className="flex items-center gap-2 font-semibold hover:text-primary" onClick={(e) => e.stopPropagation()}>
                            <FileText className="h-4 w-4 text-muted" /> {inv.invoice_no}
                          </Link>
                          <p className="text-xs text-muted">{formatDay(inv.created_at.slice(0, 10))} · {inv.item_count} item(s)</p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={inv.patient_info.full_name} email={inv.patient_info.mrn} size={32} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{inv.patient_info.full_name}</p>
                              <p className="text-xs text-muted">{inv.patient_info.mrn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatMoney2(inv.total)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted">{formatMoney2(inv.net_paid)}</td>
                        <td className={`px-5 py-3 text-right font-bold tabular-nums ${Number(inv.balance) > 0 ? "text-danger" : "text-success"}`}>{formatMoney2(inv.balance)}</td>
                        <td className={`whitespace-nowrap px-5 py-3 ${overdue ? "font-semibold text-danger" : "text-muted"}`}>{inv.due_date ? formatDay(inv.due_date) : "—"}</td>
                        <td className="px-5 py-3">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {overdue && <p className="mt-1 text-xs font-semibold text-danger">Overdue</p>}
                        </td>
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
      {creating && <NewInvoiceModal onClose={() => setCreating(false)} onSaved={(inv) => router.push(`/billing/${inv.id}`)} />}
    </div>
  );
}
