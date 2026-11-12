'use client';
import { Coins, History, Home, LogOut, Medal, Plus, Settings, ShoppingBag, Trophy, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, useLogoutMutation, useMeQuery } from '@/features/api/api';
import { fmt } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import { Skeleton } from './ui';

const NAV = [
  { href: '/', label: 'Lobby', icon: Home },
  { href: '/history', label: 'History', icon: History },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-gold to-[#e0892a] text-black">
        <Medal className="size-5" aria-hidden />
      </span>
      <span>
        Game<span className="text-gold">Hub</span>
      </span>
    </span>
  );
}

export function CoinBadge({ balance }: { balance: number | null | undefined }) {
  return (
    <Link
      href="/shop"
      aria-label={`Balance ${balance ?? 'unknown'} coins. Open shop`}
      className="flex h-10 items-center gap-2 rounded-full border border-gold/30 bg-gold-dim pr-1 pl-3.5 text-gold transition hover:border-gold/70"
    >
      <Coins className="size-4" aria-hidden />
      <span className="font-semibold tabular-nums">{balance == null ? '—' : fmt(balance)}</span>
      <span className="grid size-8 place-items-center rounded-full bg-gold text-black">
        <Plus className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

/** Keeps signed-out visitors away from private pages and wraps them in navigation. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const dispatch = useAppDispatch();
  const { data, error, isLoading } = useMeQuery(undefined, { refetchOnFocus: true });
  const [logout] = useLogoutMutation();

  const unauthorized = (error as { status?: number } | undefined)?.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace('/login');
  }, [unauthorized, router]);

  async function signOut() {
    await logout().unwrap().catch(() => undefined);
    dispatch(api.util.resetApiState()); // forget this person's cached data
    router.replace('/login');
  }

  if (isLoading || unauthorized) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // The game screen uses the whole window and brings its own header.
  if (path.startsWith('/play')) return <>{children}</>;

  const isAdmin = data?.user.role === 'admin';
  const items = isAdmin ? [...NAV, { href: '/admin', label: 'Admin', icon: Settings }] : NAV;
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="GameHub home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${active(href) ? 'bg-surface-2 text-gold' : 'text-muted hover:text-ink'}`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <CoinBadge balance={data?.balance} />
            <button
              onClick={signOut}
              aria-label="Log out"
              className="hidden size-10 place-items-center rounded-full border border-line text-muted transition hover:text-ink md:grid"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>

      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-md justify-around px-2 py-1.5">
          {items.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active(href) ? 'page' : undefined}
                className={`flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium ${active(href) ? 'text-gold' : 'text-muted'}`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
