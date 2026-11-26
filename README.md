# Frontend Pattern Lab

Short animated lessons on frontend architecture patterns for large React applications.
Each lesson teaches one idea that you step through as a diagram, in about five minutes.

> **Status:** under construction. Milestone M0 (bootstrap) only. See [docs/PROGRESS.md](docs/PROGRESS.md).

**Live site:** <https://frontend-pattern-lab.vercel.app>

## Run it

Requires Node 24 and pnpm 12.

```bash
pnpm install
pnpm dev          # development server
pnpm build        # static export to out/
pnpm start        # serve out/ on http://localhost:3000
```

## Check it

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test         # unit tests (Vitest)
pnpm build && pnpm test:e2e   # end-to-end tests (Playwright) need the export
```

The first time, install the browser for Playwright with `pnpm exec playwright install chromium`.

## Documentation

- [docs/SPEC.md](docs/SPEC.md): the full specification
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layout and data flow
- [docs/DECISIONS.md](docs/DECISIONS.md): tools, versions and reasons
- [docs/ADDING_A_LESSON.md](docs/ADDING_A_LESSON.md): how to add a lesson
- [docs/PROGRESS.md](docs/PROGRESS.md): milestone and lesson checklist
- [CLAUDE.md](CLAUDE.md): working rules for Claude Code in this repository

## Licences

- Code: [MIT](LICENSE).
- Original lesson text and diagrams: [CC BY 4.0](LICENSE-CONTENT.md).

## Acknowledgements

Original explanations of ideas from
[Frontend System Design Patterns for Large-Scale React Applications](https://medium.com/@dmitriilobanov3/frontend-system-design-patterns-for-large-scale-react-applications-699ef9bb3b1d)
by Dmitrii Lobanov. The step-by-step diagram format is inspired by
[designed-to-scale.vercel.app](https://designed-to-scale.vercel.app).
