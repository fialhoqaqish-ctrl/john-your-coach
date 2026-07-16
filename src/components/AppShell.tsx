import { Link, useRouterState } from "@tanstack/react-router";
import { Home, TrendingUp, User, Target } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/today", label: "Today", icon: Home },
    { to: "/trends", label: "Trends", icon: TrendingUp },
    { to: "/body", label: "Body", icon: User },
    { to: "/plan", label: "Plan", icon: Target },
  ] as const;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md safe-bottom">{children}</div>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => {
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
                  className={`text-[11px] font-medium tracking-wide ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}