# Architecture

> Stub. Filled in as the engine (M2) and the lessons (M3) land. The full design is in
> [SPEC.md](SPEC.md).

## Layout

Lesson content, the playback engine and the scene drawings live in three separate places,
so a new lesson never touches the engine.

| Folder                   | Holds                                     | Exists                    |
| ------------------------ | ----------------------------------------- | ------------------------- |
| `content/lessons/`       | Typed lesson data, one file per lesson    | M2/M3                     |
| `src/engine/`            | Types, `useLessonPlayer`, packet helpers  | M2                        |
| `src/components/scenes/` | One pure SVG scene per lesson, registry   | M3                        |
| `src/components/ui/`     | Button, Pill, Chip, Card, and so on       | M1 (done)                 |
| `src/components/lesson/` | LessonShell, StepCard, Stepper, and so on | M2/M4 (need engine types) |
| `src/app/`               | App Router pages and layout               | M0, gallery page in M1    |
| `src/lib/`               | Theme logic, fonts, small helpers         | M1                        |
| `src/styles/`            | Design tokens and global styles           | M1                        |
| `.storybook/`            | Storybook configuration                   | M1                        |
| `messages/`              | Interface text (`en.json`)                | M0                        |
| `e2e/`                   | Playwright tests                          | M0                        |

## Design system (M1)

**Tokens.** `src/styles/tokens.css` is the only place that holds colour, type and radius
values. Colours are CSS variables per theme. The `:root` rule holds the light values and the
`[data-theme='dark']` rule redefines the same names for dark. With no `data-theme`, dark
follows `prefers-color-scheme`. Tailwind reads the variables through `@theme inline`, so a
utility such as `bg-panel` follows the theme without a second stylesheet. The same rules match
any element with `data-theme`, which is how Storybook shows both themes side by side. A unit
test checks every token against the spec, and another fails if a component hard-codes a colour.

The signal colours (`--req`, `--res`, `--ev`, `--bad`) are for borders, fills and marks. Used
as small text, they fail AA contrast in the light theme, so each has a derived `-text` token
(a 30% mix of `--ink`) with 5:1 or better on every surface. `--muted-text` does the same for
text on a muted tint.

**Theme.** `src/lib/theme.ts` holds the logic (choose, store, apply, subscribe) and the inline
script that `layout.tsx` puts in `<head>`. The script copies a stored choice onto `<html>`
before first paint. The attribute (`data-theme`) and storage key (`pl-theme`) are the ones the
prototype uses. All storage access is wrapped, so blocked storage means "no stored choice".
`ThemeToggle` is a native button with `aria-pressed`; it reads the theme through
`useSyncExternalStore`, so it also follows changes made from outside, such as Storybook's
toolbar.

**Components.** Everything in `src/components/ui/` is a small, native-element component styled
with token utilities: `Button` (primary, secondary; sizes md and sm), `Pill` (tones), `Chip`,
`Card`, `MetricTile`, `Kbd` and `ThemeToggle`. Only `ThemeToggle` is a client component. The
lesson-level components (`LessonShell`, `StepCard`, `Stepper`, `Takeaways`, `MetricsRow`,
`CodeBlock`) come with the engine in M2 and the shell in M4, because they take lesson types.

**Focus and motion.** `globals.css` draws one 2 px `--ev` outline on every `:focus-visible` and
turns off all transitions and animations under `prefers-reduced-motion`.

**Storybook.** Run `pnpm storybook`. Each component has a story file next to it with one story
per variant and a `BothThemes` story that shows the light and dark theme side by side. The
toolbar has a theme switch that sets `data-theme` on `<html>`, as the site does. The
`Foundations/Tokens` page lists the colours (read live from the CSS) and the type styles.
`pnpm build-storybook` writes a static build to `storybook-static/`, which is not committed.

**Component gallery.** `/dev/components/` shows every component, with a theme toggle. It is the
page that Playwright and axe check in both themes (`e2e/components.spec.ts`). It is
`noindex` and not linked from anywhere, but it is part of the static export.

## Data flow

Lesson data (typed) → `useLessonPlayer` (state over time) → scene component (SVG).
To be described in detail in M2.

## Playback rules

See "Playback rules" in [SPEC.md](SPEC.md). To be restated here in M2.
