import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Serif, Manrope } from 'next/font/google';
import { EmotionRegistry } from '@/components/emotion-registry';
import { Providers } from '@/components/providers';
import './globals.css';

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body'
});

const displayFont = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display'
});

export const metadata: Metadata = {
  title: 'Physician Workspace',
  description: 'Web-first physician workspace for case capture, follow-up queues, and cohort review.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workspace'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: '#f4efe7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <EmotionRegistry>
          <Providers>{children}</Providers>
        </EmotionRegistry>
      </body>
    </html>
  );
}
