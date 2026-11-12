import type { Metadata } from 'next';
import { CreateRoom } from '@/features/rooms/CreateRoom';

export const metadata: Metadata = { title: 'Create room' };
export default function Page() {
  return <CreateRoom />;
}
