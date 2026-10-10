import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import { Portrait } from "@/components/portrait";
import { ECONOMY, GIFT_PRESETS } from "@/lib/economy";
import {
  deliverSampleReply,
  getChat,
  getSampleReplyTiming,
  sendGift,
  sendMessage,
  startVideo,
  unlockChatMessage,
} from "@/lib/local-api";

export const Route = createFileRoute("/chats/$id")({
  component: () => (
    <AppGate>
      <Thread />
    </AppGate>
  ),
});

function Thread() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const q = useQuery({
    queryKey: ["chat", id],
    queryFn: () => getChat({ data: { conversationId: id } }),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["chat", id] });
    await qc.invalidateQueries({ queryKey: ["me"] });
    await qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  const send = useMutation({
    mutationFn: () => sendMessage({ data: { conversationId: id, body: text } }),
    onSuccess: async (res) => {
      if (res.ok === false) {
        void navigate({ to: "/wallet" });
        return;
      }
      setText("");
      await refresh(); // show user's message immediately

      // Realistic typing delay for sample peers (online = fast, offline = few minutes)
      if (res.willReply) {
        const peerId = q.data?.peerId ?? "";
        const timing = peerId
          ? getSampleReplyTiming(peerId)
          : { waitBeforeTypingMs: 1000, typingMs: 2000, online: false };
        await new Promise((r) => setTimeout(r, timing.waitBeforeTypingMs));
        setIsPeerTyping(true);
        await new Promise((r) => setTimeout(r, timing.typingMs));
        await deliverSampleReply({ data: { conversationId: id } });
        setIsPeerTyping(false);
        await refresh();
      }
    },
  });

  const gift = useMutation({
    mutationFn: (giftId: string) => sendGift({ data: { conversationId: id, giftId } }),
    onSuccess: async (res) => {
      if (!res.ok) {
        void navigate({ to: "/wallet" });
        return;
      }
      setShowGifts(false);
      await refresh();
    },
  });

  const unlock = useMutation({
    mutationFn: (messageId: number) => unlockChatMessage({ data: { messageId } }),
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.reason === "need_plan" || res.reason === "paywall") {
          void navigate({ to: "/wallet" });
        }
        return;
      }
      await refresh();
    },
  });

  const video = useMutation({
    mutationFn: () => startVideo({ data: { conversationId: id } }),
    onSuccess: (res) => {
      if (!res.ok) {
        void navigate({ to: "/wallet" });
        return;
      }
      void navigate({ to: "/call/$id", params: { id } });
    },
  });

  const data = q.data;
  if (q.isPending) return <p className="px-5 text-muted">Opening…</p>;
  if (!data) return <p className="px-5 text-muted">This chat is gone.</p>;

  const costs = data.costs;
  const hasPlan = data.wallet.has_plan;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col px-5">
      <div className="flex items-center gap-3">
        <div className="size-12 overflow-hidden rounded-full">
          <Portrait name={data.peer.name} photo={data.peer.photo} hue={data.peer.hue} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {data.peer.name}, {data.peer.age}
          </p>
          <p className="text-xs text-muted">
            {data.peer.sample
              ? data.peer.online
                ? "Online · nearby"
                : "Offline · may reply in a few minutes"
              : "Member"}
          </p>
        </div>
        <button
          className="rounded-full border border-border px-3 py-1.5 text-xs"
          disabled={video.isPending}
          onClick={() => video.mutate()}
        >
          Video
        </button>
      </div>

      {hasPlan ? null : (data.wallet.free_sends_left ?? data.wallet.free_texts) <= 0 ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-muted">
          Free messages in this chat used up (5 sends). Buy{" "}
          <Link to="/wallet" className="text-gold underline">
            Starter
          </Link>{" "}
          or use credits to keep chatting.
        </p>
      ) : !hasPlan ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface/60 px-3 py-2 text-xs text-muted">
          {(data.wallet.free_sends_left ?? data.wallet.free_texts)} free send
          {(data.wallet.free_sends_left ?? data.wallet.free_texts) === 1 ? "" : "s"} left in this chat · first{" "}
          {data.wallet.free_reads_per_chat ?? 5} replies free to read
        </p>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {data.messages.map((m) =>
          m.kind === "system" ? (
            <div key={m.id} className="mx-auto max-w-[95%] rounded-2xl border border-border bg-surface/80 px-3 py-2 text-center text-xs text-muted">
              {m.body}
            </div>
          ) : (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.sender === "me" ? "ml-auto bg-primary text-primary-fg" : "bg-surface text-fg"
            }`}
          >
            {m.locked ? (
              <div>
                <p className="text-muted">{m.body}</p>
                <button
                  type="button"
                  className="mt-2 rounded-full bg-gold/20 px-3 py-1 text-xs text-gold"
                  disabled={unlock.isPending}
                  onClick={() => unlock.mutate(m.id)}
                >
                  Unlock ·{" "}
                  {m.kind === "gift"
                    ? costs.unlockGift
                    : m.kind === "photo"
                      ? costs.unlockPhoto
                      : costs.unlockMessage}{" "}
                  credits
                </button>
              </div>
            ) : m.kind === "gift" ? (
              <p className="text-2xl">{m.body}</p>
            ) : (
              <p>{m.body}</p>
            )}
          </div>
          )
        )}
        {isPeerTyping ? (
          <div className="max-w-[85%] rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
            <span className="inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
            <span className="ml-2 text-xs">typing…</span>
          </div>
        ) : null}
      </div>

      {showGifts ? (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
          {GIFT_PRESETS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              disabled={gift.isPending}
              onClick={() => gift.mutate(g.id)}
            >
              {g.emoji} {g.label} · {costs.sendGift} cr
            </button>
          ))}
          <button type="button" className="text-xs text-muted" onClick={() => setShowGifts(false)}>
            Cancel
          </button>
        </div>
      ) : null}

      <form
        className="mt-2 flex gap-2 border-t border-border pt-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          send.mutate();
        }}
      >
        <button
          type="button"
          className="rounded-full border border-border px-3 text-sm"
          onClick={() => setShowGifts(true)}
        >
          🎁
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            hasPlan
              ? "Message"
              : (data.wallet.free_sends_left ?? data.wallet.free_texts) > 0 &&
                  (data.wallet.free_sends_left ?? 0) < 100
                ? `Message (${data.wallet.free_sends_left ?? data.wallet.free_texts} free left in this chat)`
                : (data.wallet.free_sends_left ?? data.wallet.free_texts) > 0
                  ? "Message"
                  : `Message (${costs.sendMessage} credit)`
          }
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-fg"
        >
          Send
        </button>
      </form>
      <p className="pb-2 text-[10px] text-muted">
        Video: {ECONOMY.videoCallStartCredits} credits to place a call · per-minute rates when both sides are live.
        See Wallet for terms.
      </p>
    </div>
  );
}
