import { createFileRoute, Navigate } from "@tanstack/react-router";
import { BrandScreen } from "@/components/brand-screen";
import { getSessionUserId } from "@/lib/local-api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setUid(getSessionUserId());
  }, []);
  if (uid === undefined) return <BrandScreen message="Lighting the room…" />;
  if (!uid) return <Navigate to="/login" />;
  return <Navigate to="/discover" />;
}
