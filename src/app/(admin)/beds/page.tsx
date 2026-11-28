"use client";

import { BedDouble, BrushCleaning, Bookmark, LogIn, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AdmitModal } from "@/components/admissions/AdmissionModals";
import { Alert, Badge, Button, buttonClass, Card, EmptyState, Modal, Spinner, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { BED_STATUS, doctorName, formatDateTime, formatMoney } from "@/lib/hms";
import type { Bed, BedStatus, BoardWard } from "@/lib/types";
import { useResource } from "@/lib/useList";

function BedTile({ bed, onClick }: { bed: Bed; onClick: () => void }) {
  const st = BED_STATUS[bed.status];
  const o = bed.occupant;
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[92px] flex-col rounded-xl border-2 p-2.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md ${st.tile}`}
      title={`${bed.ward_name} · Bed ${bed.number} · ${st.label}`}
    >
      <span className="flex items-center justify-between gap-1">
        <span className="text-sm font-extrabold">{bed.number}</span>
        <BedDouble className="h-4 w-4 opacity-70" />
      </span>
      {o ? (
        <span className="mt-1 min-w-0">
          <span className="block truncate text-xs font-bold text-foreground">{o.patient_name}</span>
          <span className="block truncate text-[11px] text-muted">
            {o.age ?? "—"}y · day {o.days}
            {o.admission_type === "emergency" && " · ER"}
          </span>
        </span>
      ) : (
        <span className="mt-auto text-[11px] font-semibold">{st.label}</span>
      )}
    </button>
  );
}

export default function BedBoardPage() {
  const { can } = useAuth();
  const [scope, setScope] = useState<"all" | "icu">("all");
  const { data, error, reload } = useResource<BoardWard[]>(`/beds/board/${scope === "icu" ? "?icu=1" : ""}`);
  const [selected, setSelected] = useState<Bed | null>(null);
  const [admitTo, setAdmitTo] = useState<Bed | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const totals = (data ?? []).reduce(
    (t, w) => {
      for (const b of w.beds) t[b.status] = (t[b.status] ?? 0) + 1;
      t.total += w.beds.length;
      return t;
    },
    { total: 0 } as Record<string, number>,
  );

  async function setStatus(bed: Bed, status: BedStatus) {
    setBusy(true);
    setActionError("");
    try {
      await api(`/beds/${bed.id}/set_status/`, { method: "POST", body: { status } });
      setSelected(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs label="Scope" value={scope} onChange={setScope} options={[{ value: "all", label: "All wards" }, { value: "icu", label: "ICU & critical care" }]} />
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(BED_STATUS).map(([key, s]) => (
            <span key={key} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${s.tile}`}>
              {s.label} · {totals[key] ?? 0}
            </span>
          ))}
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 font-semibold text-navy">
            {totals.total} beds · {totals.total ? Math.round(((totals.occupied ?? 0) / totals.total) * 100) : 0}% occupied
          </span>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {!data ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState icon={<BedDouble className="h-6 w-6" />} title="No wards set up yet">
            {can("wards.manage") ? <Link href="/wards" className="font-semibold text-primary">Add wards and beds</Link> : "Ask an administrator to set up wards."}
          </EmptyState>
        </Card>
      ) : (
        data.map((w) => (
          <Card key={w.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-navy">
                  {w.name} {w.is_icu && <Badge tone="danger">Critical care</Badge>}
                </h2>
                <p className="text-xs text-muted">
                  {w.ward_type_label} · {w.floor || "floor not set"} · {formatMoney(w.daily_rate)}/day
                  {w.gender !== "any" && ` · ${w.gender === "male" ? "Male" : "Female"} only`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-navy">
                  {w.occupied}/{w.beds.length} occupied
                </span>
                <div className="h-2 w-28 rounded-full bg-chart-track">
                  <div className={`h-2 rounded-full ${w.is_icu ? "bg-danger" : "bg-primary"}`} style={{ width: `${w.beds.length ? (w.occupied / w.beds.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 p-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
              {w.beds.map((b) => (
                <BedTile key={b.id} bed={b} onClick={() => { setSelected(b); setActionError(""); }} />
              ))}
              {w.beds.length === 0 && <p className="col-span-full text-sm text-muted">No beds in this ward.</p>}
            </div>
          </Card>
        ))
      )}

      {selected && (
        <Modal open title={`${selected.ward_name} · Bed ${selected.number}`} onClose={() => setSelected(null)} width="max-w-md">
          <div className="space-y-4">
            {actionError && <Alert>{actionError}</Alert>}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={BED_STATUS[selected.status].tone}>{BED_STATUS[selected.status].label}</Badge>
              <span className="text-muted">{selected.bed_type_label} · {formatMoney(selected.effective_rate)}/day</span>
            </div>
            {selected.features && <p className="text-sm text-muted">{selected.features}</p>}

            {selected.occupant ? (
              <div className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-muted" /> {selected.occupant.patient_name}</p>
                <p className="mt-1 text-sm text-muted">
                  {selected.occupant.mrn} · {selected.occupant.admission_no} · day {selected.occupant.days}
                </p>
                <p className="text-sm text-muted">{doctorName(selected.occupant.doctor_name)} · since {formatDateTime(selected.occupant.admitted_at)}</p>
                <Link href={`/admissions/${selected.occupant.admission_id}`} className={buttonClass("primary", "mt-3 w-full")}>
                  Open admission
                </Link>
              </div>
            ) : (
              can("admissions.manage") && (
                <div className="grid gap-2">
                  {(selected.status === "available" || selected.status === "reserved") && (
                    <Button onClick={() => { setAdmitTo(selected); setSelected(null); }}>
                      <LogIn className="h-4 w-4" /> Admit a patient to this bed
                    </Button>
                  )}
                  {selected.status === "cleaning" && (
                    <Button variant="success" loading={busy} onClick={() => setStatus(selected, "available")}>
                      <BrushCleaning className="h-4 w-4" /> Cleaned, mark available
                    </Button>
                  )}
                  {selected.status === "available" && (
                    <Button variant="secondary" loading={busy} onClick={() => setStatus(selected, "reserved")}>
                      <Bookmark className="h-4 w-4" /> Reserve
                    </Button>
                  )}
                  {selected.status === "reserved" && (
                    <Button variant="secondary" loading={busy} onClick={() => setStatus(selected, "available")}>Release reservation</Button>
                  )}
                  {selected.status !== "maintenance" ? (
                    <Button variant="ghost" loading={busy} onClick={() => setStatus(selected, "maintenance")}>
                      <Wrench className="h-4 w-4" /> Take out of service
                    </Button>
                  ) : (
                    <Button variant="success" loading={busy} onClick={() => setStatus(selected, "available")}>Back in service</Button>
                  )}
                </div>
              )
            )}
          </div>
        </Modal>
      )}
      {admitTo && (
        <AdmitModal
          presetBed={admitTo}
          emergency={["icu", "ccu", "hdu", "emergency"].includes(admitTo.ward_type)}
          onClose={() => setAdmitTo(null)}
          onSaved={() => {
            setAdmitTo(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
