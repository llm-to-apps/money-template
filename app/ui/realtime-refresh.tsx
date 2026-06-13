'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const events = new EventSource('/api/events');
    const refreshInterval = window.setInterval(() => {
      router.refresh();
    }, 5_000);

    events.addEventListener('money.updated', () => {
      router.refresh();
    });

    return () => {
      window.clearInterval(refreshInterval);
      events.close();
    };
  }, [router]);

  return null;
}
