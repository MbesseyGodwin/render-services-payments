import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pay Render Services, Inc dba Render',
  description: 'Invoice and payment portal for Render Services, Inc dba Render',
  icons: {
    icon: '/render-logo.png',
    shortcut: '/render-logo.png',
    apple: '/render-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/render-logo.png" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
