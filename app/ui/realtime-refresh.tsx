'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const events = new EventSource('/api/events');

    events.addEventListener('money.updated', () => {
      router.refresh();
    });

    return () => {
      events.close();
    };
  }, [router]);

  return null;
}
