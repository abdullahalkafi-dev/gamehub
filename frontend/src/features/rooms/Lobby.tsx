'use client';
import { Clock, Copy, Globe2, KeyRound, Lock, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Modal, PageTitle, Skeleton } from '@/components/ui';
import { useDeleteRoomMutation, useLazyRoomByCodeQuery, useRoomsQuery } from '@/features/api/api';
import { pushToast } from '@/features/ui/toastSlice';
import { errorMessage, fmt } from '@/lib/format';
import type { RoomView } from '@/lib/types';
import { useAppDispatch } from '@/store/hooks';

function RoomCard({ room }: { room: RoomView }) {
  const dispatch = useAppDispatch();
  const [del, delState] = useDeleteRoomMutation();
  const full = room.capacity != null && room.online >= room.capacity;

  async function remove() {
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    try {
      await del(room.key).unwrap();
      dispatch(pushToast('success', 'Room deleted'));
    } catch (e) {
      dispatch(pushToast('error', errorMessage(e, 'Could not delete the room')));
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(room.inviteCode ?? '');
      dispatch(pushToast('success', 'Invite code copied'));
    } catch {
      dispatch(pushToast('info', `Invite code: ${room.inviteCode}`));
    }
  }

  return (
    <Card className="flex flex-col gap-4 transition hover:border-violet/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold">{room.name}</h3>
          <p className="truncate text-sm text-muted">by {room.owner?.displayName}{room.isMine && ' (you)'}</p>
        </div>
        {room.visibility === 'private' ? <Badge tone="gold"><Lock className="size-3" aria-hidden /> Private</Badge> : <Badge>Public</Badge>}
      </div>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <div className="flex items-center gap-1.5"><Users className="size-4" aria-hidden /><dt className="sr-only">Players</dt><dd>{room.online}{room.capacity ? ` / ${room.capacity}` : ''} playing</dd></div>
        {room.timing && <div className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /><dt className="sr-only">Round</dt><dd>{room.timing.betSeconds}s betting</dd></div>}
        {room.chips && <div><dt className="sr-only">Chips</dt><dd>Chips {room.chips.join(' · ')}</dd></div>}
      </dl>
      {room.isMine && room.inviteCode && (
        <button onClick={copy} className="flex items-center justify-between rounded-xl border border-dashed border-gold/40 bg-gold-dim px-3.5 py-2.5 text-left transition hover:border-gold">
          <span><span className="block text-xs text-muted">Invite code</span><span className="font-mono text-lg font-bold tracking-[0.25em] text-gold">{room.inviteCode}</span></span>
          <Copy className="size-4 text-gold" aria-label="Copy code" />
        </button>
      )}
      <div className="mt-auto flex gap-2">
        <Link href={`/play/${room.key}`} className={`flex h-11 flex-1 items-center justify-center rounded-xl bg-violet font-medium text-white transition hover:brightness-110 ${full ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={full}>
          {full ? 'Room full' : 'Join'}
        </Link>
        {room.isMine && (
          <Button variant="danger" onClick={remove} size="icon" loading={delState.isLoading} aria-label={`Delete ${room.name}`}><Trash2 className="size-4" /></Button>
        )}
      </div>
    </Card>
  );
}

function CodeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [lookup, { isFetching }] = useLazyRoomByCodeQuery();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { room } = await lookup(code.trim().toUpperCase()).unwrap();
      onClose();
      router.push(`/play/${room.key}?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    } catch (err) {
      setError(errorMessage(err, 'No room matches this code.'));
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Join with a code">
      <form onSubmit={go} className="space-y-4">
        <Field label="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoFocus autoComplete="off" placeholder="e.g. K7M2QX" error={error} className="" />
        <Button type="submit" variant="gold" className="w-full" loading={isFetching} disabled={code.trim().length < 4}>Find room</Button>
      </form>
    </Modal>
  );
}

export function Lobby() {
  const { data, error, isLoading, refetch } = useRoomsQuery(undefined, { pollingInterval: 10_000, refetchOnFocus: true });
  const [codeOpen, setCodeOpen] = useState(false);
  const global = data?.rooms.find((r) => r.isGlobal);
  const others = data?.rooms.filter((r) => !r.isGlobal) ?? [];

  return (
    <>
      <PageTitle
        title="Rooms"
        sub="Pick a table and start spinning."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCodeOpen(true)}><KeyRound className="size-4" aria-hidden /> Join with code</Button>
            <Link href="/rooms/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet px-5 font-medium text-white transition hover:brightness-110"><Plus className="size-4" aria-hidden /> Create room</Link>
          </div>
        }
      />

      {isLoading && <div className="space-y-4"><Skeleton className="h-40 w-full" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div></div>}
      {error && !data && <ErrorState message={errorMessage(error, 'Could not load the rooms.')} onRetry={refetch} />}

      {global && (
        <Link href="/play/main" className="group relative mb-6 block overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-[#2a1f4f] via-surface to-[#3a2a0c] p-6 transition hover:border-gold sm:p-8">
          <div className="absolute -top-16 -right-16 size-64 rounded-full bg-gold/10 blur-3xl" aria-hidden />
          <Badge tone="gold"><Globe2 className="size-3" aria-hidden /> Open to everyone</Badge>
          <h2 className="font-display mt-3 text-3xl font-bold">Global room</h2>
          <p className="mt-1 max-w-md text-muted">Jump in instantly. No code, no waiting. Chips {global.chips?.join(' · ')}.</p>
          <div className="mt-5 flex items-center gap-4">
            <span className="inline-flex h-12 items-center rounded-xl bg-gold px-7 font-semibold text-black transition group-hover:brightness-105">Play now</span>
            <span className="flex items-center gap-1.5 text-sm text-muted"><Users className="size-4" aria-hidden />{fmt(global.online)} playing</span>
          </div>
        </Link>
      )}

      {data && (
        <section aria-label="Player rooms">
          <h2 className="font-display mb-3 text-lg font-bold">Player rooms</h2>
          {others.length === 0 ? (
            <EmptyState icon={<Users className="size-6" />} title="No player rooms yet" text="Create the first one and share its code with friends, or play in the Global room." action={<Link href="/rooms/new" className="inline-flex h-11 items-center rounded-xl bg-violet px-5 font-medium text-white">Create a room</Link>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">{others.map((r) => <RoomCard key={r.key} room={r} />)}</div>
          )}
        </section>
      )}
      <CodeModal open={codeOpen} onClose={() => setCodeOpen(false)} />
    </>
  );
}
