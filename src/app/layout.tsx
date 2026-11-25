import type { Metadata } from 'next';
import messages from '@messages/en.json';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: messages.site.name,
  description: messages.site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
