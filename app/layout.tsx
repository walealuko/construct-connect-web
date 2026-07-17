import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Construct Centre - Premium Construction Materials & Expert Artisans',
  description: 'Find quality building materials and skilled professionals for your construction projects in Nigeria.',
  // Icons live in /public. Next.js serves these automatically:
  //   - /icon → SVG favicon (modern browsers; falls back to favicon.ico)
  //   - /apple-icon → iOS home-screen icon (raster)
  // The wordmark's two-tone palette mirrors the app's slate-900
  // background and blue-600 primary buttons; the mark SVG is
  // public/logo-mark.svg.
  icons: {
    icon: [
      { url: '/logo-mark.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/logo-mark.svg', type: 'image/svg+xml' },
    ],
  },
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

