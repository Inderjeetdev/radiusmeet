import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, MessageCircle, Shield, UserRound, Wallet } from "lucide-react";
import { getMe, signOutAll } from "@/lib/local-api";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/discover", label: "Meet", icon: Compass },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/me", label: "You", icon: UserRound },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const isAdmin = Boolean(me.data?.profile?.is_admin);

  function onSignOut() {
    void signOutAll();
    void navigate({ to: "/login" });
  }

  return (
    <div className="mx-auto flex min-h-full flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <p className="font-display text-2xl tracking-tight text-fg">RadiusMeet</p>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link
              to="/admin"
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                pathname.startsWith("/admin")
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-gold",
              )}
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="flex-1 pb-28">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border bg-surface/95 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <ul className="grid grid-cols-4">
          {TABS.map((tab) => {
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-5" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
