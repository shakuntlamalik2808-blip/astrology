import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, LayoutDashboard, LogOut, MessageCircle, Users } from "lucide-react";
import { adminSignOut, useAdminAuth } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Studio — Admin" },
      { name: "description", content: "Restricted area." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/consultations", label: "Consultations", icon: Users, exact: false },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, exact: false },
  { to: "/admin/whatsapp", label: "WhatsApp Integration", icon: MessageCircle, exact: false },
] as const;

function AdminLayout() {
  const auth = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.status === "signed-out" || auth.status === "unconfigured") navigate({ to: "/admin/login", replace: true });
  }, [auth.status, navigate]);

  if (auth.status !== "admin") {
    return <div className="flex min-h-screen items-center justify-center bg-ink text-ivory/60">Checking access…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="surface-night flex shrink-0 flex-col text-ivory md:sticky md:top-0 md:h-screen md:w-64">
        <div className="px-6 py-6">
          <p className="eyebrow text-gold">Studio</p>
          <p className="mt-1 font-display text-lg">Shakuntla Malik</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-ivory/70 transition-colors hover:bg-ivory/5 hover:text-ivory"
              activeProps={{ className: "bg-ivory/10 !text-gold" }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-ivory/10 p-4 md:block">
          <p className="truncate text-xs text-ivory/50">{auth.user.email}</p>
          <button
            onClick={async () => {
              await adminSignOut();
              navigate({ to: "/admin/login", replace: true });
            }}
            className="mt-3 flex items-center gap-2 text-sm text-ivory/70 hover:text-gold"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
