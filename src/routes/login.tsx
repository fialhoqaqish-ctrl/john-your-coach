import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, getAuth, setAuth } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [base, setBase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const a = getAuth();
    if (a.base) setBase(a.base);
  }, []);

  // Prefill base from pasted token if it looks like a URL
  function handleTokenChange(v: string) {
    setToken(v);
    const urlMatch = v.match(/https?:\/\/[^\s"']+/);
    if (urlMatch && !base) {
      setBase(urlMatch[0].replace(/\/$/, ""));
    }
  }

  async function connect() {
    setError(null);
    setLoading(true);
    try {
      const b = base.trim().replace(/\/$/, "");
      const t = token.trim();
      if (!b || !t) throw new Error("Fill in both fields");
      await apiFetch("/api/dashboard", {}, { base: b, token: t });
      setAuth(b, t);
      navigate({ to: "/today", replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(
        msg.includes("401") || msg.toLowerCase().includes("unauth")
          ? "Invalid token — re-run /appconnect in Telegram."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground px-6 py-12 flex flex-col">
      <div className="mt-6">
        <h1 className="font-display text-[6.5rem] leading-[0.85] tracking-tighter">JOHN</h1>
        <p className="mt-3 text-sm font-medium tracking-[0.16em] uppercase text-primary">
          Your Coach. No Excuses.
        </p>
      </div>

      <form
        className="mt-14 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) connect();
        }}
      >
        <div>
          <label htmlFor="token" className="block text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground mb-2">
            Bearer Token
          </label>
          <textarea
            id="token"
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            rows={4}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste your token…"
            className="w-full rounded-2xl bg-card border border-border p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
          />
        </div>
        <div>
          <label htmlFor="base" className="block text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground mb-2">
            API URL
          </label>
          <input
            id="base"
            type="url"
            inputMode="url"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full rounded-2xl bg-card border border-border p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary text-primary-foreground font-semibold tracking-wide text-base py-4 disabled:opacity-60 active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {loading ? "Connecting…" : "Connect"}
        </button>
      </form>
    </main>
  );
}