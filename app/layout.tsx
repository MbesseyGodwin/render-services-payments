// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Managed Cloud Service Packages | Render Services Payments',
  description: 'Third-party cloud service subscription management by Render Services Payments.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
