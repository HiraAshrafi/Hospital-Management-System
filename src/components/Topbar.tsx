"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/Sidebar";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const title = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface px-4 sm:px-6">
      <button className="rounded-md p-1.5 text-muted hover:bg-background lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {user && (
        <Link href="/settings" className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-background">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.full_name || "Admin"}</p>
            <p className="text-xs text-muted">{user.is_superuser ? "Super Admin" : "Admin"}</p>
          </div>
          <Avatar name={user.full_name} email={user.email} src={user.avatar} />
        </Link>
      )}
    </header>
  );
}
