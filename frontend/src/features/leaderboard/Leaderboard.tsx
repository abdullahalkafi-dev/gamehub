'use client';
import { Crown, Trophy } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, PageTitle, Skeleton } from '@/components/ui';
import { useLeaderboardQuery } from '@/features/api/api';
import { errorMessage, fmt } from '@/lib/format';

const PERIODS = [['day', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All time']] as const;
const METRICS = [['winnings', 'Total won'], ['net', 'Net profit'], ['biggest_win', 'Biggest win'], ['wagered', 'Total bet']] as const;
const medal = ['text-gold', 'text-[#c0c7d6]', 'text-[#d08a52]'];

export function Leaderboard() {
  const [period, setPeriod] = useState<string>('week');
  const [metric, setMetric] = useState<string>('winnings');
  const [scope, setScope] = useState<'' | 'main'>('');
  const { data, error, isLoading, refetch } = useLeaderboardQuery({ period, metric, room: scope || undefined });

  const pill = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm transition ${active ? 'border-gold bg-gold-dim text-gold' : 'border-line bg-surface text-muted hover:text-ink'}`;
  return (
    <>
      <PageTitle title="Leaderboard" sub="See who is on a streak." />
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Period">
          {PERIODS.map(([v, l]) => <button key={v} className={pill(period === v)} aria-pressed={period === v} onClick={() => setPeriod(v)}>{l}</button>)}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Ranking by">
            {METRICS.map(([v, l]) => <button key={v} className={pill(metric === v)} aria-pressed={metric === v} onClick={() => setMetric(v)}>{l}</button>)}
          </div>
          <select aria-label="Rooms" value={scope} onChange={(e) => setScope(e.target.value as '' | 'main')} className="h-10 rounded-full border border-line bg-surface px-4 text-sm">
            <option value="">All rooms</option>
            <option value="main">Global room</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {isLoading && <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>}
        {error && !data && <ErrorState message={errorMessage(error)} onRetry={refetch} />}
        {data && data.entries.length === 0 && <EmptyState icon={<Trophy className="size-6" />} title="Nobody here yet" text="Play a round in this period to take the first place." />}
        {data && data.entries.length > 0 && (
          <ol className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {data.entries.map((e) => (
              <li key={e.rank} className={`flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0 ${e.isMe ? 'bg-violet-dim' : ''}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 font-bold tabular-nums ${medal[e.rank - 1] ?? 'text-muted'}`}>{e.rank <= 3 ? <Crown className="size-4" aria-label={`Rank ${e.rank}`} /> : e.rank}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{e.displayName}{e.isMe && <span className="ml-2 text-xs text-[#c5b8ff]">You</span>}</p><p className="text-xs text-muted">{fmt(e.rounds)} rounds</p></div>
                <p className="font-display text-lg font-bold text-gold tabular-nums">{fmt(e.value)}</p>
              </li>
            ))}
          </ol>
        )}
        {data?.me && !data.entries.some((e) => e.isMe) && <p className="mt-3 text-center text-sm text-muted">Your rank: #{data.me.rank} with {fmt(data.me.value)}</p>}
      </div>
    </>
  );
}
