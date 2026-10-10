import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMe, getSessionUserId } from "@/lib/local-api";
import { localSignOut } from "@/lib/local-store";
import { BrandScreen } from "./brand-screen";
import { Shell } from "./shell";

export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setUserId(getSessionUserId());
  }, [pathname]);

  const me = useQuery({
    queryKey: ["me", userId],
    queryFn: () => getMe(),
    enabled: !!userId,
    retry: 1,
  });

  useEffect(() => {
    if (!userId || me.isPending || me.isError) return;
    // Only force setup when profile is missing — never block /login after sign-out
    if (!me.data?.profile && pathname !== "/setup" && pathname !== "/login") {
      void navigate({ to: "/setup" });
    }
  }, [userId, me.data, me.isPending, me.isError, pathname, navigate]);

  if (userId === undefined) {
    return <BrandScreen message="Lighting the room…" />;
  }
  if (!userId) return <Navigate to="/login" />;
  if (me.isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-muted">Could not load your profile on this phone.</p>
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm"
          onClick={() => {
            localSignOut();
            qc.clear();
            setUserId(null);
            void navigate({ to: "/login" });
          }}
        >
          Sign out and try again
        </button>
      </div>
    );
  }
  if (me.isPending) {
    return <BrandScreen message="Lighting the room…" />;
  }
  if (!me.data?.profile && pathname !== "/setup") {
    return <BrandScreen message="Taking you to setup…" />;
  }
  if (pathname === "/setup") return <>{children}</>;
  return <Shell>{children}</Shell>;
}
