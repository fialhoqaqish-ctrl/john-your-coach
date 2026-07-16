import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
});

type Msg = { role: "user" | "assistant"; content: string; at: string };

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  const fetchMessages = useCallback(async () => {
    const r = await apiFetch<{ messages: Msg[] }>("/api/messages");
    return r.messages ?? [];
  }, []);

  useEffect(() => {
    fetchMessages()
      .then((m) => setMessages(m))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const stopPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPoll, []);

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setError(null);
    const optimistic: Msg = { role: "user", content: text, at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);

    const lastAssistantAt =
      [...messages].reverse().find((m) => m.role === "assistant")?.at ?? "";

    try {
      await apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ message: text }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
      return;
    }

    setThinking(true);
    const started = Date.now();
    stopPoll();
    pollRef.current = window.setInterval(async () => {
      try {
        const latest = await fetchMessages();
        const newestAssistant = [...latest].reverse().find((m) => m.role === "assistant");
        if (newestAssistant && newestAssistant.at > lastAssistantAt) {
          setMessages(latest);
          setThinking(false);
          stopPoll();
          return;
        }
        if (Date.now() - started > 120_000) {
          setThinking(false);
          setError("Still thinking, check back in a bit.");
          stopPoll();
        }
      } catch (e) {
        setThinking(false);
        setError(e instanceof Error ? e.message : "Poll failed");
        stopPoll();
      }
    }, 3000);
  }

  const visibleMessages = useMemo(
    () => (messages.length > 50 ? messages.slice(-50) : messages),
    [messages],
  );

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground" style={{ overscrollBehavior: "contain" }}>
      <header className="px-5 pt-6 pb-4 shrink-0 flex items-center gap-3 border-b border-border">
        <Link to="/plan" aria-label="Back to Plan" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Coach</h1>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Coach conversation"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ overscrollBehavior: "contain" }}
      >
        {loading && <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>}
        {!loading && messages.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center mt-6">
            <p className="text-lg text-foreground">Say hi to your coach.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ask about training, recovery, or your next race.
            </p>
          </div>
        )}
        {visibleMessages.map((m, i) => (
          <Bubble key={`${m.at}-${i}`} m={m} />
        ))}
        {thinking && (
          <div className="flex justify-start" aria-live="polite">
            <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">John is thinking…</span>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-center text-xs text-destructive py-2">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-border bg-background/95 backdrop-blur px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex items-end gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message John
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message John…"
          className="flex-1 min-w-0 resize-none rounded-2xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary max-h-32"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          aria-label="Send message"
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  const user = m.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] min-w-0 rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words ${
          user
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-foreground"
        }`}
      >
        {m.content}
      </div>
    </div>
  );
}