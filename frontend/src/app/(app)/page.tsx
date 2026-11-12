import type { Metadata } from 'next';
import { Lobby } from '@/features/rooms/Lobby';

export const metadata: Metadata = { title: 'Rooms' };
export default function Page() {
  return <Lobby />;
}
