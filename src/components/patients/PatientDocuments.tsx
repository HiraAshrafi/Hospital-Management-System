"use client";

import { FileImage, FileText, FolderOpen, Lock, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { Alert, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage, formatBytes, formatDate, openProtectedFile } from "@/lib/api";
import { DOCUMENT_CATEGORIES } from "@/lib/hms";
import type { PatientDocument } from "@/lib/types";
import { useResource } from "@/lib/useList";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

function UploadModal({ patientId, onClose, onUploaded }: { patientId: number; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("report");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a file.");
    if (file.size > 10 * 1024 * 1024) return setError("The file is larger than 10 MB.");
    const form = new FormData();
    form.append("patient", String(patientId));
    form.append("title", title.trim() || file.name.replace(/\.[^.]+$/, ""));
    form.append("category", category);
    form.append("notes", notes.trim());
    form.append("file", file);
    setSaving(true);
    setError("");
    try {
      await api("/patient-documents/", { method: "POST", body: form });
      onUploaded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Upload document" onClose={onClose} width="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-muted px-4 py-8 text-center hover:border-primary">
          <Upload className="h-6 w-6 text-primary" />
          <span className="text-sm font-semibold">{file ? file.name : "Choose a PDF or image"}</span>
          <span className="text-xs text-muted">{file ? formatBytes(file.size) : "PDF, PNG, JPG or WEBP · up to 10 MB"}</span>
          <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file?.name.replace(/\.[^.]+$/, "") ?? "e.g. CBC report"} />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Lock className="h-3.5 w-3.5" /> Stored privately. Only staff allowed to see medical records can open it, and every download is logged.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function PatientDocuments({ patientId }: { patientId: number }) {
  const { can } = useAuth();
  const canEdit = can("patients.update");
  const { data, error, reload } = useResource<PatientDocument[]>(`/patient-documents/?patient=${patientId}`);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<PatientDocument | null>(null);
  const [actionError, setActionError] = useState("");

  async function open(doc: PatientDocument) {
    setActionError("");
    try {
      await openProtectedFile(`/patient-documents/${doc.id}/download/`);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/patient-documents/${deleting.id}/`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Documents"
        subtitle="Reports, scans, IDs and consent forms"
        action={
          canEdit && (
            <Button variant="secondary" className="px-3 py-1.5" onClick={() => setUploading(true)}>
              <Upload className="h-4 w-4" /> Upload
            </Button>
          )
        }
      />
      <div className="px-5 pb-5">
        {(error || actionError) && <Alert>{error || actionError}</Alert>}
        {!data ? (
          <Spinner />
        ) : data.length === 0 ? (
          <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="No documents yet">
            {canEdit ? "Upload lab reports, scans or ID documents." : ""}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((doc) => {
              const Icon = doc.extension === "pdf" ? FileText : FileImage;
              return (
                <li key={doc.id} className="flex items-start gap-3 rounded-xl border border-border p-3 hover:border-primary/40">
                  <button onClick={() => open(doc)} className="flex min-w-0 flex-1 items-start gap-3 text-left" title="Open">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${doc.extension === "pdf" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold hover:text-primary">{doc.title}</span>
                      <span className="mt-0.5 block">
                        <Badge tone="neutral">{doc.category_label}</Badge>
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {formatDate(doc.created_at)} · {formatBytes(doc.size)} · {doc.extension.toUpperCase()}
                      </span>
                      {doc.uploaded_by_name && <span className="block text-[11px] text-muted">By {doc.uploaded_by_name}</span>}
                    </span>
                  </button>
                  {canEdit && (
                    <Button variant="ghost" className="px-2 py-1 hover:text-danger" title="Delete" onClick={() => setDeleting(doc)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {uploading && (
        <UploadModal
          patientId={patientId}
          onClose={() => setUploading(false)}
          onUploaded={() => {
            setUploading(false);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete document"
        message={<>Delete <strong>{deleting?.title}</strong>? The file is removed permanently.</>}
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}
