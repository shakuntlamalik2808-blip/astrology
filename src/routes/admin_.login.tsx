import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  adminSignInWithGoogle,
  adminSignInWithEmail,
  authErrorMessage,
  useAdminAuth,
} from "@/lib/admin-auth";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Studio" },
      { name: "description", content: "Restricted area." },
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

  // Email / password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (auth.status === "admin") navigate({ to: "/admin", replace: true });
  }, [auth.status, navigate]);

  async function signInWithGoogle() {
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

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminSignInWithEmail(email.trim(), password);
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const isUnconfigured = auth.status === "unconfigured";

  return (
    <main className="surface-night flex min-h-screen items-center justify-center px-6 text-ivory">
      <div className="w-full max-w-sm rounded-sm border border-ivory/12 bg-ink-soft/60 p-8">
        <p className="eyebrow text-gold">Studio</p>
        <h1 className="display mt-4 text-3xl">Admin sign in</h1>
        <p className="mt-3 text-sm text-ivory/60">
          Restricted to the owner account.
        </p>

        {isUnconfigured && (
          <p className="mt-6 rounded-sm border border-terracotta/60 bg-terracotta/15 p-3 text-sm">
            Firebase is not configured yet. Add the VITE_FIREBASE_* values to
            enable sign-in.
          </p>
        )}

        {/* ── Google SSO ── */}
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy || isUnconfigured}
          className="mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-sm bg-ivory text-sm font-medium text-ink transition-colors hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:opacity-60"
        >
          <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
            />
          </svg>
          {busy ? "Signing in..." : "Continue with Google"}
        </button>

        {/* ── Divider ── */}
        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-ivory/12" />
          <span className="text-xs text-ivory/40">or</span>
          <span className="h-px flex-1 bg-ivory/12" />
        </div>

        {/* ── Email / Password form ── */}
        <form onSubmit={signInWithEmail} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-medium text-ivory/70"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || isUnconfigured}
              placeholder="admin@example.com"
              className="w-full rounded-sm border border-ivory/12 bg-ink-soft/40 px-3 py-2.5 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium text-ivory/70"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || isUnconfigured}
                placeholder="••••••••"
                className="w-full rounded-sm border border-ivory/12 bg-ink-soft/40 px-3 py-2.5 pr-10 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold/60 focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ivory/40 hover:text-ivory/70"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  /* eye-off icon */
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* eye icon */
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || isUnconfigured || !email || !password}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-gold/90 text-sm font-medium text-ink transition-colors hover:bg-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign in with Email"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-gold-soft">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
