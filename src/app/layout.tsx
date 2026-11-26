import type { Metadata } from 'next';
import messages from '@messages/en.json';
import { fontVariables } from '@/lib/fonts';
import { themeInitScript } from '@/lib/theme';
import '@/styles/globals.css';

export const metadata: Metadata = {
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
