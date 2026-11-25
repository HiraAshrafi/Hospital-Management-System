"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

/**
 * Admin chrome + auth guard. The page is always rendered (so Next.js can prerender it);
 * an overlay hides it until the session is confirmed, and logged-out visitors are sent to /login.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
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
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
