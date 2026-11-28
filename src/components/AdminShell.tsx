"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_ITEMS, Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { buttonClass, Card, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

/**
 * Admin chrome + auth guard. The page is always rendered (so Next.js can prerender it);
 * an overlay hides it until the session is confirmed, and logged-out visitors are sent to /login.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const page = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const allowed = !page || can(page.perm);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  return (
    <div className="min-h-screen">
      {!user && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
          <Spinner />
        </div>
      )}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[var(--sidebar-width)]">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="p-4 sm:p-6">{allowed ? children : <NoAccess />}</main>
      </div>
    </div>
  );
}

function NoAccess() {
  const { user } = useAuth();
  return (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-extrabold text-navy">You don’t have access to this page</h2>
      <p className="mt-1 text-sm text-muted">
        Your role{user?.role_name ? ` (${user.role_name})` : ""} doesn’t include this section. Ask an administrator if you need it.
      </p>
      <Link href="/dashboard" className={buttonClass("primary", "mt-6")}>
        Back to dashboard
      </Link>
    </Card>
  );
}
