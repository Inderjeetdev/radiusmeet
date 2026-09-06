import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppGate } from "@/components/app-gate";
import { listInbox } from "@/lib/local-api";

export const Route = createFileRoute("/chats/")({
  component: () => (
    <AppGate>
      <Inbox />
    </AppGate>
  ),
});

function Inbox() {
  const q = useQuery({ queryKey: ["inbox"], queryFn: () => listInbox() });
  const rows = q.data?.conversations ?? [];
  const wallet = q.data?.wallet;
  return (
    <div className="px-5">
      <h1 className="font-display text-3xl">Chats</h1>
      <p className="mt-1 text-sm text-muted">
        {wallet?.has_plan
          ? `${wallet.credits} credits · ${wallet.free_texts} free texts left`
          : "Without a plan you only see that someone messaged you — not the text. Buy Starter to unlock."}
      </p>
      <ul className="mt-6 space-y-2">
        {rows.length === 0 ? (
          <li className="text-muted">No conversations yet. Meet someone first.</li>
        ) : null}
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              to="/chats/$id"
              params={{ id: c.id }}
              className="block rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <p className="text-sm text-gold">
                {c.peer_kind === "sample" ? "Nearby" : "Member"}
                {c.locked_preview ? " · locked" : ""}
              </p>
              <p className="truncate text-fg">{c.last_body || "Say hello"}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!wallet?.has_plan ? (
        <Link to="/wallet" className="mt-6 inline-block text-sm text-gold underline">
          Buy Starter to read messages →
        </Link>
      ) : null}
    </div>
  );
}
