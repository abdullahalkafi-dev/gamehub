import type { Metadata } from 'next';
import { Admin } from '@/features/admin/Admin';

export const metadata: Metadata = { title: 'Admin' };
export default function Page() {
  return <Admin />;
}
