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
      navigate({ to: "/progress", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-12 flex flex-col">
      <div className="mt-8">
        <h1 className="font-display text-[7rem] leading-none font-black tracking-tighter">
          JOHN
        </h1>
        <p className="mt-2 font-display text-lg tracking-widest text-primary">
          YOUR COACH. NO EXCUSES.
        </p>
      </div>

      <div className="mt-14 space-y-5">
        <div>
          <label className="block font-display text-xs tracking-widest text-muted-foreground mb-2">
            BEARER TOKEN
          </label>
          <textarea
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            rows={4}
            placeholder="Paste your token…"
            className="w-full rounded-[20px] bg-card border border-border p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          />
        </div>
        <div>
          <label className="block font-display text-xs tracking-widest text-muted-foreground mb-2">
            API URL
          </label>
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full rounded-[20px] bg-card border border-border p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={connect}
          disabled={loading}
          className="w-full rounded-full bg-primary text-primary-foreground font-display font-black tracking-widest text-lg py-5 disabled:opacity-50 active:scale-[0.98] transition"
        >
          {loading ? "CONNECTING…" : "CONNECT"}
        </button>
      </div>
    </div>
  );
}