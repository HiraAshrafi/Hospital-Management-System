"use client";

import {
  BedDouble,
  Check,
  Clock3,
  Globe,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Stethoscope,
  Unlink,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  RequestStatusBadge,
  ReviewHospitalRequestModal,
  type RequestDecision,
} from "@/components/hospitals/HospitalRequestReview";
import { HospitalFormModal } from "@/components/hospitals/HospitalFormModal";
import { FacebookIcon, InstagramIcon, XIcon } from "@/components/hospitals/SocialIcons";
import { Alert, Avatar, Badge, Button, ConfirmDialog, Modal, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { hospitalTypeLabel, otherPlatformLabel, REQUEST_TYPE_LABEL } from "@/lib/hospitals";
import type { Hospital, HospitalRequest, Paginated } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

function ExternalLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {href.replace(/^https?:\/\//, "")}
    </a>
  );
}

export function HospitalDetailModal({
  hospitalId,
  onClose,
  onChanged,
}: {
  hospitalId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [requests, setRequests] = useState<HospitalRequest[]>([]);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmRemoveManager, setConfirmRemoveManager] = useState(false);
  const [removingManager, setRemovingManager] = useState(false);
  const [review, setReview] = useState<{ hospitalRequest: HospitalRequest; decision: RequestDecision } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Hospital>(`/hospitals/${hospitalId}/`),
      api<Paginated<HospitalRequest>>(`/hospital-requests/${buildQuery({ hospital: hospitalId, page_size: 100 })}`),
    ])
      .then(([hospitalData, requestData]) => {
        if (cancelled) return;
        setHospital(hospitalData);
        setRequests(requestData.results);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [hospitalId, reloadKey]);

  function changed() {
    setReloadKey((key) => key + 1);
    onChanged();
  }

  async function removeManager() {
    setRemovingManager(true);
    try {
      await api(`/hospitals/${hospitalId}/remove_manager/`, { method: "POST" });
      setConfirmRemoveManager(false);
      changed();
    } catch (err) {
      setError(errorMessage(err));
      setConfirmRemoveManager(false);
    } finally {
      setRemovingManager(false);
    }
  }

  const links = hospital
    ? [
        { href: hospital.website, label: "Website", icon: <Globe className="h-4 w-4" /> },
        { href: hospital.facebook, label: "Facebook", icon: <FacebookIcon /> },
        { href: hospital.twitter, label: "Twitter / X", icon: <XIcon /> },
        { href: hospital.instagram, label: "Instagram", icon: <InstagramIcon /> },
        { href: hospital.other_link, label: otherPlatformLabel(hospital.other_platform), icon: <Link2 className="h-4 w-4" /> },
      ].filter((link) => link.href)
    : [];

  return (
    <>
      <Modal open title={hospital?.name ?? "Hospital details"} onClose={onClose} width="max-w-3xl">
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        {!hospital ? (
          !error && <div className="flex justify-center py-14"><Spinner /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone={hospital.is_active ? "success" : "danger"}>{hospital.is_active ? "Active" : "Inactive"}</Badge>
              <Badge tone="primary">{hospitalTypeLabel(hospital.hospital_type)}</Badge>
              <span>Added {formatDate(hospital.created_at)}</span>
              {hospital.created_by && <span>by {hospital.created_by.full_name || hospital.created_by.email}</span>}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Contact & location">
                <InfoRow icon={<Phone className="h-4 w-4" />}>
                  {hospital.phone || <span className="text-muted">No phone listed</span>}
                </InfoRow>
                <InfoRow icon={<Mail className="h-4 w-4" />}>
                  {hospital.email
                    ? <a href={`mailto:${hospital.email}`} className="text-primary hover:underline">{hospital.email}</a>
                    : <span className="text-muted">No email listed</span>}
                </InfoRow>
                <InfoRow icon={<MapPin className="h-4 w-4" />}>
                  {hospital.address || <span className="text-muted">No address listed</span>}
                </InfoRow>
              </Section>
              <Section title="Facility details">
                <InfoRow icon={<BedDouble className="h-4 w-4" />}>
                  {hospital.bed_capacity === null ? "Bed capacity not specified" : `${hospital.bed_capacity.toLocaleString()} beds`}
                </InfoRow>
                <InfoRow icon={<Clock3 className="h-4 w-4" />}>{hospital.operating_hours || "Hours not specified"}</InfoRow>
                <InfoRow icon={<Stethoscope className="h-4 w-4" />}>
                  {hospital.emergency_available ? "Emergency services available" : "No emergency service listed"}
                </InfoRow>
              </Section>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Services">
                {hospital.services.length
                  ? <div className="flex flex-wrap gap-2">{hospital.services.map((service) => <Badge key={service} tone="primary">{service}</Badge>)}</div>
                  : <p className="text-sm text-muted">No services listed.</p>}
              </Section>
              <Section title="Specialties">
                {hospital.specialties.length
                  ? <div className="flex flex-wrap gap-2">{hospital.specialties.map((specialty) => <Badge key={specialty} tone="accent">{specialty}</Badge>)}</div>
                  : <p className="text-sm text-muted">No specialties listed.</p>}
              </Section>
            </div>

            <Section title="Website & social">
              {links.length
                ? links.map((link) => (
                    <InfoRow key={link.label} icon={link.icon}>
                      <span className="mr-2 text-muted">{link.label}:</span><ExternalLink href={link.href} />
                    </InfoRow>
                  ))
                : <p className="text-sm text-muted">No links added.</p>}
            </Section>

            <Section title="Hospital manager">
              {hospital.manager ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={hospital.manager.full_name} email={hospital.manager.email} src={hospital.manager.avatar} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{hospital.manager.full_name || hospital.manager.email}</p>
                      <p className="truncate text-xs text-muted">
                        {hospital.manager.email} · assigned {formatDate(hospital.manager_assigned_at)}
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" className="px-3 py-1.5 text-danger" onClick={() => setConfirmRemoveManager(true)}>
                    <Unlink className="h-4 w-4" /> Remove manager
                  </Button>
                </div>
              ) : <p className="text-sm text-muted">No manager assigned.</p>}
            </Section>

            <Section title={`Management requests (${requests.length})`}>
              {requests.length === 0 ? (
                <p className="text-sm text-muted">No requests have been submitted for this hospital.</p>
              ) : (
                <ul className="space-y-2">
                  {requests.map((request) => (
                    <li key={request.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 text-sm">
                          <p className="font-medium">
                            {request.claimant_name} <span className="text-xs font-normal text-muted">· {request.user?.email ?? "account deleted"}</span>
                          </p>
                          <p className="text-xs text-muted">
                            {REQUEST_TYPE_LABEL[request.type]} · submitted {formatDate(request.created_at)}
                            {request.reviewed_by && ` · reviewed by ${request.reviewed_by.full_name || request.reviewed_by.email}`}
                          </p>
                          {request.admin_note && <p className="mt-1 text-xs">Note: {request.admin_note}</p>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RequestStatusBadge status={request.status} />
                          {request.status === "pending" && (
                            <>
                              <Button variant="ghost" className="px-2 py-1 text-success" title="Approve request" onClick={() => setReview({ hospitalRequest: request, decision: "approve" })}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" className="px-2 py-1 hover:text-danger" title="Reject request" onClick={() => setReview({ hospitalRequest: request, decision: "reject" })}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit hospital</Button>
            </div>
          </div>
        )}
      </Modal>

      {editing && hospital && (
        <HospitalFormModal
          hospital={hospital}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            changed();
          }}
        />
      )}
      <ConfirmDialog
        open={confirmRemoveManager}
        title="Remove hospital manager"
        message={<>Remove <strong>{hospital?.manager?.full_name || hospital?.manager?.email}</strong> as manager of <strong>{hospital?.name}</strong>?</>}
        confirmLabel="Remove manager"
        loading={removingManager}
        onConfirm={removeManager}
        onClose={() => setConfirmRemoveManager(false)}
      />
      {review && (
        <ReviewHospitalRequestModal
          hospitalRequest={review.hospitalRequest}
          decision={review.decision}
          onClose={() => setReview(null)}
          onDone={() => {
            setReview(null);
            changed();
          }}
        />
      )}
    </>
  );
}
