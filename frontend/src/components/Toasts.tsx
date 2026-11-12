'use client';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { dismissToast, type Toast } from '@/features/ui/toastSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const tones = { success: 'text-win', error: 'text-loss', info: 'text-violet' };

function Item({ t }: { t: Toast }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const id = setTimeout(() => dispatch(dismissToast(t.id)), 4500);
    return () => clearTimeout(id);
  }, [dispatch, t.id]);
  const Icon = icons[t.kind];
  return (
    <div className="slide-up flex items-start gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 shadow-xl">
      <Icon className={`mt-0.5 size-5 shrink-0 ${tones[t.kind]}`} aria-hidden />
      <p className="text-sm">{t.text}</p>
    </div>
  );
}

export function Toasts() {
  const toasts = useAppSelector((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:mx-0">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Item t={t} />
        </div>
      ))}
    </div>
  );
}
