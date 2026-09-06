import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import { adminSetWithdraw, getAdminDashboard, getMe } from "@/lib/local-api";

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

  const setStatus = useMutation({
    mutationFn: (p: { requestId: string; status: "paid" | "rejected" }) =>
      adminSetWithdraw({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-dash"] }),
  });

  if (me.isPending) return <p className="px-5 text-muted">Loading…</p>;
  if (!me.data?.profile?.is_admin) {
    return <Navigate to="/discover" />;
  }

  const d = dash.data?.ok ? dash.data : null;

  return (
    <div className="px-5 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Admin</h1>
        <Link to="/me" className="text-sm text-gold">
          You
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Withdrawals, support messages, and credit totals for real users on this device / store.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-medium text-gold">Pending withdrawals</h2>
        <p className="text-xs text-muted">Release payment only after verifying the user (phone/email).</p>
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
                <p className="text-xs text-muted">
                  {r.amountCredits} credits · {new Date(r.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-fg"
                    onClick={() => setStatus.mutate({ requestId: r.id, status: "paid" })}
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs"
                    onClick={() => setStatus.mutate({ requestId: r.id, status: "rejected" })}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">Support inbox</h2>
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {!d?.supportMessages?.length ? (
            <li className="text-sm text-muted">No support messages</li>
          ) : null}
          {d?.supportMessages?.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border bg-surface p-3 text-sm">
              <p className="font-medium">
                {m.displayName} · {m.email}
              </p>
              <p className="text-xs text-muted">{m.phone}</p>
              <p className="mt-1">{m.body}</p>
              <p className="text-[10px] text-muted">{new Date(m.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">Top spenders</h2>
        <StatsTable rows={d?.topSpenders ?? []} mode="spend" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">Top earners</h2>
        <StatsTable rows={d?.topEarners ?? []} mode="earn" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-gold">All users</h2>
        <StatsTable rows={d?.users ?? []} mode="spend" />
      </section>
    </div>
  );
}

function StatsTable({
  rows,
  mode,
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
  mode: "spend" | "earn";
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
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
          {rows.map((r, i) => (
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
  );
}
