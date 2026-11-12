import type { Metadata } from 'next';
import { History } from '@/features/history/History';

export const metadata: Metadata = { title: 'My history' };
export default function Page() {
  return <History />;
}
