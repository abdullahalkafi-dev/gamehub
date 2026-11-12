import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Play } from '@/features/play/Play';

export const metadata: Metadata = { title: 'Play' };

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return (
    <Suspense>
      <Play roomKey={key} />
    </Suspense>
  );
}
