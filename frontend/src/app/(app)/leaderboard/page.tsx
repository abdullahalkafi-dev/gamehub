import type { Metadata } from 'next';
import { Leaderboard } from '@/features/leaderboard/Leaderboard';

export const metadata: Metadata = { title: 'Leaderboard' };
export default function Page() {
  return <Leaderboard />;
}
