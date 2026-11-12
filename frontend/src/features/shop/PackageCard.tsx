'use client';
import { Check, Coins } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { fmt, money } from '@/lib/format';
import type { CoinPackage } from '@/lib/types';

export function PackageCard({ pack, onBuy, busy, done, compact }: { pack: CoinPackage; onBuy: () => void; busy: boolean; done: boolean; compact?: boolean }) {
  const featured = !!pack.highlight;
  return (
    <div className={`relative flex ${compact ? 'items-center gap-3 p-3' : 'flex-col gap-4 p-5'} rounded-[var(--radius-card)] border ${featured ? 'border-gold/60 bg-gradient-to-b from-gold-dim to-surface' : 'border-line bg-surface'}`}>
      {pack.highlight && !compact && (
        <span className="absolute -top-2.5 left-4"><Badge tone="gold">{pack.highlight === 'popular' ? 'Most popular' : 'Best value'}</Badge></span>
      )}
      <div className={`grid shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold ${compact ? 'size-11' : 'size-14'}`}><Coins className={compact ? 'size-5' : 'size-7'} aria-hidden /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">{pack.name}</p>
        <p className={`font-display font-bold text-gold tabular-nums ${compact ? 'text-lg' : 'text-3xl'}`}>{fmt(pack.coins)}</p>
        {pack.bonusPercent > 0 && <p className="text-sm text-win">+{pack.bonusPercent}% bonus</p>}
      </div>
      <Button variant={featured ? 'gold' : 'primary'} size={compact ? 'sm' : 'md'} loading={busy} onClick={onBuy} className={compact ? '' : 'w-full'} aria-label={`Get ${fmt(pack.coins)} coins for ${money(pack.priceCents)} (demo)`}>
        {done ? <><Check className="size-4" aria-hidden /> Added</> : money(pack.priceCents)}
      </Button>
    </div>
  );
}
