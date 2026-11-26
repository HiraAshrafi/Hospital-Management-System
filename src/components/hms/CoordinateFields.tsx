"use client";

import { MapPin } from "lucide-react";

import { Field, Input } from "@/components/ui";

/** Latitude / longitude inputs. Filled automatically when adding from the Map page. */
export function CoordinateFields({
  latitude,
  longitude,
  onChange,
}: {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
}) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Latitude">
          <Input type="number" step="0.000001" min={-90} max={90} value={latitude} onChange={(e) => onChange(e.target.value, longitude)} placeholder="23.810300" />
        </Field>
        <Field label="Longitude">
          <Input type="number" step="0.000001" min={-180} max={180} value={longitude} onChange={(e) => onChange(latitude, e.target.value)} placeholder="90.412500" />
        </Field>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <MapPin className="h-3.5 w-3.5" /> Click a spot on the Map page to fill these in. Leave both empty to keep it off the map.
      </p>
    </div>
  );
}

/** Coordinates for the API: both values or both null. */
export function coordinateBody(latitude: string, longitude: string) {
  const round = (v: string) => (v.trim() === "" ? null : Number(v).toFixed(6));
  return { latitude: round(latitude), longitude: round(longitude) };
}
