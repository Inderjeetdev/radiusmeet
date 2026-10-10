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
          ? `${wallet.credits} credits`
          : "Free tier: limited chats & messages. Buy Starter for full access."}
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
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-fg">
                  {c.peer_name}
                  {c.peer_age != null ? `, ${c.peer_age}` : ""}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    c.peer_online
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted/30 text-muted"
                  }`}
                >
                  {c.peer_online ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">
                {c.last_body || "Say hello"}
                {c.locked_preview ? " · locked" : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {!wallet?.has_plan ? (
        <Link to="/wallet" className="mt-6 inline-block text-sm text-gold underline">
          Buy Starter to unlock everything →
        </Link>
      ) : null}
    </div>
  );
}
