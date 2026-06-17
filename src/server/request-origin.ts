import { headers } from 'next/headers';

export async function publicOrigin() {
  const headerStore = await headers();
  const host =
    headerStore.get('x-forwarded-host') ?? headerStore.get('host');

  if (!host) {
    throw new Error('Missing request host');
  }

  const proto = headerStore.get('x-forwarded-proto') ?? 'http';

  return `${proto}://${host}`;
}
