"use client";

import { useState } from "react";

import { Alert, Badge, Button, Field, Modal, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { REQUEST_STATUS, REQUEST_TYPE_LABEL } from "@/lib/hospitals";
import type { HospitalRequest, RequestStatus } from "@/lib/types";

export type RequestDecision = "approve" | "reject";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { label, tone } = REQUEST_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function ReviewHospitalRequestModal({
  hospitalRequest,
  decision,
  onClose,
  onDone,
}: {
  hospitalRequest: HospitalRequest;
  decision: RequestDecision;
  onClose: () => void;
  onDone: (hospitalRequest: HospitalRequest) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const approving = decision === "approve";
  const who = (
    <strong>
      {hospitalRequest.claimant_name}
      {hospitalRequest.user ? ` (${hospitalRequest.user.email})` : ""}
    </strong>
  );
  const hospitalName = hospitalRequest.hospital.name;
  const isNewHospital = hospitalRequest.type === "new_hospital";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onDone(await api<HospitalRequest>(
        `/hospital-requests/${hospitalRequest.id}/${decision}/`,
        { method: "POST", body: { note } },
      ));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`${approving ? "Approve" : "Reject"} hospital request`} onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="space-y-2 text-sm text-muted">
          <p>
            {who} submitted a <strong>{REQUEST_TYPE_LABEL[hospitalRequest.type].toLowerCase()}</strong> for{" "}
            <strong>{hospitalName}</strong>.
          </p>
          {approving && isNewHospital && (
            <p>Approving this request will assign the manager and make the hospital active in the directory.</p>
          )}
          {approving && !isNewHospital && <p>Approving will assign this person as the hospital manager.</p>}
          {approving && <p>Other pending requests for this hospital will be closed.</p>}
          {!approving && <p>This request will be rejected and remain in the review history.</p>}
        </div>
        <Field label="Review note (optional)">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            placeholder={approving ? "Add verification notes" : "Reason for rejecting"}
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={approving ? "primary" : "danger"} loading={saving}>
            {approving ? "Approve request" : "Reject request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
