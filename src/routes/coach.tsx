import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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

  return (
    <AppShell>
      <div className="flex flex-col h-[100dvh]">
        <div className="px-5 pt-8 pb-4 shrink-0">
          <h1 className="font-display text-5xl font-black tracking-tighter">COACH</h1>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-40 space-y-3"
        >
          {loading && (
            <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
          )}
          {!loading && messages.length === 0 && (
            <div className="rounded-[20px] border border-border bg-card p-6 text-center mt-6">
              <p className="font-display text-lg tracking-tight">Say hi to your coach.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ask about training, recovery, or your next race.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-[20px] border border-border bg-card px-4 py-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">John is thinking…</span>
              </div>
            </div>
          )}
          {error && (
            <p className="text-center text-xs text-destructive py-2">{error}</p>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-md px-3 py-3 flex items-end gap-2">
            <textarea
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
              className="flex-1 resize-none rounded-2xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary max-h-32"
            />
            <button
              onClick={send}
              disabled={thinking || !input.trim()}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition shrink-0"
              aria-label="Send"
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Bubble({ m }: { m: Msg }) {
  const user = m.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-[20px] px-4 py-3 text-sm whitespace-pre-wrap ${
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