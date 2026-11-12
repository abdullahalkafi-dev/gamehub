'use client';
import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from './index';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<AppStore | null>(null);
  ref.current ??= makeStore();
  return <Provider store={ref.current}>{children}</Provider>;
}
