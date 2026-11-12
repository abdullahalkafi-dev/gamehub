'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, ErrorState, PageTitle, Skeleton } from '@/components/ui';
import { useAdminOverviewQuery, useAdminRoomsQuery, useAdminUsersQuery, useMeQuery } from '@/features/api/api';
import { errorMessage, fmt, timeAgo } from '@/lib/format';

export function Admin() {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const isAdmin = me?.user.role === 'admin';
  useEffect(() => { if (me && !isAdmin) router.replace('/'); }, [me, isAdmin, router]);
  const [page, setPage] = useState(1);
  const overview = useAdminOverviewQuery(undefined, { skip: !isAdmin });
  const users = useAdminUsersQuery(page, { skip: !isAdmin });
  const rooms = useAdminRoomsQuery(undefined, { skip: !isAdmin });
  if (!isAdmin) return <Skeleton className="h-40 w-full" />;
  if (overview.error) return <ErrorState message={errorMessage(overview.error)} onRetry={overview.refetch} />;

  const o = overview.data;
  return (
    <>
      <PageTitle title="Admin" sub="Overview of GameHub." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Players', o?.users], ['Rooms', o?.rooms], ['Purchases', o?.purchases], ['Coins sold', o?.coinsSold]].map(([l, v]) => (
          <Card key={l as string} className="p-4"><p className="text-sm text-muted">{l}</p><p className="font-display text-2xl font-bold tabular-nums">{v === undefined ? '…' : fmt(v as number)}</p></Card>
        ))}
      </div>

      <h2 className="font-display mt-8 mb-2 text-lg font-bold">Players</h2>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-muted"><tr><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Email</th><th className="px-4 py-2.5 font-medium">Joined</th></tr></thead>
          <tbody>{users.data?.users.map((u) => <tr key={u.id} className="border-t border-line"><td className="px-4 py-2.5">{u.displayName} {u.role === 'admin' && <Badge tone="gold">admin</Badge>}</td><td className="px-4 py-2.5 text-muted">{u.email}</td><td className="px-4 py-2.5 text-muted">{timeAgo(u.createdAt)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-muted">
        <span>{users.data ? `${fmt(users.data.total)} total` : ''}</span>
        <div className="flex gap-2"><Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button size="sm" variant="ghost" disabled={!users.data || page * 25 >= users.data.total} onClick={() => setPage((p) => p + 1)}>Next</Button></div>
      </div>

      <h2 className="font-display mt-8 mb-2 text-lg font-bold">Player rooms</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {rooms.data?.rooms.length === 0 && <li className="px-4 py-4 text-muted">No rooms.</li>}
        {rooms.data?.rooms.map((r) => <li key={r.key} className="flex justify-between gap-3 px-4 py-3"><span>{r.name} <span className="text-muted">by {r.owner}</span></span><Badge tone={r.visibility === 'private' ? 'gold' : 'violet'}>{r.visibility}</Badge></li>)}
      </ul>

      <h2 className="font-display mt-8 mb-2 text-lg font-bold">Recent webhooks</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {o?.recentWebhooks.length === 0 && <li className="px-4 py-4 text-muted">Nothing received yet.</li>}
        {o?.recentWebhooks.map((w) => <li key={w.id} className="flex justify-between gap-3 px-4 py-3 text-sm"><span className="font-mono">{w.type}</span><span className="text-muted">{w.livemode ? 'live' : 'test'} · {timeAgo(w.receivedAt)}</span></li>)}
      </ul>
    </>
  );
}
