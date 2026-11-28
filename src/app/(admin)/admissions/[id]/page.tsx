"use client";

import { ArrowLeft, ArrowRightLeft, BedDouble, LogOut, Pencil, Printer, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DischargeModal, TransferModal } from "@/components/admissions/AdmissionModals";
import { BrandLogo } from "@/components/Brand";
import { SimpleFormModal } from "@/components/SimpleFormModal";
import { Alert, Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery, errorMessage } from "@/lib/api";
import { ADMISSION_STATUS, doctorName, formatDateTime, formatDay, formatMoney, GENDER_LABEL } from "@/lib/hms";
import type { Admission, AdmissionCharges, Doctor, Paginated } from "@/lib/types";
import { useResource } from "@/lib/useList";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="whitespace-pre-line">{value || "—"}</span>
    </div>
  );
}

export default function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data: a, error, reload } = useResource<Admission>(`/admissions/${id}/`);
  const charges = useResource<AdmissionCharges>(`/admissions/${id}/charges/`);
  const [modal, setModal] = useState<"transfer" | "discharge" | "edit" | "cancel" | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (modal !== "edit" || doctors.length) return;
    api<Paginated<Doctor>>(`/doctors/${buildQuery({ page_size: 100 })}`).then((r) => setDoctors(r.results)).catch(() => {});
  }, [modal, doctors.length]);

  const refresh = () => {
    reload();
    charges.reload();
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/admissions" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Admissions</Link>
        <Alert>{error}</Alert>
      </div>
    );
  }
  if (!a) return <div className="flex justify-center py-20"><Spinner /></div>;

  const st = ADMISSION_STATUS[a.status];
  const active = a.status === "admitted";
  const manage = can("admissions.manage");

  return (
    <div className="space-y-5">
      <Link href="/admissions" className="no-print inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> All admissions
      </Link>
      {actionError && <Alert>{actionError}</Alert>}

      {/* Print-only letterhead */}
      <div className="hidden print:block">
        <BrandLogo size="lg" />
        <h1 className="mt-6 text-2xl font-extrabold text-navy">{a.status === "admitted" ? "Admission record" : "Discharge summary"}</h1>
      </div>

      <Card className="print-card overflow-hidden">
        <div className={`h-1.5 ${a.is_icu ? "bg-gradient-to-r from-danger to-[#ff6b6f]" : "bg-gradient-to-r from-primary to-primary-bright"}`} />
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={a.patient_info.full_name} email={a.patient_info.mrn} size={60} />
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-navy">
                <Link href={`/patients/${a.patient}`} className="hover:text-primary">{a.patient_info.full_name}</Link>
                <Badge tone={st.tone}>{st.label}</Badge>
                {a.is_icu && active && <Badge tone="danger">ICU</Badge>}
                {a.admission_type === "emergency" && <Badge tone="danger">Emergency</Badge>}
              </h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono font-semibold text-foreground">{a.admission_no}</span> · {a.patient_info.mrn} ·{" "}
                {a.patient_info.age ?? "—"} yrs · {GENDER_LABEL[a.patient_info.gender]}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {doctorName(a.doctor_info.full_name)} · {a.department_name || a.doctor_info.department_name} · {a.length_of_stay_days} day
                {a.length_of_stay_days === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {active && manage && (
              <>
                <Button variant="success" onClick={() => setModal("discharge")}>
                  <LogOut className="h-4 w-4" /> Discharge
                </Button>
                <Button variant="secondary" onClick={() => setModal("transfer")}>
                  <ArrowRightLeft className="h-4 w-4" /> Transfer bed
                </Button>
              </>
            )}
            {manage && a.status !== "cancelled" && (
              <Button variant="secondary" onClick={() => setModal("edit")} title="Edit details">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button variant="secondary" onClick={() => window.print()} title="Print">
              <Printer className="h-4 w-4" />
            </Button>
            {active && manage && (
              <Button variant="ghost" className="hover:text-danger" onClick={() => setModal("cancel")} title="Cancel admission (made by mistake)">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {active && a.bed_label && (
          <div className="flex items-center gap-3 border-t border-border bg-surface-muted px-5 py-3 text-sm">
            <BedDouble className="h-5 w-5 text-primary" />
            Now in <strong>{a.bed_label}</strong>
            {a.expected_discharge && <span className="text-muted">· expected discharge {formatDay(a.expected_discharge)}</span>}
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="print-card">
            <CardHeader title="Admission details" />
            <div className="divide-y divide-border px-5 pb-4">
              <Row label="Admitted" value={`${formatDateTime(a.admitted_at)} · ${a.type_label}`} />
              <Row label="Reason" value={a.reason} />
              <Row label="Provisional diagnosis" value={a.diagnosis} />
              <Row label="Guardian" value={[a.guardian_name, a.guardian_relation, a.guardian_phone].filter(Boolean).join(" · ")} />
              <Row label="Notes" value={a.notes} />
              <Row label="Admitted by" value={a.created_by_name} />
            </div>
          </Card>

          {a.status !== "admitted" && a.status !== "cancelled" && (
            <Card className="print-card">
              <CardHeader title="Discharge summary" subtitle={`${formatDateTime(a.discharged_at)} · ${a.discharge_type_label}`} />
              <div className="divide-y divide-border px-5 pb-4">
                <Row label="Final diagnosis" value={a.final_diagnosis} />
                <Row label="Summary" value={a.discharge_summary} />
                <Row label="Instructions" value={a.discharge_instructions} />
                <Row label="Follow-up" value={a.follow_up_date ? formatDay(a.follow_up_date) : ""} />
                <Row label="Discharged by" value={a.discharged_by_name} />
              </div>
            </Card>
          )}
        </div>

        <Card className="print-card h-fit">
          <CardHeader title="Bed history & charges" subtitle="Billed per night; a move-day counts once" />
          <div className="px-5 pb-5">
            {!charges.data ? (
              <Spinner />
            ) : (
              <>
                <ol className="relative space-y-4 border-l-2 border-border pl-5">
                  {charges.data.stays.map((s, i) => (
                    <li key={s.id} className="relative">
                      <span className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-surface ${s.ended_at ? "bg-muted" : "bg-primary"}`} />
                      <p className="text-sm font-semibold">{s.bed_label}</p>
                      <p className="text-xs text-muted">
                        {s.reason_label} · {formatDateTime(s.started_at)}
                        {s.ended_at ? ` → ${formatDateTime(s.ended_at)}` : " → now"}
                      </p>
                      <p className="text-xs text-muted">
                        {formatMoney(s.daily_rate)}/night · {charges.data!.lines[i]?.nights ?? s.nights} night(s)
                        {s.notes && ` · ${s.notes}`}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3">
                  <span className="text-sm font-semibold text-primary">Bed charges · {charges.data.days} day(s)</span>
                  <span className="text-lg font-extrabold tabular-nums text-navy">{formatMoney(charges.data.total)}</span>
                </div>
                <p className="mt-2 text-xs text-muted">Medicines, tests and procedures are added on the invoice.</p>
              </>
            )}
          </div>
        </Card>
      </div>

      {modal === "transfer" && <TransferModal admission={a} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === "discharge" && <DischargeModal admission={a} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === "edit" && (
        <SimpleFormModal
          title="Edit admission details"
          width="max-w-2xl"
          fields={[
            { name: "doctor", label: "Consultant", type: "select", required: true, span: 1, options: doctors.map((d) => ({ value: String(d.id), label: doctorName(d.full_name) })) },
            { name: "expected_discharge", label: "Expected discharge", type: "date", span: 1 },
            { name: "reason", label: "Reason / chief complaint", required: true },
            { name: "diagnosis", label: "Provisional diagnosis", type: "textarea" },
            { name: "guardian_name", label: "Guardian", span: 1 },
            { name: "guardian_phone", label: "Guardian phone", span: 1 },
            { name: "notes", label: "Notes", type: "textarea" },
            ...(a.status === "admitted"
              ? []
              : [
                  { name: "final_diagnosis", label: "Final diagnosis", type: "textarea" as const },
                  { name: "discharge_summary", label: "Discharge summary", type: "textarea" as const },
                  { name: "discharge_instructions", label: "Instructions", type: "textarea" as const },
                  { name: "follow_up_date", label: "Follow-up date", type: "date" as const, span: 1 as const },
                ]),
          ]}
          initial={{ ...a, doctor: String(a.doctor) } as unknown as Record<string, unknown>}
          path={`/admissions/${a.id}/`}
          method="PATCH"
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={modal === "cancel"}
        title="Cancel admission"
        message={
          <div className="space-y-3">
            <p>Only for an admission made by mistake (within 24 hours). The bed is freed and no bed charges apply.</p>
            <Field label="Reason">
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Wrong patient selected" />
            </Field>
          </div>
        }
        confirmLabel="Cancel admission"
        onConfirm={async () => {
          try {
            await api(`/admissions/${a.id}/cancel/`, { method: "POST", body: { reason: cancelReason } });
            refresh();
          } catch (err) {
            setActionError(errorMessage(err));
          } finally {
            setModal(null);
          }
        }}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
