import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getCurrentUser, isManuallyLoggedOut } from './lib/auth';
import { MoneyDashboard } from './ui/money-dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
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
    <MoneyDashboard
      initialIsEmbedded={isEmbedded}
      initialUser={{
        displayName: user.name,
        role: user.role
      }}
    />
  );
}

function isFrameRequest(headerStore: Headers) {
  return headerStore.get('sec-fetch-dest') === 'iframe';
}
