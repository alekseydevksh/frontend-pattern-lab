import type { Metadata } from 'next';
import messages from '@messages/en.json';
import { ThemeToggle } from '@/components/ui';
import { PlayerDemo } from './PlayerDemo';

const text = messages.playerTest;

export const metadata: Metadata = {
  title: text.title,
  description: text.description,
  // A working page for checks and review, not part of the lessons: keep it out of search.
  robots: { index: false, follow: false },
};

export default function PlayerTestPage() {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-meta tracking-caps text-muted-text uppercase">{text.title}</p>
        <ThemeToggle />
      </header>
      <PlayerDemo />
    </main>
  );
}
