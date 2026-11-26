import type { Metadata } from 'next';
import messages from '@messages/en.json';
import { Button, Card, Chip, Kbd, MetricTile, Pill, ThemeToggle } from '@/components/ui';

const text = messages.componentGallery;

export const metadata: Metadata = {
  title: text.title,
  description: text.description,
  // A working page for checks and review, not part of the lessons: keep it out of search.
  robots: { index: false, follow: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="font-display text-h2 font-extrabold tracking-tight text-balance">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentGalleryPage() {
  const s = text.samples;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-h1 font-extrabold tracking-tight text-balance">
            {text.title}
          </h1>
          <p className="mt-2 max-w-[64ch] text-muted">{text.description}</p>
          <p className="max-w-[64ch] text-muted">{text.intro}</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title={text.sections.buttons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{s.primary}</Button>
          <Button variant="secondary">{s.secondary}</Button>
          <Button variant="primary" disabled>
            {s.primaryDisabled}
          </Button>
          <Button variant="secondary" disabled>
            {s.secondaryDisabled}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">{s.small}</Button>
          <Button size="sm" variant="primary">
            {s.smallPaused}
          </Button>
        </div>
      </Section>

      <Section title={text.sections.pills}>
        <div className="flex flex-wrap gap-2">
          <Pill>{s.pillNeutral}</Pill>
          <Pill tone="req">{s.pillReq}</Pill>
          <Pill tone="res">{s.pillRes}</Pill>
          <Pill tone="ev">{s.pillEv}</Pill>
          <Pill tone="bad">{s.pillBad}</Pill>
        </div>
      </Section>

      <Section title={text.sections.chips}>
        <div className="flex flex-wrap gap-2">
          <Chip>{s.chipTime}</Chip>
          <Chip>{s.chipLevel}</Chip>
          <Chip>{s.chipSteps}</Chip>
        </div>
      </Section>

      <Section title={text.sections.cards}>
        <Card as="article" className="max-w-md">
          <h3 className="mb-2 font-display text-h2 font-extrabold text-balance">{s.cardTitle}</h3>
          <p>{s.cardBody}</p>
        </Card>
      </Section>

      <Section title={text.sections.metrics}>
        <div className="grid max-w-xl grid-cols-3 gap-2">
          <MetricTile label={s.metricLabelA} value={s.metricValueA} />
          <MetricTile label={s.metricLabelB} value={s.metricValueB} tone="good" />
          <MetricTile label={s.metricLabelC} value={s.metricValueC} tone="bad" />
        </div>
      </Section>

      <Section title={text.sections.keys}>
        <p className="font-mono text-meta text-muted">
          <Kbd>←</Kbd> <Kbd>→</Kbd> {s.keyStep} · <Kbd>R</Kbd> {s.keyReplay} · <Kbd>Space</Kbd>{' '}
          {s.keyPause}
        </p>
      </Section>
    </main>
  );
}
