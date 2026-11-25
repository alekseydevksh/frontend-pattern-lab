# Architecture

> Stub. Filled in as the engine (M2) and the lessons (M3) land. The full design is in
> [SPEC.md](SPEC.md).

## Layout

Lesson content, the playback engine and the scene drawings live in three separate places,
so a new lesson never touches the engine.

| Folder                   | Holds                                     | Exists                   |
| ------------------------ | ----------------------------------------- | ------------------------ |
| `content/lessons/`       | Typed lesson data, one file per lesson    | M2/M3                    |
| `src/engine/`            | Types, `useLessonPlayer`, packet helpers  | M2                       |
| `src/components/scenes/` | One pure SVG scene per lesson, registry   | M3                       |
| `src/components/ui/`     | Button, Pill, Chip, Card, and so on       | M1                       |
| `src/components/lesson/` | LessonShell, StepCard, Stepper, and so on | M1/M4                    |
| `src/app/`               | App Router pages and layout               | M0 (empty)               |
| `src/styles/`            | Design tokens and global styles           | M0 (empty), tokens in M1 |
| `messages/`              | Interface text (`en.json`)                | M0                       |
| `e2e/`                   | Playwright tests                          | M0                       |

## Data flow

Lesson data (typed) → `useLessonPlayer` (state over time) → scene component (SVG).
To be described in detail in M2.

## Playback rules

See "Playback rules" in [SPEC.md](SPEC.md). To be restated here in M2.
