import type { Metadata } from 'next';
import messages from '@messages/en.json';
import { fontVariables } from '@/lib/fonts';
import { SITE_URL } from '@/lib/site';
import { themeInitScript } from '@/lib/theme';
import '@/styles/globals.css';

export const metadata: Metadata = {
  // Makes every relative canonical and Open Graph address absolute, on the production domain.
  metadataBase: new URL(SITE_URL),
  title: messages.site.name,
  description: messages.site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script may set data-theme before React hydrates.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
