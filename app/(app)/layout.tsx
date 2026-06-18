import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

import { localeSearchParamHeaderName } from '@/i18n/locales';
import { getCurrentUser, isManuallyLoggedOut } from '@/server/auth';
import { MoneyDashboard } from '@/features/money/dashboard/money-dashboard';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const isEmbedded = isFrameRequest(headerStore);
  const localeLocked = headerStore.get(localeSearchParamHeaderName) === '1';
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
        initialLocaleLocked={localeLocked}
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
