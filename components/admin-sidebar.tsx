"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CreditCard, LayoutDashboard, LogOut, Users } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Client CRM", icon: Users },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-cosmic text-ivory">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="font-serif text-xl">Studio admin</p>
        <p className="text-xs text-ivory/50">Shakuntla Malik</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ivory/70 hover:bg-white/10 hover:text-ivory",
                active && "bg-gold/20 text-gold"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full border-white/20 text-ivory hover:bg-white/10"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
