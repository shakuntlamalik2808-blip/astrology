import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminSignInWithGoogle, authErrorMessage, useAdminAuth } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Studio" },
      { name: "description", content: "Restricted area." },
      { property: "og:title", content: "Sign in — Studio" },
      { property: "og:description", content: "Restricted owner sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === "admin") navigate({ to: "/admin", replace: true });
  }, [auth.status, navigate]);

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminSignInWithGoogle();
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="surface-night flex min-h-screen items-center justify-center px-4 py-8 text-ivory sm:px-6">
      <div className="w-full max-w-sm rounded-sm border border-ivory/12 bg-ink-soft/60 p-6 sm:p-8">
        <p className="eyebrow text-gold">Studio</p>
        <h1 className="display mt-4 text-[2rem] sm:text-3xl">Admin sign in</h1>
        <p className="mt-3 text-sm text-ivory/60">Restricted to the owner account.</p>
        {auth.status === "unconfigured" && (
          <p className="mt-6 rounded-sm border border-terracotta/60 bg-terracotta/15 p-3 text-sm">
            Firebase is not configured yet. Add the VITE_FIREBASE_* values to enable sign-in.
          </p>
        )}
        <button
          type="button"
          onClick={signIn}
          disabled={busy || auth.status === "unconfigured"}
          className="mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-sm bg-ivory text-sm font-medium text-ink transition-colors hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:opacity-60"
        >
          <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {busy ? "Signing in..." : "Continue with Google"}
        </button>
        {error && <p role="alert" className="mt-4 text-sm text-gold-soft">{error}</p>}
      </div>
    </main>
  );
}
