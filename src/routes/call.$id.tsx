import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppGate } from "@/components/app-gate";
import { Portrait } from "@/components/portrait";
import { endVideoCall, getChat } from "@/lib/local-api";
import { ECONOMY } from "@/lib/economy";

export const Route = createFileRoute("/call/$id")({
  component: () => (
    <AppGate>
      <Call />
    </AppGate>
  ),
});

/** Continuous phone-like ringtone until stopped. */
function useRingtone(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let ctx: AudioContext | null = null;
    let stopped = false;
    let timer = 0;

    const schedule = () => {
      if (stopped || !ctx) return;
      const t = ctx.currentTime;
      const tone = (freq: number, at: number, dur: number) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.1, at + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        osc.connect(gain);
        gain.connect(ctx!.destination);
        osc.start(at);
        osc.stop(at + dur + 0.02);
      };
      // two dual-tone bursts (classic ring), then pause, repeat
      tone(440, t, 0.45);
      tone(480, t, 0.45);
      tone(440, t + 0.55, 0.45);
      tone(480, t + 0.55, 0.45);
      timer = window.setTimeout(schedule, 3000);
    };

    void (async () => {
      try {
        ctx = new AudioContext();
        await ctx.resume();
        schedule();
      } catch {
        /* autoplay */
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      void ctx?.close();
    };
  }, [enabled]);
}

function Call() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const q = useQuery({ queryKey: ["chat", id], queryFn: () => getChat({ data: { conversationId: id } }) });

  const RING_SEC = 30; // normal unanswered timeout
  const [phase, setPhase] = useState<"ringing" | "ended">("ringing");
  const [ringSec, setRingSec] = useState(0);
  const [ending, setEnding] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraMinimized, setCameraMinimized] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const creditsUsed = ECONOMY.videoCallStartCredits;

  useRingtone(phase === "ringing" && !ending);

  // Ring timer → auto end if no answer
  useEffect(() => {
    if (phase !== "ringing") return;
    const t = setInterval(() => {
      setRingSec((s) => {
        if (s + 1 >= RING_SEC) {
          void finish(true);
          return s + 1;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Camera
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!window.isSecureContext && location.hostname !== "localhost") {
          setCameraError("Camera needs HTTPS or localhost.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          el.muted = true;
          el.playsInline = true;
          await el.play().catch(() => undefined);
        }
        setCameraReady(true);
      } catch {
        setCameraError(
          "Allow camera access (browser address bar → site settings). Works best on phone or Chrome/Edge.",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cameraMinimized) return;
    const el = videoRef.current;
    const stream = streamRef.current;
    if (el && stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    }
  }, [cameraMinimized]);

  function toggleCamera() {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !cameraOn;
    stream.getVideoTracks().forEach((tr) => {
      tr.enabled = next;
    });
    setCameraOn(next);
  }

  const peer = q.data?.peer;

  async function finish(noAnswer: boolean) {
    if (ending) return;
    setEnding(true);
    setPhase("ended");
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    await endVideoCall({
      data: {
        conversationId: id,
        durationSeconds: ringSec || (noAnswer ? RING_SEC : 0),
        creditsUsed,
        peerName: peer?.name,
        practice: true,
      },
    });
    await qc.invalidateQueries({ queryKey: ["chat", id] });
    await qc.invalidateQueries({ queryKey: ["me"] });
    await qc.invalidateQueries({ queryKey: ["inbox"] });
    void navigate({ to: "/chats/$id", params: { id } });
  }

  return (
    <div className="relative min-h-[calc(100dvh-8rem)] overflow-hidden bg-bg px-5">
      <div className="absolute inset-0">
        {peer ? <Portrait name={peer.name} photo={peer.photo} hue={peer.hue} /> : null}
        <div className="absolute inset-0 bg-bg/55" />
      </div>

      {/* Self camera */}
      {!cameraMinimized ? (
        <div className="absolute right-4 bottom-28 z-20 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/40 bg-neutral-900 shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full scale-x-[-1] object-cover"
          />
          {!cameraReady && !cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-center text-[10px] text-muted">
              Starting camera…
            </div>
          ) : null}
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 p-2 text-center text-[10px] text-primary">
              {cameraError}
            </div>
          ) : null}
          {!cameraOn && cameraReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-xs text-fg">
              Camera off
            </div>
          ) : null}
          <div className="absolute inset-x-1 bottom-1 flex gap-1">
            <button
              type="button"
              className="flex-1 rounded-full bg-black/70 px-1 py-0.5 text-[10px] text-white"
              onClick={toggleCamera}
            >
              {cameraOn ? "Cam off" : "Cam on"}
            </button>
            <button
              type="button"
              className="flex-1 rounded-full bg-black/70 px-1 py-0.5 text-[10px] text-white"
              onClick={() => setCameraMinimized(true)}
            >
              Minimize
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="absolute right-4 bottom-28 z-20 rounded-full border border-border bg-surface px-3 py-2 text-xs"
          onClick={() => setCameraMinimized(false)}
        >
          Show my camera
        </button>
      )}

      <div className="relative z-10 pt-6">
        <p className="font-display text-3xl">{peer?.name ?? "Call"}</p>
        <p className="mt-2 text-lg text-gold">
          {phase === "ringing" ? "Calling…" : "Ending…"}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-3 animate-pulse rounded-full bg-gold"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Ringing {peer?.name ?? "them"}… {Math.max(0, RING_SEC - ringSec)}s
        </p>
      </div>

      <button
        type="button"
        disabled={ending}
        onClick={() => void finish(false)}
        className="absolute inset-x-5 bottom-8 z-20 rounded-full bg-primary py-3 text-center font-semibold text-primary-fg"
      >
        {ending ? "Ending…" : "Cancel"}
      </button>
    </div>
  );
}
