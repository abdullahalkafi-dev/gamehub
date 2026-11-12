import type { Metadata } from 'next';
import { Shop } from '@/features/shop/Shop';

export const metadata: Metadata = { title: 'Coin shop' };
export default function Page() {
  return <Shop />;
}
