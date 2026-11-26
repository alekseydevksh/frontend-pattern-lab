import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';
import { MetricsRow } from './MetricsRow';
import { StepCard, inlineCode } from './StepCard';
import { StepControls } from './StepControls';
import { Takeaways } from './Takeaways';
import { VerdictTable } from './VerdictTable';

describe('CodeBlock', () => {
  it('shows the source as a named, focusable region, so a long line can be scrolled by keyboard', () => {
    render(<CodeBlock language="ts" source={'const a = 1;\nconst b = 2;'} />);
    const region = screen.getByRole('region', { name: 'Code example' });
    expect(region.tabIndex).toBe(0);
    expect(region.textContent).toBe('const a = 1;\nconst b = 2;');
  });
});

describe('MetricsRow', () => {
  it('pairs each label with its value and tone', () => {
    const { container } = render(
      <MetricsRow
        labels={['A', 'B', 'C']}
        metrics={[{ value: '1' }, { value: 'ok', tone: 'good' }, { value: 'no', tone: 'bad' }]}
      />,
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('ok').closest('[data-tone]')?.getAttribute('data-tone')).toBe('good');
    expect(screen.getByText('no').closest('[data-tone]')?.getAttribute('data-tone')).toBe('bad');
    expect(container.querySelectorAll('[data-tone]')).toHaveLength(3);
  });

  it('leaves a value empty rather than failing when the scene gives fewer than the lesson names', () => {
    render(<MetricsRow labels={['A', 'B']} metrics={[{ value: '1' }]} />);
    expect(screen.getByText('B')).toBeTruthy();
  });
});

describe('Takeaways', () => {
  const items = ['First', 'Second', 'Third'];

  it('says in words which points are reached, not only by colour', () => {
    render(<Takeaways items={items} reached={new Set([0, 2])} />);
    const list = screen.getByRole('list');
    const [first, second, third] = within(list).getAllByRole('listitem');
    expect(first?.textContent).toContain('reached');
    expect(first?.textContent).not.toContain('not reached');
    expect(second?.textContent).toContain('not reached yet');
    expect(third?.getAttribute('data-reached')).toBe('true');
    expect(second?.getAttribute('data-reached')).toBe('false');
  });

  it('is a named region', () => {
    render(<Takeaways items={items} reached={new Set()} />);
    expect(screen.getByRole('region', { name: "You'll learn" })).toBeTruthy();
  });
});

describe('VerdictTable', () => {
  const summary = {
    title: 'WHICH ONE?',
    rows: [
      { label: 'First screen load', verdict: 'Pull', tone: 'ok' },
      { label: 'Something changed', verdict: 'Push', tone: 'warn' },
    ],
  } as const;

  function table() {
    render(
      <VerdictTable
        summary={{ title: summary.title, rows: [...summary.rows] }}
        description="Pull for the first load, push for a change."
        viewBox="0 0 640 312"
      />,
    );
    return screen.getByRole('table', { name: 'WHICH ONE?' });
  }

  it('is a real table, named by its title, with one row per case', () => {
    const t = table();
    const rows = within(t).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole('rowheader').textContent).toBe('First screen load');
    expect(within(rows[0]!).getByRole('cell').textContent).toBe('Pull');
    expect(within(rows[1]!).getByRole('cell').textContent).toBe('Push');
  });

  it('is described by the step text alternative', () => {
    const t = table();
    const id = t.getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe(
      'Pull for the first load, push for a change.',
    );
  });

  it('keeps the diagram’s proportions, so nothing moves when the step changes', () => {
    table();
    const box = document.querySelector<HTMLElement>('[style*="aspect-ratio"]');
    expect(box?.style.aspectRatio).toBe('640 / 312');
  });
});

describe('inlineCode', () => {
  it('turns text between backticks into code, and leaves the rest as it is', () => {
    render(<p>{inlineCode('Call `invalidate(id)` then `toast()` once.')}</p>);
    const codes = screen.getAllByText(/invalidate|toast/);
    expect(codes.map((c) => c.tagName)).toEqual(['CODE', 'CODE']);
    expect(codes.map((c) => c.textContent)).toEqual(['invalidate(id)', 'toast()']);
  });

  it('leaves an unclosed backtick alone', () => {
    const { container } = render(<p>{inlineCode('a ` b')}</p>);
    expect(container.querySelector('code')).toBeNull();
    expect(container.textContent).toBe('a ` b');
  });
});

describe('StepCard', () => {
  const step = {
    tag: 'PULL',
    tone: 'res' as const,
    title: 'Load with a request',
    body: ['One.', 'Two with `code`.'],
    keyIdea: 'Pull is complete.',
  };

  it('puts the step text in a polite live region and the controls outside it', () => {
    const { container } = render(
      <StepCard step={step} stepIndex={0} stepCount={7}>
        <StepControls
          stepIndex={0}
          stepCount={7}
          nextTitle="Next up"
          onBack={vi.fn()}
          onNext={vi.fn()}
        />
      </StepCard>,
    );
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(within(live as HTMLElement).getByRole('heading', { level: 2 }).textContent).toBe(
      'Load with a request',
    );
    expect(within(live as HTMLElement).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Next: Next up →' })).toBeTruthy();
    expect(live.textContent).toContain('Step 1 / 7');
    expect(live.textContent).toContain('PULL');
  });

  it('shows a code sample only when the step has one', () => {
    const { rerender } = render(<StepCard step={step} stepIndex={0} stepCount={2} />);
    expect(screen.queryByRole('region', { name: 'Code example' })).toBeNull();
    rerender(
      <StepCard
        step={{ ...step, code: { language: 'json', source: '{ "a": 1 }' } }}
        stepIndex={0}
        stepCount={2}
      />,
    );
    expect(screen.getByRole('region', { name: 'Code example' }).textContent).toBe('{ "a": 1 }');
  });

  it('keeps the key idea label and text together', () => {
    render(<StepCard step={step} stepIndex={0} stepCount={2} />);
    expect(screen.getByText('Key idea').parentElement?.textContent).toContain('Pull is complete.');
    fireEvent.keyDown(document, { key: 'x' });
  });
});
