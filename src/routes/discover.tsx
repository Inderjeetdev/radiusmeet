import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import { Portrait } from "@/components/portrait";
import { listDiscover, openChat } from "@/lib/local-api";

export const Route = createFileRoute("/discover")({
  component: () => (
    <AppGate>
      <Discover />
    </AppGate>
  ),
});

function Discover() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["discover"], queryFn: () => listDiscover() });
  const [i, setI] = useState(0);
  const open = useMutation({
    mutationFn: (p: { peerId: string; peerKind: "sample" | "user" }) => openChat({ data: p }),
    onSuccess: (res) => navigate({ to: "/chats/$id", params: { id: res.conversationId } }),
  });
  const people = q.data?.people ?? [];
  const person = people[i];
  const area = q.data?.area ?? "";
  const radiusKm = q.data?.radiusKm ?? 50;
  const onlineCount = q.data?.onlineCount ?? 0;
  const offlineCount = q.data?.offlineCount ?? 0;

  return (
    <div className="px-5">
      <p className="text-sm text-muted">
        {area
          ? `Around ${area} · within ${radiusKm} km`
          : "Set your area in setup to find people nearby."}
      </p>
      {!q.isPending && (onlineCount > 0 || offlineCount > 0) ? (
        <p className="mt-1 text-xs text-muted">
          {onlineCount > 0 ? (
            <span className="text-gold">{onlineCount} online</span>
          ) : (
            <span>No online members yet</span>
          )}
          {offlineCount > 0 ? <span> · {offlineCount} nearby</span> : null}
        </p>
      ) : null}

      {q.isPending ? <p className="mt-10 text-muted">Looking around…</p> : null}
      {!q.isPending && !person ? (
        <p className="mt-10 text-muted">
          No one in your area yet. Check that your city or area is set in You → Edit profile.
        </p>
      ) : null}

      {person ? (
        <article className="mt-4 overflow-hidden rounded-[2rem] border border-border bg-surface">
          <div className="relative h-72 max-h-[50vh]">
            <Portrait name={person.name} photo={person.photo} hue={person.hue} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg to-transparent p-5">
              <div className="mb-1 flex items-center gap-2">
                {person.online ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
                    Online
                  </span>
                ) : (
                  <span className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Nearby
                  </span>
                )}
              </div>
              <p className="font-display text-3xl">
                {person.name}, {person.age}
              </p>
              <p className="text-gold">{person.tagline}</p>
              {person.distanceLabel ? (
                <p className="mt-1 text-sm text-fg/90">{person.distanceLabel}</p>
              ) : null}
              {person.area ? <p className="text-xs text-muted">{person.area}</p> : null}
              {person.kind === "sample" ? (
                <p className="mt-1 text-xs tracking-wide text-muted uppercase">
                  Offline profile · say hi anytime
                </p>
              ) : (
                <p className="mt-1 text-xs tracking-wide text-muted uppercase">Signed-in member</p>
              )}
            </div>
          </div>
          <p className="p-5 text-muted">{person.bio}</p>
          <div className="flex gap-3 px-5 pb-5">
            <button
              className="flex-1 rounded-full border border-border py-3"
              onClick={() => setI((n) => (n + 1) % people.length)}
            >
              Next
            </button>
            <button
              className="flex-1 rounded-full bg-primary py-3 font-semibold text-primary-fg"
              disabled={open.isPending}
              onClick={() => open.mutate({ peerId: person.id, peerKind: person.kind })}
            >
              {open.isPending ? "Opening…" : "Say hi"}
            </button>
          </div>
        </article>
      ) : null}
      {people.length > 1 ? (
        <p className="mt-3 text-center text-xs text-muted">
          {i + 1} of {people.length} around you
        </p>
      ) : null}
    </div>
  );
}
