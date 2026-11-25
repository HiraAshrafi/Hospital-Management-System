"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { initials } from "@/lib/api";

const openModals: symbol[] = [];

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-surface text-foreground border border-border hover:bg-background",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-muted hover:bg-background hover:text-foreground",
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const controlClass =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${controlClass} resize-y ${props.className ?? ""}`} />;
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-surface ${className}`}>{children}</div>;
}

export function Badge({ tone, children }: { tone: "success" | "danger" | "primary" | "accent"; children: React.ReactNode }) {
  const tones = {
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-warning",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Avatar({ name, email, src, size = 36 }: { name: string; email: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name || email} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name, email)}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-6 w-6 animate-spin text-primary ${className}`} />;
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success"; children: React.ReactNode }) {
  const style = tone === "danger" ? "bg-danger-soft text-danger" : "bg-success-soft text-success";
  return <div className={`rounded-lg px-4 py-3 text-sm ${style}`}>{children}</div>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape closes only the top-most modal when one is opened on top of another.
  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    openModals.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === id) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openModals.splice(openModals.indexOf(id), 1);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-surface shadow-xl ${width}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-background" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="max-w-md">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Pagination({
  page,
  pageSize,
  count,
  onChange,
}: {
  page: number;
  pageSize: number;
  count: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-muted sm:flex-row">
      <span>
        Showing {from}–{to} of {count}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="px-3 py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span className="px-2 text-foreground">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" className="px-3 py-1.5" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
