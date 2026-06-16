import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

import { getCurrentUser, isManuallyLoggedOut } from '@/server/auth';
import { MoneyDashboard } from '@/features/money/dashboard/money-dashboard';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const isEmbedded = isFrameRequest(await headers());
  const [user, manuallyLoggedOut] = await Promise.all([
    getCurrentUser(),
    isManuallyLoggedOut()
  ]);

  if (!user) {
    if (manuallyLoggedOut && !isEmbedded) {
      redirect('/auth/signed-out');
    }

    redirect('/auth/login');
  }

  return (
    <>
      <MoneyDashboard
        initialIsEmbedded={isEmbedded}
        initialUser={{
          displayName: user.name
        }}
      />
      <div hidden>{children}</div>
    </>
  );
}

function isFrameRequest(headerStore: Headers) {
  return headerStore.get('sec-fetch-dest') === 'iframe';
}
