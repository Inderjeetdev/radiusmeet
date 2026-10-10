import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import {
  adminCloseSupportTicket,
  adminGrantCredits,
  adminReopenSupportTicket,
  adminReplySupport,
  adminSetPayoutPaypal,
  adminSetWithdraw,
  getAdminDashboard,
  getMe,
} from "@/lib/local-api";
import { PAYOUT_PAYPAL_EMAIL } from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AppGate>
      <AdminPage />
    </AppGate>
  ),
});

function AdminPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const dash = useQuery({
    queryKey: ["admin-dash"],
    queryFn: () => getAdminDashboard(),
    enabled: Boolean(me.data?.profile?.is_admin),
  });

  const [payoutEmail, setPayoutEmail] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState(100);
  const [replyBody, setReplyBody] = useState("");
  const [activeThreadEmail, setActiveThreadEmail] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<"open" | "closed" | "all">("open");
  const [note, setNote] = useState<string | null>(null);

  // Prefill payout from dashboard once loaded
  const savedPayout = dash.data && "payoutPaypal" in dash.data ? dash.data.payoutPaypal : "";
  const payoutDisplay = payoutEmail || savedPayout || PAYOUT_PAYPAL_EMAIL;

  const setStatus = useMutation({
    mutationFn: (p: {
      requestId: string;
      status: "paid" | "rejected" | "credits_rewarded";
    }) => adminSetWithdraw({ data: p }),
    onSuccess: (res) => {
      if (res && "message" in res && res.message) setNote(String(res.message));
      else setNote("Request updated");
      void qc.invalidateQueries({ queryKey: ["admin-dash"] });
    },
  });

  const savePayout = useMutation({
    mutationFn: () => adminSetPayoutPaypal({ data: { email: payoutDisplay } }),
    onSuccess: (res) => {
      setNote(res.message ?? "Saved");
      void qc.invalidateQueries({ queryKey: ["admin-dash"] });
    },
  });

  const grant = useMutation({
    mutationFn: (amount: number) =>
      adminGrantCredits({ data: { email: grantEmail.trim(), amount } }),
    onSuccess: (res) => {
      const msg = res.message ?? (res.ok ? "Done" : "Failed");
      setNote(msg);
      window.alert(msg);
      if (res.ok) {
        setGrantEmail("");
        setGrantAmount(100);
        void qc.invalidateQueries({ queryKey: ["admin-dash"] });
        void qc.invalidateQueries({ queryKey: ["me"] });
      }
    },
  });

  const threads = (dash.data && dash.data.ok && "supportThreads" in dash.data
    ? dash.data.supportThreads
    : []) as Array<{
    email: string;
    userId: string;
    displayName: string;
    phone: string;
    status: "open" | "closed";
    lastAt: number;
    preview: string;
    messages: Array<{
      id: string;
      body: string;
      fromAdmin: boolean;
      createdAt: number;
      displayName: string;
      email: string;
      phone: string;
      userId: string;
    }>;
  }>;
  const activeThread = threads.find((th) => th.email.toLowerCase() === (activeThreadEmail || "").toLowerCase()) ?? null;
  const filteredThreads = threads.filter((th) =>
    ticketFilter === "all" ? true : th.status === ticketFilter,
  );

  const reply = useMutation({
    mutationFn: () => {
      if (!activeThread) return Promise.resolve({ ok: false as const, message: "No thread" });
      return adminReplySupport({
        data: {
          body: replyBody,
          toUserId: activeThread.userId,
          toEmail: activeThread.email,
          toName: activeThread.displayName,
          toPhone: activeThread.phone,
        },
      });
    },
    onSuccess: (res) => {
      setNote(res.message ?? (res.ok ? "Reply sent" : "Failed"));
      if (res.ok) {
        setReplyBody("");
        void qc.invalidateQueries({ queryKey: ["admin-dash"] });
      }
    },
  });

  const closeTicket = useMutation({
    mutationFn: (email: string) => adminCloseSupportTicket({ data: { email } }),
    onSuccess: (res) => {
      setNote(res.message ?? "Closed");
      setActiveThreadEmail(null);
      void qc.invalidateQueries({ queryKey: ["admin-dash"] });
    },
  });

  const reopenTicket = useMutation({
    mutationFn: (email: string) => adminReopenSupportTicket({ data: { email } }),
    onSuccess: (res) => {
      setNote(res.message ?? "Reopened");
      void qc.invalidateQueries({ queryKey: ["admin-dash"] });
    },
  });

  if (me.isPending) return <p className="px-5 text-muted">Loading…</p>;
  if (!me.data?.profile && me.data?.wallet) return <Navigate to="/setup" />;
  if (!me.data?.profile) return <Navigate to="/login" />;
  if (!me.data.profile.is_admin) {
    return (
      <div className="px-5 py-10">
        <h1 className="font-display text-2xl">Admin only</h1>
        <p className="mt-2 text-sm text-muted">Signed in as: {me.data.profile.email}</p>
        <Link to="/discover" className="mt-4 inline-block text-gold underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  const d = dash.data?.ok ? dash.data : null;
  const supportMsgs = d?.supportMessages ?? [];

  return (
    <div className="px-5 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Admin</h1>
        <Link to="/me" className="text-sm text-gold">
          You
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Support replies, manual credits, payouts, and user stats on this device.
      </p>
      {note ? <p className="mt-2 text-sm text-gold">{note}</p> : null}

      {/* Payout email */}
      <section className="mt-6 rounded-3xl border border-border bg-surface p-4">
        <h2 className="text-lg font-medium text-gold">Your payout tools (admin only)</h2>
        <p className="text-xs text-muted">
          Buyer payments: <strong>Google Play → your bank</strong>. Women only earn points; when they request a
          reward, you send cash via PayPal/UPI/bank or grant credits — never automatic to their wallet as cash.
        </p>
        <input
          type="email"
          className="mt-2 w-full rounded-2xl border border-border bg-bg px-4 py-2 text-sm"
          placeholder="your-paypal@email.com"
          value={payoutEmail || savedPayout || PAYOUT_PAYPAL_EMAIL}
          onChange={(e) => setPayoutEmail(e.target.value)}
        />
        <button
          type="button"
          className="mt-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-fg"
          disabled={savePayout.isPending}
          onClick={() => savePayout.mutate()}
        >
          Save payout email
        </button>
      </section>

      {/* Grant / remove credits */}
      <section className="mt-6 rounded-3xl border border-border bg-surface p-4">
        <h2 className="text-lg font-medium text-gold">Add or remove credits</h2>
        <p className="text-xs text-muted">
          Offline payments or fixes. User must already exist on this phone (same browser). After success,
          a popup confirms the new balance and the form clears.
        </p>
        <label className="mt-2 block text-sm text-muted">User email</label>
        <input
          type="email"
          className="w-full rounded-2xl border border-border bg-bg px-4 py-2 text-sm"
          placeholder="user@email.com"
          value={grantEmail}
          onChange={(e) => setGrantEmail(e.target.value)}
        />
        <label className="mt-2 block text-sm text-muted">Amount</label>
        <input
          type="number"
          min={1}
          className="w-full rounded-2xl border border-border bg-bg px-4 py-2 text-sm"
          value={grantAmount}
          onChange={(e) => setGrantAmount(Number(e.target.value))}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-fg"
            disabled={grant.isPending || !grantEmail.trim() || grantAmount <= 0}
            onClick={() => grant.mutate(Math.abs(Number(grantAmount)))}
          >
            Grant credits
          </button>
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm"
            disabled={grant.isPending || !grantEmail.trim() || grantAmount <= 0}
            onClick={() => grant.mutate(-Math.abs(Number(grantAmount)))}
          >
            Remove credits
          </button>
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm"
            onClick={() => setGrantEmail(me.data?.profile?.email ?? "")}
            title="Fill the form with your admin email so you can credit your own account"
          >
            Use my email
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          <strong>Use my email</strong> only fills the email box with your admin address (for crediting yourself).
        </p>
      </section>

      {/* Withdrawals */}
      <section className="mt-6">
        <h2 className="text-lg font-medium text-gold">Pending reward requests</h2>
        <p className="text-xs text-muted">
          Women collect points only. You release cash outside the app or grant in-app credits. User purchases stay
          with the platform (Play → your bank).
        </p>
        <ul className="mt-3 space-y-2">
          {!d?.withdrawRequests?.filter((r) => r.status === "pending").length ? (
            <li className="text-sm text-muted">No pending requests</li>
          ) : null}
          {d?.withdrawRequests
            ?.filter((r) => r.status === "pending")
            .map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
                <p className="font-medium">
                  {r.displayName} · ${r.amountUsd}
                </p>
                <p className="text-muted">
                  {r.email} · {r.phone}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-3 py-1 text-xs text-primary-fg"
                    onClick={() => setStatus.mutate({ requestId: r.id, status: "paid" })}
                  >
                    Mark cash paid
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gold px-3 py-1 text-xs text-gold"
                    onClick={() => setStatus.mutate({ requestId: r.id, status: "credits_rewarded" })}
                  >
                    Grant credit reward
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1 text-xs"
                    onClick={() => setStatus.mutate({ requestId: r.id, status: "rejected" })}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </section>

      
      {/* Support inbox — threads + popup */}
      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">Support inbox</h2>
        <p className="text-xs text-muted">Each user is a separate ticket. Open to chat, close when resolved.</p>
        <div className="mt-2 flex gap-2">
          {(["open", "closed", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTicketFilter(f)}
              className={`rounded-full px-3 py-1 text-xs ${
                ticketFilter === f ? "bg-primary text-primary-fg" : "border border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {!filteredThreads.length ? (
            <li className="text-sm text-muted">No {ticketFilter === "all" ? "" : ticketFilter + " "}tickets</li>
          ) : null}
          {filteredThreads.map((th) => (
            <li key={th.email}>
              <button
                type="button"
                className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-left text-sm"
                onClick={() => setActiveThreadEmail(th.email)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {th.displayName} · {th.email}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      th.status === "open" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/30 text-muted"
                    }`}
                  >
                    {th.status}
                  </span>
                </div>
                <p className="text-xs text-muted">{th.phone}</p>
                <p className="mt-1 truncate text-muted">{th.preview}</p>
                <p className="text-[10px] text-muted">{new Date(th.lastAt).toLocaleString()}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Support ticket popup */}
      {activeThread ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-3xl border border-border bg-bg shadow-xl">
            <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="font-medium">
                  {activeThread.displayName}
                  <span className="ml-2 text-xs text-muted">{activeThread.status}</span>
                </p>
                <p className="text-xs text-muted">
                  {activeThread.email} · {activeThread.phone}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs"
                onClick={() => setActiveThreadEmail(null)}
              >
                Close window
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {activeThread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.fromAdmin ? "ml-auto bg-primary text-primary-fg" : "bg-surface text-fg"
                  }`}
                >
                  <p className="text-[10px] opacity-70">{m.fromAdmin ? "Admin" : m.displayName}</p>
                  <p>{m.body}</p>
                  <p className="text-[10px] opacity-60">{new Date(m.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
            {activeThread.status === "open" ? (
              <div className="border-t border-border px-4 py-3">
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="Type a reply…"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-4 py-2 text-sm text-primary-fg"
                    disabled={!replyBody.trim() || reply.isPending}
                    onClick={() => reply.mutate()}
                  >
                    Send reply
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-4 py-2 text-sm"
                    disabled={closeTicket.isPending}
                    onClick={() => closeTicket.mutate(activeThread.email)}
                  >
                    Close ticket
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border px-4 py-3">
                <p className="text-xs text-muted">This ticket is closed.</p>
                <button
                  type="button"
                  className="mt-2 rounded-full border border-border px-4 py-2 text-sm"
                  disabled={reopenTicket.isPending}
                  onClick={() => reopenTicket.mutate(activeThread.email)}
                >
                  Reopen ticket
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">Top spenders</h2>
        <StatsTable rows={d?.topSpenders ?? []} />
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">Top earners</h2>
        <StatsTable rows={d?.topEarners ?? []} />
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">All users</h2>
        <StatsTable rows={d?.users ?? []} />
      </section>
    </div>
  );
}

function StatsTable({
  rows,
  pageSize = 10,
}: {
  rows: Array<{
    displayName: string;
    email: string;
    phone: string;
    gender: string;
    creditsSpent: number;
    creditsPurchased: number;
    earnings: number;
    eligibleEarnings: number;
    credits: number;
  }>;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="mt-3">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">Spent</th>
              <th className="px-3 py-2">Bought</th>
              <th className="px-3 py-2">Earned</th>
              <th className="px-3 py-2">6mo</th>
              <th className="px-3 py-2">Bal</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2">
                  <p className="font-medium text-fg">{r.displayName}</p>
                  <p className="text-muted">{r.email}</p>
                </td>
                <td className="px-3 py-2">{r.gender}</td>
                <td className="px-3 py-2">{r.creditsSpent}</td>
                <td className="px-3 py-2">{r.creditsPurchased}</td>
                <td className="px-3 py-2">{r.earnings}</td>
                <td className="px-3 py-2">{r.eligibleEarnings}</td>
                <td className="px-3 py-2">{r.credits}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-muted">
                  No other users on this device yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize ? (
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 disabled:opacity-40"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 disabled:opacity-40"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
