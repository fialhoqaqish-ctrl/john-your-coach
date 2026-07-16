import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/progress", label: "PROGRESS", icon: Activity },
    { to: "/coach", label: "COACH", icon: MessageSquare },
  ] as const;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md safe-bottom">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="flex-1 flex flex-col items-center gap-1 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
              >
                <Icon
                  size={22}
                  className={active ? "text-primary" : "text-muted-foreground"}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={`font-display text-xs tracking-widest ${active ? "text-primary" : "text-muted-foreground"}`}
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