'use client';

import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemePair } from './ThemePair';

const colours = [
  ['paper', 'Page background'],
  ['panel', 'Cards and panels'],
  ['ink', 'Primary text'],
  ['muted', 'Secondary text'],
  ['line', 'Borders and rules'],
  ['grid', 'Background grid'],
  ['req', 'Requests, user intent'],
  ['res', 'Server answers, confirmed state'],
  ['ev', 'Pushed events'],
  ['bad', 'Failure, rollback'],
] as const;

/** Reads each value from the live theme, so the table can never drift from tokens.css. */
function Swatch({ name, meaning }: { name: string; meaning: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).getPropertyValue(`--${name}`).trim());
  }, [name]);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span
        className="size-9 shrink-0 rounded-field border-[1.5px] border-line"
        style={{ background: `var(--${name})` }}
      />
      <span className="min-w-0">
        <span className="block font-mono text-meta font-semibold">
          --{name} <span className="font-normal text-muted-text">{value}</span>
        </span>
        <span className="block text-meta text-muted-text">{meaning}</span>
      </span>
    </div>
  );
}

function Palette() {
  return (
    <ThemePair>
      <div className="flex flex-col gap-3">
        {colours.map(([name, meaning]) => (
          <Swatch key={name} name={name} meaning={meaning} />
        ))}
      </div>
    </ThemePair>
  );
}

function Type() {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-h1 font-extrabold tracking-tight">
        Display: Bricolage Grotesque
      </p>
      <p className="font-display text-h2 font-extrabold tracking-tight">
        Heading: Bricolage Grotesque
      </p>
      <p className="max-w-[65ch] text-body">
        Body: IBM Plex Sans at 15px. Keep lines near 65 characters so a step reads comfortably.
      </p>
      <p className="font-mono text-meta tabular-nums">Mono: IBM Plex Mono 0123456789 · 600 ms</p>
      <p className="font-mono text-micro tracking-caps uppercase">Label: capitals, 10.5px</p>
    </div>
  );
}

const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colours: Story = { render: () => <Palette /> };
export const Typography: Story = { render: () => <Type /> };
