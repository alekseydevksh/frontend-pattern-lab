import { useId, type HTMLAttributes } from 'react';
import type { SummaryTable } from '@/engine/types';
import { cx } from '@/lib/cx';

export interface VerdictTableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  summary: SummaryTable;
  /** What the table says in a sentence: the step's `sceneAlt`. Read after the table's name. */
  description: string;
  /** The scene's viewBox, so the table takes the same room as the diagram it replaces. */
  viewBox: string;
}

const verdictTone = {
  ok: 'border-res bg-[color-mix(in_srgb,var(--res)_18%,var(--panel))]',
  warn: 'border-req bg-[color-mix(in_srgb,var(--req)_18%,var(--panel))]',
} as const;

/** "0 0 640 364" becomes "640 / 364". */
function aspectOf(viewBox: string): string {
  const [, , width, height] = viewBox.split(/\s+/);
  return `${width} / ${height}`;
}

/**
 * A verdict table in the place of the diagram on a summary step: one row per case, with the
 * verdict as a word in a tinted pill. A real table, so a screen reader can move through it by
 * row. It has the diagram's `min-w` and at least its height; when its rows need more room than
 * that (a long table on a narrow screen), it is taller, which is why the lesson shell reserves the
 * table's height under every diagram, so nothing moves when the step changes.
 */
export function VerdictTable({
  summary,
  description,
  viewBox,
  className,
  ...rest
}: VerdictTableProps) {
  const descriptionId = useId();
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-control border-[1.5px] border-line bg-paper',
        className,
      )}
      {...rest}
    >
      <div className="min-w-[540px] px-[5%] py-6" style={{ aspectRatio: aspectOf(viewBox) }}>
        <table
          aria-describedby={descriptionId}
          className="w-full border-separate border-spacing-y-2"
        >
          <caption className="mb-1 text-left font-mono text-label font-medium tracking-caps-wide text-muted-text">
            {summary.title}
          </caption>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="rounded-l-field border-y-[1.5px] border-l-[1.5px] border-line bg-panel px-4 py-1.5 text-left text-[15px] font-medium"
                >
                  {row.label}
                </th>
                <td className="w-[184px] rounded-r-field border-y-[1.5px] border-r-[1.5px] border-line bg-panel py-1.5 pr-2 pl-0 text-center">
                  <span
                    data-tone={row.tone}
                    className={cx(
                      'block rounded-full border-[1.5px] px-2 py-[3px] font-mono text-meta font-semibold text-ink',
                      verdictTone[row.tone],
                    )}
                  >
                    {row.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p id={descriptionId} className="sr-only">
          {description}
        </p>
      </div>
    </div>
  );
}
