import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMe, getSessionUserId } from "@/lib/local-api";
import { BrandScreen } from "./brand-screen";
import { Shell } from "./shell";

export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
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
    if (!me.data?.profile && pathname !== "/setup") {
      void navigate({ to: "/setup" });
    }
  }, [userId, me.data, me.isPending, me.isError, pathname, navigate]);

  if (userId === undefined) {
    return <BrandScreen message="Lighting the room…" />;
  }
  if (!userId) return <Navigate to="/login" />;
  if (me.isError) {
    return <BrandScreen message="Could not load your profile on this phone." />;
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
