import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { BrandScreen } from "@/components/brand-screen";
import { getSessionUserId, isFirebaseConfigured, signIn, signUp } from "@/lib/local-api";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Session is local (this phone only)
  if (getSessionUserId()) return <Navigate to="/discover" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "up" ? await signUp(email, password) : await signIn(email, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      void navigate({ to: "/discover" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-lg bg-bg px-6 pt-14 pb-10">
      <div className="relative">
        <p className="font-display text-5xl text-fg">RadiusMeet</p>
        <p className="mt-2 max-w-xs text-muted">
          Account stays on this phone only. Uninstall the app and your profile is gone — you’ll set up again.
        </p>
      </div>
      <form className="relative mt-8 space-y-3" onSubmit={onSubmit}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("up")}
            className={`flex-1 rounded-full py-2 text-sm ${mode === "up" ? "bg-primary text-primary-fg" : "border border-border"}`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setMode("in")}
            className={`flex-1 rounded-full py-2 text-sm ${mode === "in" ? "bg-primary text-primary-fg" : "border border-border"}`}
          >
            Sign in
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Password</span>
          <input
            type="password"
            required
            minLength={4}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>
        {error ? <p className="text-sm text-primary">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary py-3 font-semibold text-primary-fg"
        >
          {busy ? "Please wait…" : mode === "up" ? "Create on this phone" : "Sign in on this phone"}
        </button>
        <p className="text-xs text-muted">
          {isFirebaseConfigured()
            ? "Live profiles: Firebase is configured. Your profile can appear to others in your area."
            : "Firebase not configured yet — account stays on this phone. After download, paste Firebase keys in src/lib/firebase.ts to enable live users."}
        </p>
      </form>
    </main>
  );
}
