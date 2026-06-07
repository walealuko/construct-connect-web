import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaxHub Nigeria - Simplified Tax Management for Individuals & Small Businesses',
  description: 'Calculate, prepare, and file your Nigerian taxes easily. PAYE, CIT, VAT, WHT, CGT - all in one platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}