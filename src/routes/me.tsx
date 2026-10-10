import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import { Portrait } from "@/components/portrait";
import { ECONOMY } from "@/lib/economy";
import { contactSupport, getMe, requestWithdraw } from "@/lib/local-api";

function SupportBox() {
  const [body, setBody] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => contactSupport({ data: { body } }),
    onSuccess: (res) => {
      setNote(res.message ?? (res.ok ? "Sent" : "Failed"));
      if (res.ok) setBody("");
    },
  });
  return (
    <div className="mt-4 rounded-2xl border border-border bg-bg p-3">
      <p className="text-sm font-medium">Contact support</p>
      <p className="text-xs text-muted">Message goes to admin (support inbox).</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        placeholder="Issue or question…"
      />
      <button
        type="button"
        className="mt-2 rounded-full border border-border px-4 py-1.5 text-sm"
        disabled={send.isPending || !body.trim()}
        onClick={() => send.mutate()}
      >
        Send to support
      </button>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export const Route = createFileRoute("/me")({
  component: () => (
    <AppGate>
      <Me />
    </AppGate>
  ),
});

function Me() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [msg, setMsg] = useState<string | null>(null);
  const p = me.data?.profile;
  const w = me.data?.wallet;

  const withdraw = useMutation({
    mutationFn: () => requestWithdraw(),
    onSuccess: (res) => {
      setMsg(res.message);
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <div className="px-5">
      <h1 className="font-display text-3xl">You</h1>
      {p ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="flex gap-1 overflow-x-auto">
            {(p.photos?.length ? p.photos : p.photo_data ? [p.photo_data] : []).map((src: string, i: number) => (
              <div key={i} className="h-56 w-40 shrink-0">
                <Portrait name={p.display_name} photo={src} />
              </div>
            ))}
            {!p.photos?.length && !p.photo_data ? (
              <div className="h-56 w-full">
                <Portrait name={p.display_name} photo={null} />
              </div>
            ) : null}
          </div>
          <div className="p-5">
            <p className="text-xl font-medium">
              {p.display_name}, {p.age}
              {p.is_admin ? (
                <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">Admin</span>
              ) : null}
            </p>
            <p className="text-muted">
              {p.gender} · looking for {p.seeking}
            </p>
            <p className="mt-1 text-sm text-muted">
              {p.email} · {p.phone}
            </p>
            {p.area ? (
              <p className="mt-2 text-sm text-gold">
                {p.area}
                {p.search_radius_km ? ` · within ${p.search_radius_km} km` : ""}
              </p>
            ) : null}
            {p.hobbies?.length ? (
              <p className="mt-2 text-xs text-muted">Hobbies: {p.hobbies.join(", ")}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">
              Smoke: {p.smoke} · Drink: {p.drink}
            </p>
            <p className="mt-2">{p.bio}</p>

            {p.gender === "woman" && !p.is_admin ? (
              <div className="mt-4 rounded-2xl border border-border bg-bg p-3">
                <p className="text-sm text-gold">
                  Reward points (last 6 months): {w?.eligible_earnings ?? 0} /{" "}
                  {ECONOMY.withdrawCreditsRequired}
                </p>
                <p className="text-xs text-muted">Lifetime points: {w?.earnings ?? 0}</p>
                <p className="text-xs text-muted">
                  Reach {ECONOMY.withdrawCreditsRequired} points to notify admin. Admin may release ~$
                  {ECONOMY.withdrawUsd} cash or {ECONOMY.withdrawCreditReward} credits — not automatic.
                  Buyer payments stay with the platform.
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-fg"
                  disabled={withdraw.isPending}
                  onClick={() => withdraw.mutate()}
                >
                  Request reward from admin
                </button>
              </div>
            ) : null}

            <SupportBox />

            {p.is_admin ? (
              <Link to="/admin" className="mt-4 inline-block text-sm text-gold underline">
                Open admin dashboard →
              </Link>
            ) : null}

            {p.is_admin ? (
              <p className="mt-3 text-xs text-gold">
                Admin: chat, video, gifts, and unlocks are free. Users messaging you are not charged for admin
                threads (wire free-with-admin flag when you add live peers).
              </p>
            ) : null}

            {msg ? <p className="mt-2 text-sm text-muted">{msg}</p> : null}

            <Link to="/setup" className="mt-4 inline-block text-sm text-gold">
              Edit profile & area
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
