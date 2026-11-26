"use client";

import { Check, Copy, Eye, EyeOff, RefreshCw, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, API_URL, buildQuery, errorMessage } from "@/lib/api";
import { AMBULANCE_TYPES, SUGGESTED_RATES } from "@/lib/ambulances";
import type { Ambulance, AmbulanceStatus, AmbulanceType, Hospital, Paginated } from "@/lib/types";

function Section({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted">{children}</h3>;
}

/** Device token panel: what the driver's phone / GPS tracker needs to send live locations. */
function TrackingSetup({ ambulance, onChange }: { ambulance: Ambulance; onChange: (a: Ambulance) => void }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(ambulance.tracking_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setShow(true);
    }
  }

  async function regenerate() {
    if (!window.confirm("Issue a new token? The driver's device stops updating until it is given the new one.")) return;
    setBusy(true);
    setError("");
    try {
      onChange(await api<Ambulance>(`/ambulances/${ambulance.id}/regenerate_token/`, { method: "POST" }));
      setShow(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="h-4 w-4 text-primary" /> Live tracking device
      </p>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Input readOnly value={show ? ambulance.tracking_token : "•".repeat(24)} className="font-mono text-xs" aria-label="Tracking token" />
        <Button type="button" variant="secondary" className="px-3" onClick={() => setShow((v) => !v)} title={show ? "Hide" : "Show"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="secondary" className="px-3" onClick={copy} title="Copy">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="secondary" className="px-3" onClick={regenerate} loading={busy} title="New token">
          {!busy && <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted">The driver&apos;s phone app or GPS tracker sends its position every 5–10 seconds:</p>
      <pre className="overflow-x-auto rounded-lg bg-foreground p-3 text-[11px] leading-relaxed text-white">
        {`POST ${API_URL}/tracking/ping/
X-Tracking-Token: <token above>
Content-Type: application/json

{"latitude": 23.8103, "longitude": 90.4125, "speed_kmh": 30}`}
      </pre>
    </div>
  );
}

export function AmbulanceFormModal({
  ambulance,
  onClose,
  onSaved,
}: {
  ambulance: Ambulance | null;
  onClose: () => void;
  onSaved: (a: Ambulance) => void;
}) {
  const [current, setCurrent] = useState(ambulance);
  const isEdit = current !== null;
  const [vehicleNo, setVehicleNo] = useState(ambulance?.vehicle_no ?? "");
  const [type, setType] = useState<AmbulanceType>(ambulance?.type ?? "basic");
  const [driverName, setDriverName] = useState(ambulance?.driver_name ?? "");
  const [driverPhone, setDriverPhone] = useState(ambulance?.driver_phone ?? "");
  const [driverLicense, setDriverLicense] = useState(ambulance?.driver_license ?? "");
  const [baseHospital, setBaseHospital] = useState(ambulance?.base_hospital ? String(ambulance.base_hospital) : "");
  const [baseFare, setBaseFare] = useState(ambulance ? String(Number(ambulance.base_fare)) : "");
  const [perKm, setPerKm] = useState(ambulance ? String(Number(ambulance.per_km_rate)) : "");
  const [minFare, setMinFare] = useState(ambulance ? String(Number(ambulance.min_fare)) : "");
  const [status, setStatus] = useState<AmbulanceStatus>(ambulance?.status ?? "available");
  const [notes, setNotes] = useState(ambulance?.notes ?? "");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const suggested = SUGGESTED_RATES[type];

  useEffect(() => {
    api<Paginated<Hospital>>(`/hospitals/${buildQuery({ page_size: 100, ordering: "name" })}`)
      .then((res) => setHospitals(res.results.filter((h) => h.latitude !== null)))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = {
      vehicle_no: vehicleNo.trim(),
      type,
      driver_name: driverName.trim(),
      driver_phone: driverPhone.trim(),
      driver_license: driverLicense.trim(),
      base_hospital: baseHospital ? Number(baseHospital) : null,
      notes,
    };
    // Empty rates on a new ambulance → the backend applies the suggested rates for its type.
    if (baseFare !== "") body.base_fare = baseFare;
    if (perKm !== "") body.per_km_rate = perKm;
    if (minFare !== "") body.min_fare = minFare;
    if (isEdit && status !== current.status) body.status = status;
    try {
      const saved = isEdit
        ? await api<Ambulance>(`/ambulances/${current.id}/`, { method: "PATCH", body })
        : await api<Ambulance>("/ambulances/", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={isEdit ? `Edit ${current.vehicle_no}` : "Add ambulance"} onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Section>Vehicle</Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle number">
            <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="Dhaka Metro-Cha 11-2345" required />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as AmbulanceType)}>
              {AMBULANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Base hospital">
            <Select value={baseHospital} onChange={(e) => setBaseHospital(e.target.value)}>
              <option value="">None</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          {isEdit && (
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as AmbulanceStatus)}>
                <option value="available">Available</option>
                <option value="offline">Off duty</option>
                <option value="maintenance">Maintenance</option>
                <option value="on_trip" disabled>
                  On trip (set by dispatching)
                </option>
              </Select>
            </Field>
          )}
        </div>

        <Section>Driver</Section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Driver name">
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} required />
          </Field>
          <Field label="Driver phone">
            <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} type="tel" placeholder="+880 1XXX XXXXXX" />
          </Field>
          <Field label="Driving licence no.">
            <Input value={driverLicense} onChange={(e) => setDriverLicense(e.target.value)} />
          </Field>
        </div>

        <Section>Pricing (৳)</Section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Base fare">
            <Input type="number" min={0} step="1" value={baseFare} onChange={(e) => setBaseFare(e.target.value)} placeholder={String(suggested.base)} />
          </Field>
          <Field label="Per km">
            <Input type="number" min={0} step="1" value={perKm} onChange={(e) => setPerKm(e.target.value)} placeholder={String(suggested.perKm)} />
          </Field>
          <Field label="Minimum fare">
            <Input type="number" min={0} step="1" value={minFare} onChange={(e) => setMinFare(e.target.value)} placeholder={String(suggested.min)} />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-muted">
          Fare = base fare + per km × road distance, never below the minimum. 20% extra from 10 PM to 6 AM. Rounded to ৳10.
          {!isEdit && " Leave empty to use the suggested rates for this type."}
        </p>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Equipment, oxygen cylinders, etc." />
        </Field>

        {current && <TrackingSetup ambulance={current} onChange={setCurrent} />}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Add ambulance"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
