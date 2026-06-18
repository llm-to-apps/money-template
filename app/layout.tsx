import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { MoneyMantineProvider } from './mantine-provider';

export async function generateMetadata(): Promise<Metadata> {
  const app = await getTranslations('App');

  return {
    title: app('name'),
    description: app('description'),
    icons: {
      apple: '/apple-touch-icon.png',
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <NextIntlClientProvider>
          <MoneyMantineProvider>{children}</MoneyMantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
