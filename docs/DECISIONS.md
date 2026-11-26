# Decisions

Short decision records. Every dependency has one sentence on what it is for and why the
platform or an existing tool is not enough. Versions are those resolved at project start
(2026-11-26) and pinned by `pnpm-lock.yaml`.

## D1. Tools and installed versions (2026-11-26)

Runtime: Node 24.22.2 (`.nvmrc`), pnpm 12.21.0 (`packageManager` field).

| Package                                           | Version                | Reason                                                                                            |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `next`                                            | 16.4.6                 | App Router with file-based routes and static export, as the spec chooses.                         |
| `react`, `react-dom`                              | 19.3.1                 | The UI library the lessons teach about; required by Next.js.                                      |
| `typescript`                                      | 6.0.3 (pinned to 6.x)  | Strict typing for lesson data; see D2 for why not 7.x.                                            |
| `@types/node`, `@types/react`, `@types/react-dom` | 26.6.7, 19.3.1, 19.3.0 | Type declarations that TypeScript needs for Node and React.                                       |
| `tailwindcss`, `@tailwindcss/postcss`             | 4.3.5                  | Utility classes that read from CSS-variable tokens; the PostCSS plugin is how v4 runs in Next.js. |
| `eslint`                                          | 9.39.5 (pinned to 9.x) | Code rules in CI; see D3 for why not 10.x.                                                        |
| `eslint-config-next`                              | 16.4.6                 | Next.js and React rules maintained alongside the framework.                                       |
| `eslint-plugin-jsx-a11y`                          | 6.10.2                 | Enables the full recommended accessibility rule set; the Next config enables only a subset.       |
| `prettier`                                        | 3.10.1                 | One code style, checked in CI.                                                                    |
| `vitest`                                          | 5.1.1                  | Fast unit tests for the engine and content validation, as the spec chooses.                       |
| `jsdom`                                           | 31.0.1                 | Vitest needs a DOM implementation to render components; Node has none.                            |
| `@testing-library/react`, `@testing-library/dom`  | 16.3.3, 10.4.2         | Tests assert on roles and visible text; the DOM package is a peer of the React one.               |
| `@playwright/test`                                | 1.65.1                 | End-to-end tests of whole lessons in a real browser.                                              |

Not yet installed, planned by the spec: Radix Primitives and Storybook (M1), `axe-core`
integration for Playwright (M1), Lighthouse CI and the `lighthouse` script (M4).

## D2. TypeScript pinned to 6.x (2026-11-26)

**Decision:** use TypeScript 6.0.3, not 7.0.2.
**Reason:** `typescript-eslint` refuses to load under TypeScript 7.0, so `pnpm lint` fails
outright. The spec asks for the latest stable version, but a working lint gate matters more.
**Alternatives:** run TypeScript 7 and a 6.x API side by side, which adds setup for no gain
in a project this size. Revisit when typescript-eslint supports TypeScript 7.1 or later.
**Review:** keep 6.x for now; revisit in M6.

## D3. ESLint pinned to 9.x (2026-11-26)

**Decision:** use ESLint 9.39.5, not 10.15.0.
**Reason:** `eslint-plugin-jsx-a11y`, `eslint-plugin-react` and `eslint-plugin-import` (pulled
in by `eslint-config-next`) list ESLint 9 as their highest supported peer. ESLint 10 happened
to run in a trial, but it leaves unmet peers in the tree, and the spec asks for a strict one.
**Alternatives:** ESLint 10 with a peer-dependency override, which hides the risk. pnpm prints
a deprecation notice for 9.x on install; revisit when the plugins add ESLint 10.
**Review:** keep 9.x for now; revisit in M6.

## D4. Hand-written scaffold instead of `create-next-app` (2026-11-26)

**Decision:** create the project files by hand.
**Reason:** the generated template adds sample pages, fonts and styles that would be deleted at
once, and its defaults differ from the spec (for example a different lint setup).

## D5. Static export settings (2026-11-26)

**Decision:** `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`.
**Reason:** the spec requires a static export with no server runtime. `trailingSlash` writes
`lesson/index.html` files, which any static host serves without rewrite rules. The image
optimiser needs a server, and the site has no raster images to optimise.

## D6. Dependency-free static server for `out/` (2026-11-26)

**Decision:** `scripts/serve-out.mjs`, about 50 lines of Node, serves the export for `pnpm start`
and for Playwright.
**Reason:** `next start` does not serve an export. `npx serve` would download an unpinned
package on every CI run, and a package such as `serve` would be a new dependency for a task
that `node:http` covers.

## D7. Test and config conventions (2026-11-26)

- Unit tests sit next to the code (`*.test.ts(x)`); end-to-end tests live in `e2e/`.
- `vitest.config.mts` uses the `.mts` extension so the package can stay CommonJS-typed
  without a loader warning.
- Path aliases `@/`, `@content/` and `@messages/` are declared in both `tsconfig.json` and
  `vitest.config.mts`, because Vite does not read `paths` by default.
- `eslint-config-prettier` is not installed: no stylistic ESLint rules are enabled, so there is
  nothing for it to switch off. Prettier runs as its own check.
