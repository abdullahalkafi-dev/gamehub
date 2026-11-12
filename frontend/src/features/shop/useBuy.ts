'use client';
import { useRef, useState } from 'react';
import { usePurchaseMutation } from '@/features/api/api';
import { pushToast } from '@/features/ui/toastSlice';
import { errorMessage, fmt } from '@/lib/format';
import type { CoinPackage } from '@/lib/types';
import { useAppDispatch } from '@/store/hooks';

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

/**
 * One purchase at a time. Each press gets its own key, and the key is kept until the
 * request succeeds, so a retry after a network error can never pay twice.
 */
export function useBuy() {
  const dispatch = useAppDispatch();
  const [purchase] = usePurchaseMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());

  async function buy(p: CoinPackage) {
    if (busyId) return;
    setBusyId(p.id);
    const clientKey = keys.current.get(p.id) ?? newKey();
    keys.current.set(p.id, clientKey);
    try {
      await purchase({ packageId: p.id, clientKey }).unwrap();
      keys.current.delete(p.id);
      setDoneId(p.id);
      setTimeout(() => setDoneId((d) => (d === p.id ? null : d)), 2500);
      dispatch(pushToast('success', `+${fmt(p.coins)} coins added`));
    } catch (e) {
      dispatch(pushToast('error', errorMessage(e, 'Purchase failed. Nothing was charged.')));
    } finally {
      setBusyId(null);
    }
  }
  return { buy, busyId, doneId };
}
