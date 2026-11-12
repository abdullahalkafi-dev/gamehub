'use client';
import { Loader2, X } from 'lucide-react';
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

// ---- Button --------------------------------------------------------------
type Variant = 'primary' | 'gold' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-violet text-white hover:brightness-110',
  gold: 'bg-gold text-black hover:brightness-105 font-semibold',
  ghost: 'bg-surface-2 text-ink border border-line hover:border-violet/60',
  danger: 'bg-loss/15 text-loss border border-loss/40 hover:bg-loss/25',
};
export function Button({
  variant = 'primary',
  loading,
  size = 'md',
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' | 'lg' | 'icon' }) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5', lg: 'h-12 px-6 text-base', icon: 'size-11 shrink-0' };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ---- Card ----------------------------------------------------------------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-[var(--radius-card)] border border-line bg-surface p-5', className)}>{children}</div>;
}

// ---- Field (label + input + error) ---------------------------------------
export function Field({ label, error, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        {...rest}
        className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-ink placeholder:text-muted/70 focus:border-violet focus:outline-none aria-[invalid=true]:border-loss"
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={cx('mt-1.5 text-sm', error ? 'text-loss' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

// ---- Modal ---------------------------------------------------------------
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="slide-up pb-safe w-full max-w-md rounded-t-3xl border border-line bg-surface p-6 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Small pieces --------------------------------------------------------
export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} aria-hidden />;

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-surface-2 text-gold">{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[var(--radius-card)] border border-loss/30 bg-loss/5 px-6 py-10 text-center">
      <p className="font-medium text-loss">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export const Badge = ({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'gold' | 'win' | 'loss' | 'muted' }) => {
  const tones = {
    violet: 'bg-violet-dim text-[#c5b8ff]',
    gold: 'bg-gold-dim text-gold',
    win: 'bg-win/15 text-win',
    loss: 'bg-loss/15 text-loss',
    muted: 'bg-surface-2 text-muted',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
};

export const PageTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
    {action}
  </div>
);
