import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Wallet, Home, TrendingUp, User, MessageCircle, Flag } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

const TABS = [
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/today", label: "Today", icon: Home },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/body", label: "Body", icon: User },
  { to: "/coach", label: "Coach", icon: MessageCircle },
  { to: "/milestones", label: "Milestones", icon: Flag },
] as const;

export function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
              className="flex-1 flex flex-col items-center gap-1 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
            >
              <Icon
                size={20}
                aria-hidden="true"
                className={active ? "text-primary" : "text-muted-foreground"}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  children,
  onRefresh,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<unknown> | void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const idx = Math.max(
    0,
    TABS.findIndex((t) => pathname.startsWith(t.to)),
  );

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startRef = useRef<{ x: number; y: number; mode: "idle" | "h" | "v" } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (typeof window !== "undefined" && window.scrollY > 4) {
      startRef.current = null;
      return;
    }
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, mode: "idle" };
  }
  function onTouchMove(e: React.TouchEvent) {
    const s = startRef.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.mode === "idle") {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      s.mode = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (s.mode === "v" && dy > 0 && onRefresh && !refreshing) {
      setPull(Math.min(110, dy * 0.55));
    }
  }
  async function onTouchEnd(e: React.TouchEvent) {
    const s = startRef.current;
    if (!s) {
      setPull(0);
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (s.mode === "h" && Math.abs(dx) > 60) {
      const dir = dx < 0 ? 1 : -1;
      const next = idx + dir;
      if (next >= 0 && next < TABS.length) {
        navigate({ to: TABS[next].to });
      }
    } else if (s.mode === "v" && pull > 55 && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
    startRef.current = null;
  }

  const spinnerVisible = pull > 8 || refreshing;
  const spinnerY = refreshing ? 24 : pull * 0.6;

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
        style={{
          transform: `translateY(${spinnerY}px)`,
          opacity: spinnerVisible ? Math.min(1, (refreshing ? 60 : pull) / 55) : 0,
          transition: pull === 0 && !refreshing ? "opacity 200ms, transform 200ms" : undefined,
        }}
      >
        <div
          className="mt-3 h-6 w-6 rounded-full border-2 border-white/15 border-t-primary animate-spin"
          style={{ animationDuration: "0.9s" }}
        />
      </div>
      <div
        className="mx-auto max-w-md safe-bottom"
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: pull === 0 ? "transform 220ms cubic-bezier(0.2,0.8,0.2,1)" : undefined,
        }}
      >
        {children}
      </div>
      <BottomTabs />
    </div>
  );
}