'use client';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CoinBadge } from '@/components/AppShell';
import { Button, ErrorState, Modal, Skeleton } from '@/components/ui';
import { api, useJoinMutation, useMeQuery, usePackagesQuery } from '@/features/api/api';
import { PackageCard } from '@/features/shop/PackageCard';
import { useBuy } from '@/features/shop/useBuy';
import { errorCode, errorMessage } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';

const FRIENDLY: Record<string, string> = {
  room_full: 'This room is full right now. Try again in a moment.',
  room_not_found: 'This room has closed. Empty rooms close after 30 minutes.',
  invalid_invite_code: 'The invite code is wrong.',
};

function OutOfCoins({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = usePackagesQuery();
  const { buy, busyId, doneId } = useBuy();
  return (
    <Modal open={open} onClose={onClose} title="Out of coins">
      <p className="mb-4 text-sm text-muted">Grab a demo pack. Your balance in the game updates right away.</p>
      <div className="space-y-2.5">
        {data?.packages.slice(0, 3).map((p) => <PackageCard key={p.id} compact pack={p} busy={busyId === p.id} done={doneId === p.id} onBuy={() => buy(p)} />)}
      </div>
      <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>Back to the game</Button>
    </Modal>
  );
}

export function Play({ roomKey }: { roomKey: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const code = useSearchParams().get('code') ?? undefined;
  const { data: me } = useMeQuery();
  const [join, { data, error, isLoading }] = useJoinMutation();
  const frame = useRef<HTMLIFrameElement>(null);
  const started = useRef(false);
  const [coinsOpen, setCoinsOpen] = useState(false);

  const start = useCallback(() => void join({ key: roomKey, inviteCode: code }), [join, roomKey, code]);
  useEffect(() => {
    if (started.current) return; // React strict mode runs effects twice in development
    started.current = true;
    start();
  }, [start]);

  // Messages from the game. Accepted only from the game's own origin and window.
  useEffect(() => {
    if (!data) return;
    const origin = new URL(data.playUrl).origin;
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== origin || ev.source !== frame.current?.contentWindow) return;
      const msg = ev.data as { source?: string; type?: string };
      if (msg?.source !== 'minigames') return;
      if (msg.type === 'needCoins') setCoinsOpen(true);
      if (msg.type === 'round') dispatch(api.util.invalidateTags(['Me', 'History']));
      if (msg.type === 'exit') router.push('/');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [data, dispatch, router]);

  const roomName = data?.room.name ?? (roomKey === 'main' ? 'Global room' : 'Room');
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-bg px-3">
        <Link href="/" aria-label="Back to lobby" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden /> <span className="hidden sm:inline">Lobby</span>
        </Link>
        <h1 className="truncate font-display font-bold">{roomName}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { started.current = false; start(); }} aria-label="Reload game" className="grid size-10 place-items-center rounded-full border border-line text-muted hover:text-ink"><RefreshCw className="size-4" /></button>
          <CoinBadge balance={me?.balance} />
        </div>
      </header>

      <div className="relative mx-auto min-h-0 w-full max-w-[520px] flex-1">
        {isLoading && <div className="space-y-3 p-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-72 w-full" /><Skeleton className="h-24 w-full" /></div>}
        {error && (
          <div className="p-4">
            <ErrorState message={FRIENDLY[errorCode(error) ?? ''] ?? errorMessage(error, 'Could not open the room.')} onRetry={start} />
            <Link href="/" className="mt-4 block text-center text-sm text-gold hover:underline">Back to the lobby</Link>
          </div>
        )}
        {data && (
          <iframe
            ref={frame}
            key={data.playUrl}
            src={data.playUrl}
            title={`Lucky Wheel, ${roomName}`}
            allow="autoplay; fullscreen"
            className="size-full border-0 bg-black"
          />
        )}
      </div>
      <OutOfCoins open={coinsOpen} onClose={() => setCoinsOpen(false)} />
    </div>
  );
}
