'use client';
import { Check, Copy, Globe2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, PageTitle } from '@/components/ui';
import { useCreateRoomMutation } from '@/features/api/api';
import { pushToast } from '@/features/ui/toastSlice';
import { errorMessage } from '@/lib/format';
import type { RoomView } from '@/lib/types';
import { useAppDispatch } from '@/store/hooks';

const CHIP_CHOICES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
const MAX_BETS = [50, 100, 250, 500, 1000, 2500];
const BET_TIMES = [15, 20, 30, 45, 60];

export function CreateRoom() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [create, { isLoading }] = useCreateRoomMutation();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [capacity, setCapacity] = useState(20);
  const [chips, setChips] = useState([1, 5, 10, 25, 100]);
  const [maxPerTarget, setMax] = useState(500);
  const [betSeconds, setBetSeconds] = useState(20);
  const [error, setError] = useState('');
  const [made, setMade] = useState<RoomView | null>(null);

  const toggleChip = (c: number) =>
    setChips((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length < 5 ? [...cur, c].sort((a, b) => a - b) : cur));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (chips.length < 2) return setError('Pick at least 2 chip values.');
    try {
      const res = await create({ name, visibility, capacity, chips, maxPerTarget, timing: { betSeconds, spinSeconds: 6, resultSeconds: 6 } }).unwrap();
      setMade(res.room);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (made) {
    return (
      <Card className="pop mx-auto mt-6 max-w-md text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-win/15 text-win"><Check className="size-7" aria-hidden /></div>
        <h2 className="font-display text-2xl font-bold">{made.name} is ready</h2>
        {made.visibility === 'private' && made.inviteCode ? (
          <>
            <p className="mt-2 text-muted">Share this code with friends. Only people with the code can join.</p>
            <button
              onClick={() => navigator.clipboard.writeText(made.inviteCode!).then(() => dispatch(pushToast('success', 'Code copied')), () => undefined)}
              className="mx-auto mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-gold/50 bg-gold-dim px-6 py-3"
            >
              <span className="font-mono text-3xl font-bold tracking-[0.3em] text-gold">{made.inviteCode}</span>
              <Copy className="size-4 text-gold" aria-label="Copy" />
            </button>
          </>
        ) : (
          <p className="mt-2 text-muted">It now appears in the lobby for everyone.</p>
        )}
        <p className="mt-4 text-xs text-muted">Empty rooms close by themselves after 30 minutes.</p>
        <div className="mt-6 flex gap-2">
          <Link href="/" className="flex h-11 flex-1 items-center justify-center rounded-xl border border-line bg-surface-2">Lobby</Link>
          <Button variant="gold" className="flex-1" onClick={() => router.push(`/play/${made.key}`)}>Enter room</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageTitle title="Create a room" sub="Set your own table. You can have up to 3 rooms at a time." />
      <form onSubmit={submit} className="mx-auto max-w-xl space-y-6" noValidate>
        <Card className="space-y-5">
          <Field label="Room name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required placeholder="Friday night spinners" />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Who can join?</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['public', Globe2, 'Public', 'Listed in the lobby'], ['private', Lock, 'Private', 'Invite code only']] as const).map(([v, Icon, t, d]) => (
                <label key={v} className={`cursor-pointer rounded-xl border p-3.5 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${visibility === v ? 'border-violet bg-violet-dim' : 'border-line bg-surface-2'}`}>
                  <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="sr-only" />
                  <Icon className="mb-1.5 size-5 text-gold" aria-hidden />
                  <span className="block font-medium">{t}</span>
                  <span className="text-sm text-muted">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="cap" className="mb-1.5 flex justify-between text-sm font-medium"><span>Player limit</span><span className="text-gold">{capacity}</span></label>
            <input id="cap" type="range" min={2} max={50} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full accent-[var(--color-violet)]" />
          </div>
        </Card>

        <Card className="space-y-5">
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Chip values <span className="text-muted">(pick 2 to 5)</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHIP_CHOICES.map((c) => (
                <button type="button" key={c} onClick={() => toggleChip(c)} aria-pressed={chips.includes(c)} className={`h-10 min-w-12 rounded-full border px-3.5 text-sm font-semibold tabular-nums transition ${chips.includes(c) ? 'border-gold bg-gold text-black' : 'border-line bg-surface-2 text-muted hover:text-ink'}`}>{c}</button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-medium">Max bet per option
              <select value={maxPerTarget} onChange={(e) => setMax(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-2 px-3">
                {MAX_BETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Betting time
              <select value={betSeconds} onChange={(e) => setBetSeconds(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-2 px-3">
                {BET_TIMES.map((m) => <option key={m} value={m}>{m} seconds</option>)}
              </select>
            </label>
          </div>
        </Card>

        {error && <p role="alert" className="rounded-xl bg-loss/10 px-3.5 py-2.5 text-sm text-loss">{error}</p>}
        <Button type="submit" variant="gold" size="lg" loading={isLoading} disabled={name.trim().length < 3} className="w-full">Create room</Button>
      </form>
    </>
  );
}
