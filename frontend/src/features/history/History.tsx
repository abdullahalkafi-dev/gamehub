'use client';
import { ChevronDown, Dices } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, EmptyState, ErrorState, PageTitle, Skeleton } from '@/components/ui';
import { useHistoryQuery, useStatsQuery } from '@/features/api/api';
import { errorMessage, fmt, fmtSigned, timeAgo } from '@/lib/format';
import type { Round } from '@/lib/types';

const pretty = (s: string) => s.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const tone = (n: number) => (n > 0 ? 'text-win' : n < 0 ? 'text-loss' : 'text-muted');

function Stat({ label, value, colored }: { label: string; value: string; colored?: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className={`font-display mt-1 text-xl font-bold tabular-nums sm:text-2xl ${colored !== undefined ? tone(colored) : ''}`}>{value}</p>
    </Card>
  );
}

function RoundRow({ r }: { r: Round }) {
  const [open, setOpen] = useState(false);
  const labels = new Map(r.bets?.map((b) => [b.option, b.label ?? pretty(b.option)]));
  return (
    <li className="border-b border-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/60">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{r.roomName} <span className="text-muted">· round {r.round ?? '?'}</span></p>
          <p className="text-sm text-muted">{timeAgo(r.time)} · result {r.result.map((x) => labels.get(x) ?? pretty(x)).join(', ') || '—'}</p>
        </div>
        <div className="text-right">
          <p className={`font-semibold tabular-nums ${tone(r.net)}`}>{fmtSigned(r.net)}</p>
          <p className="text-xs text-muted">bet {fmt(r.bet)}</p>
        </div>
        <ChevronDown className={`size-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="slide-up bg-surface-2/40 px-4 py-3 text-sm">
          {r.bets && r.bets.length > 0 ? (
            <table className="w-full">
              <thead className="text-left text-xs text-muted"><tr><th className="pb-1 font-medium">Option</th><th className="pb-1 text-right font-medium">Staked</th><th className="pb-1 text-right font-medium">Won</th></tr></thead>
              <tbody>
                {r.bets.map((b) => (
                  <tr key={b.option}><td className="py-0.5">{b.label ?? pretty(b.option)}</td><td className="py-0.5 text-right tabular-nums">{fmt(b.amount)}</td><td className={`py-0.5 text-right tabular-nums ${b.win > 0 ? 'text-win' : 'text-muted'}`}>{fmt(b.win)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">Total staked {fmt(r.bet)}, won {fmt(r.win)}. Option details are not available for older rounds.</p>
          )}
        </div>
      )}
    </li>
  );
}

function RoundsPage({ room, before, onMore }: { room?: string; before?: number; onMore?: (next: number) => void }) {
  const { data, error, isFetching, refetch } = useHistoryQuery({ room, before });
  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (!data) return <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  return (
    <>
      {data.rounds.map((r, i) => <RoundRow key={`${r.room}-${r.round}-${r.time}-${i}`} r={r} />)}
      {data.nextBefore && onMore && (
        <div className="p-3 text-center"><Button variant="ghost" size="sm" loading={isFetching} onClick={() => onMore(data.nextBefore!)}>Load older rounds</Button></div>
      )}
    </>
  );
}

export function History() {
  const { data: stats, error, isLoading, refetch } = useStatsQuery();
  const [room, setRoom] = useState('');
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const filter = (r: string) => { setRoom(r); setCursors([undefined]); };

  return (
    <>
      <PageTitle title="My history" sub="Every round you played, with what you won or lost." />
      {error && !stats && <ErrorState message={errorMessage(error)} onRetry={refetch} />}
      {isLoading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}

      {stats && stats.rounds === 0 && (
        <EmptyState icon={<Dices className="size-6" />} title="No rounds yet" text="Play a round in the Global room and your results will show up here." action={<Link href="/play/main" className="inline-flex h-11 items-center rounded-xl bg-gold px-6 font-semibold text-black">Play now</Link>} />
      )}

      {stats && stats.rounds > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Net result" value={fmtSigned(stats.net)} colored={stats.net} />
            <Stat label="Rounds played" value={fmt(stats.rounds)} />
            <Stat label="Win rate" value={`${stats.winRate}%`} />
            <Stat label="Biggest win" value={fmt(stats.biggestWin)} />
          </div>
          <p className="mt-2 text-xs text-muted">Wagered {fmt(stats.wagered)} · won back {fmt(stats.won)}{stats.truncated && ' · based on your latest 1,000 rounds'}</p>

          {stats.byRoom.length > 1 && (
            <section className="mt-6" aria-label="By room">
              <h2 className="font-display mb-2 text-lg font-bold">By room</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => filter('')} aria-pressed={room === ''} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${room === '' ? 'border-violet bg-violet-dim' : 'border-line bg-surface'}`}>All rooms</button>
                {stats.byRoom.map((b) => (
                  <button key={b.room} onClick={() => filter(b.room)} aria-pressed={room === b.room} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${room === b.room ? 'border-violet bg-violet-dim' : 'border-line bg-surface'}`}>
                    {b.roomName} <span className={tone(b.net)}>{fmtSigned(b.net)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6" aria-label="Rounds">
            <h2 className="font-display mb-2 flex items-center gap-2 text-lg font-bold">Rounds {room && <Badge>{stats.byRoom.find((b) => b.room === room)?.roomName}</Badge>}</h2>
            <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
              {cursors.map((c, i) => (
                <RoundsPage key={`${room}-${c ?? 'first'}`} room={room || undefined} before={c} onMore={i === cursors.length - 1 ? (n) => setCursors((cur) => [...cur, n]) : undefined} />
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
