import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Construct Hub - Premium Construction Materials & Expert Artisans',
  description: 'Find quality building materials and skilled professionals for your construction projects in Nigeria.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <Navbar />
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}

