import { Loader2 } from "lucide-react";
import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";

/**
 * The admin shell reads the URL (active menu item, page guard). On routes with a dynamic id such as
 * /patients/[id], the URL is only known at request time, so the shell must sit inside a Suspense boundary
 * (Cache Components). Static routes are unaffected; dynamic ones show this spinner until the id resolves.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
