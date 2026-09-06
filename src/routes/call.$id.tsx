import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppGate } from "@/components/app-gate";
import { Portrait } from "@/components/portrait";
import { getChat } from "@/lib/local-api";

export const Route = createFileRoute("/call/$id")({
  component: () => (
    <AppGate>
      <Call />
    </AppGate>
  ),
});

function Call() {
  const { id } = Route.useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const q = useQuery({ queryKey: ["chat", id], queryFn: () => getChat({ data: { conversationId: id } }) });

  useEffect(() => {
    let stream: MediaStream | undefined;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        /* camera optional in preview */
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const peer = q.data?.peer;

  return (
    <div className="relative min-h-[calc(100dvh-8rem)] overflow-hidden bg-bg px-5">
      <div className="absolute inset-0">
        {peer ? <Portrait name={peer.name} photo={peer.photo} hue={peer.hue} /> : null}
        <div className="absolute inset-0 bg-bg/40" />
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute right-5 bottom-28 h-40 w-28 rounded-2xl border border-border object-cover"
      />
      <div className="relative pt-6">
        <p className="font-display text-3xl">{peer?.name ?? "Call"}</p>
        {peer?.sample ? (
          <p className="max-w-xs text-sm text-gold">
            Sample profiles can't join live. This is your camera in a practice room — the other face is the
            illustrated card, not a hidden operator.
          </p>
        ) : (
          <p className="text-sm text-muted">Live room. The other person joins from their own signed-in session.</p>
        )}
      </div>
      <Link
        to="/chats/$id"
        params={{ id }}
        className="absolute inset-x-5 bottom-8 rounded-full bg-primary py-3 text-center font-semibold text-primary-fg"
      >
        End call
      </Link>
    </div>
  );
}
