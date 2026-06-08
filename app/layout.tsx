import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Money',
  description: 'Personal money tracker.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
