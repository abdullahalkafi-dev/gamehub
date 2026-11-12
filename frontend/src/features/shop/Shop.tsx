'use client';
import { Info, ReceiptText } from 'lucide-react';
import { EmptyState, ErrorState, PageTitle, Skeleton } from '@/components/ui';
import { CoinBadge } from '@/components/AppShell';
import { useMeQuery, usePackagesQuery, usePurchasesQuery } from '@/features/api/api';
import { errorMessage, fmt, money, timeAgo } from '@/lib/format';
import { PackageCard } from './PackageCard';
import { useBuy } from './useBuy';

export function Shop() {
  const { data, error, isLoading, refetch } = usePackagesQuery();
  const { data: me } = useMeQuery();
  const { data: history } = usePurchasesQuery();
  const { buy, busyId, doneId } = useBuy();

  return (
    <>
      <PageTitle title="Coin shop" sub="Top up and get back to the wheel." action={<CoinBadge balance={me?.balance} />} />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet/30 bg-violet-dim px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-[#c5b8ff]" aria-hidden />
        <p>This is a <strong>demo shop</strong>. Nobody is charged: coins appear instantly and have no real-world value.</p>
      </div>

      {isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-52" />)}</div>}
      {error && <ErrorState message={errorMessage(error)} onRetry={refetch} />}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.packages.map((p) => <PackageCard key={p.id} pack={p} busy={busyId === p.id} done={doneId === p.id} onBuy={() => buy(p)} />)}
      </div>

      <h2 className="font-display mt-10 mb-3 text-lg font-bold">Your purchases</h2>
      {history && history.purchases.length === 0 ? (
        <EmptyState icon={<ReceiptText className="size-6" />} title="No purchases yet" text="Your demo top-ups will be listed here." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {history?.purchases.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div><p className="font-medium">{p.packageName} pack</p><p className="text-sm text-muted">{timeAgo(p.createdAt)} · {money(p.priceCents)} (demo)</p></div>
              <p className="font-semibold text-win tabular-nums">+{fmt(p.coins)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
