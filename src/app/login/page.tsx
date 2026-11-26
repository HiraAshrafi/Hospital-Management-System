"use client";

import { CalendarCheck, Eye, EyeOff, HeartPulse, Hospital, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-[#0b3f86] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Hospital className="h-6 w-6" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold">Hospital</span>
            <span className="block text-xs text-white/70">Management System</span>
          </span>
        </div>
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Run your hospital from one calm, clear dashboard.</h2>
          <p className="mt-4 max-w-md text-white/75">Patients, doctors, appointments and departments, all in one place for your admin team.</p>
          <ul className="mt-10 grid max-w-md gap-3">
            {[
              { icon: CalendarCheck, text: "Book and track appointments without double-booking" },
              { icon: Stethoscope, text: "Doctor schedules, shifts and consultation fees" },
              { icon: HeartPulse, text: "Patient records with allergies and visit history" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
                <Icon className="h-5 w-5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">Authorised staff only.</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-white/5" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white lg:hidden">
              <Hospital className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Sign in to the Hospital Management System admin panel.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert>{error}</Alert>}
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
