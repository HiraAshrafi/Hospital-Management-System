"use client";

import {
  Ambulance,
  ArrowRight,
  BedDouble,
  CalendarClock,
  ChartLine,
  Cloud,
  Eye,
  EyeOff,
  Headset,
  HeartPulse,
  Lock,
  Mail,
  MapPinned,
  Microscope,
  Pill,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { Dancing_Script } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BRAND_NAME, BRAND_TAGLINE, BrandLogo } from "@/components/Brand";
import { Alert, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";

const script = Dancing_Script({ subsets: ["latin"], weight: "700" });

// Feature tiles from the brand artwork, each in its colour-code tone.
const FEATURES = [
  { icon: CalendarClock, label: "Doctor Appointment", tone: "bg-primary-soft text-primary" },
  { icon: Ambulance, label: "Ambulance Booking", tone: "bg-danger-soft text-danger" },
  { icon: MapPinned, label: "Live Ambulance Tracking", tone: "bg-danger-soft text-danger" },
  { icon: Pill, label: "Medicine Purchase", tone: "bg-violet-soft text-violet" },
  { icon: Microscope, label: "Disease Info & Doctor Finder", tone: "bg-primary-soft text-primary" },
  { icon: BedDouble, label: "Hospital Management", tone: "bg-accent-soft text-accent" },
  { icon: Users, label: "Patient Dashboard", tone: "bg-primary-soft text-primary" },
  { icon: ChartLine, label: "Admin Panel & Analytics", tone: "bg-accent-soft text-accent" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Secure & Reliable" },
  { icon: Zap, label: "Fast & Easy Access" },
  { icon: Cloud, label: "Cloud Based Solution" },
  { icon: Headset, label: "24/7 Support" },
];

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

  const fieldClass =
    "w-full rounded-xl border border-border bg-surface-muted py-3 pl-11 pr-3.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10";

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {/* Brand artwork panel */}
      <section className="brand-sky relative hidden overflow-hidden lg:flex lg:flex-col">
        <div className="relative z-10 flex flex-1 flex-col px-10 pt-10 pb-28 xl:px-14">
          <BrandLogo size="lg" />

          <div className="my-auto pt-10">
          <h2 className="max-w-2xl text-[44px] font-extrabold leading-[1.08] tracking-tight text-navy xl:text-[52px]">
            Complete <span className="text-primary">Hospital</span>
            <br />
            Management <span className="text-primary">System</span>
          </h2>
          <p className="mt-4 max-w-xl text-xl font-bold leading-snug text-navy/90">For Patients, Doctors, Ambulance Drivers and Medicine Centers</p>
          <p className="mt-4 max-w-lg border-l-[3px] border-primary pl-4 text-[15px] leading-relaxed text-navy/75">
            A smart, easy and reliable platform to manage hospital services, book appointments, find doctors and track ambulances, all in one
            place.
          </p>

          <ul className="mt-8 grid max-w-2xl grid-cols-4 gap-3">
            {FEATURES.map(({ icon: Icon, label, tone }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-2 py-3.5 text-center shadow-[0_10px_24px_-16px_rgba(11,37,102,0.45)] backdrop-blur"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[12.5px] font-semibold leading-tight text-navy">{label}</span>
              </li>
            ))}
          </ul>

          <ul className="mt-4 grid max-w-2xl grid-cols-4 divide-x divide-primary/15 rounded-2xl border border-white/80 bg-white/65 py-3 backdrop-blur">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1 px-2 text-center">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold text-navy">{label}</span>
              </li>
            ))}
          </ul>
          </div>
        </div>

        {/* Navy wave footer */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28">
          <svg viewBox="0 0 800 112" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path d="M0 48C180 8 340 70 520 40C640 20 730 18 800 30V112H0Z" fill="var(--primary)" opacity="0.35" />
            <path d="M0 64C170 30 360 88 540 56C660 36 740 40 800 50V112H0Z" fill="var(--navy)" />
          </svg>
          <p className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3 text-[15px] font-semibold text-white">
            <HeartPulse className="h-5 w-5 text-accent-bright" />
            Smart Hospital <span className="text-white/40">|</span> Smart Care <span className="text-white/40">|</span> Smart Bangladesh
          </p>
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-col px-4 py-8 sm:px-8">
        <p className={`${script.className} hidden text-right text-[26px] text-navy lg:block`}>
          Innovative Healthcare Solution
          <span className="ml-auto mt-0.5 block h-[3px] w-48 rounded-full bg-gradient-to-r from-transparent to-primary" />
        </p>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <BrandLogo />
            </div>

            <div className="rounded-3xl border border-border bg-surface p-7 shadow-[0_24px_60px_-28px_rgba(11,37,102,0.35)] sm:p-9">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Admin Panel
              </span>
              <h1 className="mt-4 text-[28px] font-extrabold tracking-tight text-navy">Welcome Back 👋</h1>
              <p className="mt-1 text-sm text-muted">Sign in to manage your hospital with {BRAND_NAME}.</p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                {error && <Alert>{error}</Alert>}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-navy">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-navy">Password</span>
                  <span className="relative block">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${fieldClass} pr-11`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted hover:text-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>
                <Button type="submit" loading={submitting} className="w-full py-3 text-[15px]">
                  Sign in {!submitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
                <Lock className="h-3.5 w-3.5" /> Authorised staff only
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-muted">
              {BRAND_NAME} · {BRAND_TAGLINE}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
