import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import { isNativePlayBillingAvailable } from "@/lib/billing";
import { PACKS, VIDEO_COST, getMe, purchaseCredits } from "@/lib/local-api";
import { ECONOMY } from "@/lib/economy";

export const Route = createFileRoute("/wallet")({
  component: () => (
    <AppGate>
      <Wallet />
    </AppGate>
  ),
});

function Wallet() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [open, setOpen] = useState<(typeof PACKS)[number] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const native = isNativePlayBillingAvailable();

  const buy = useMutation({
    mutationFn: (packId: "starter" | "plus" | "night") => purchaseCredits({ data: { packId } }),
    onSuccess: async (res) => {
      if (!res.ok) {
        setStatus(res.message || res.reason || "Purchase failed");
        return;
      }
      setOpen(null);
      setStatus(
        res.source === "play"
          ? "Payment successful. Credits added."
          : "Sandbox purchase — credits added on this device (no real charge).",
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => setStatus(e.message),
  });

  const w = me.data?.wallet;

  return (
    <div className="px-5">
      <h1 className="font-display text-3xl">Wallet</h1>
      <p className="mt-2 rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-muted">
        <strong className="text-fg">Video terms:</strong> Placing a video call costs{" "}
        {ECONOMY.videoCallStartCredits} credits (connect fee). Per-minute rates apply only when both
        people are connected on a live video link. Unanswered calls still use the connect fee.
      </p>
      <p className="mt-1 text-muted">
        Setup is free. A few free texts, then credits. Buy Starter to unlock reading messages, gifts, photos, and video.
      </p>
      <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">Balance</p>
        <p className="font-display text-4xl">{w?.credits ?? 0} credits</p>
        <p className="text-sm text-gold">{w?.free_texts ?? 0} free texts remaining</p>
      </div>
      {w?.has_plan ? (
        <p className="mt-3 text-sm text-gold">Plan active — you can unlock messages, gifts, and video.</p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Buy any pack to unlock reading messages. Free users only see notifications.
        </p>
      )}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-xs text-muted space-y-1">
        <p className="font-medium text-fg">Credit costs</p>
        <p>Send text: free × few, then 1 credit</p>
        <p>Unlock message: 1 · gift: 5 · photo: 4</p>
        <p>Send gift card: 8 credits</p>
        <p>Video: 10s free, then 15 credits/min (peer can earn ~30% share)</p>
        {typeof w?.earnings === "number" && w.earnings > 0 ? (
          <p className="text-gold">Your earnings balance: {w.earnings} credits (from video shares)</p>
        ) : null}
      </div>
      <ul className="mt-6 space-y-3">
        {PACKS.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-3xl border border-border bg-surface p-4"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted">
                {p.credits} credits · {p.blurb}
              </p>
              <p className="mt-1 text-[10px] text-muted">SKU: {p.playProductId}</p>
            </div>
            <button
              onClick={() => {
                setStatus(null);
                setOpen(p);
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-fg"
            >
              ${(p.cents / 100).toFixed(2)}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">
        {native
          ? "Google Play Billing is available — purchases charge through Play and pay out to your developer account."
          : "Web/preview mode uses sandbox checkout (no real charge). On the Play Store APK, the same buttons use Google Play Billing so money goes to you."}
      </p>
      {status ? <p className="mt-3 text-sm text-gold">{status}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-30 grid place-items-end bg-bg/70 p-4" role="dialog">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-5 text-fg border border-border">
            <p className="text-sm font-semibold text-gold">
              {native ? "Google Play" : "Google Play (sandbox)"}
            </p>
            <p className="mt-2 text-lg font-medium">
              RadiusMeet · {open.name}
            </p>
            <p className="text-sm text-muted">
              ${(open.cents / 100).toFixed(2)} for {open.credits} credits
            </p>
            <p className="mt-2 text-xs text-muted">Product ID: {open.playProductId}</p>
            <p className="mt-3 text-xs text-muted">
              {native
                ? "You will complete payment in the Google Play purchase sheet."
                : "Sandbox only — no card is charged here. Wire window.RadiusMeetBilling in your Android shell for real Play purchases."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-full border border-border py-3"
                onClick={() => setOpen(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-full bg-primary py-3 text-primary-fg"
                onClick={() => buy.mutate(open.id)}
                disabled={buy.isPending}
              >
                {buy.isPending ? "Processing…" : native ? "Buy with Play" : "Add credits (sandbox)"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
