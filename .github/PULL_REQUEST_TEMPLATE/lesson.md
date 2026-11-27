<!--
Title: `Add lesson: <title>`

Use this template for a lesson pull request: `gh pr create --template lesson.md`, or add
`?template=lesson.md` to the "compare" URL. Delete the comments when you fill it in.

Base branch: `main`. When two lessons are done in one go, the second lesson's branch is created from
the first lesson's branch and its pull request targets that branch; the owner retargets it to `main`
after merging the first (see CLAUDE.md, "Two lessons at a time").
-->

## Summary

<!-- What the lesson teaches, in two or three sentences, and what is new in the diff beyond the
lesson's own files. -->

## Acceptance criteria

<!-- Copy the lesson's block from docs/PROGRESS.md, with each criterion's status. Tick only what
passed. -->

- [ ] Content validation passes (`pnpm test`: `content/lessons/lessons.test.ts` and the catalog test)
- [ ] The end-to-end test plays it from the first step to the last with the keyboard, and checks the
      metrics and the verdict table
- [ ] axe is clean in both themes, on the final state of every step and with a packet in flight
- [ ] Checked at desktop (1280 px) and phone width (375 px): no layout shift, the step card keeps its
      height, the metric labels and values fit, the page never scrolls sideways
- [ ] Lesson page JavaScript under 150 KB gzipped; no other page grew
- [ ] The owner checks the look (screenshots below)

## Checks

<!-- Paste the markdown block that `pnpm check:lesson <slug>` prints (it is also saved in
`.lesson-checks/<slug>/report.md`). It holds the result of every check, the size table and the
Lighthouse numbers. -->

## Screenshots

<!-- The folder `pnpm screenshots <slug>` wrote, and anything in it worth a look. Text that collides,
runs out of a panel or is cut off is a bug to fix before this is opened. -->

## Decisions the spec did not settle

<!-- The choices made, one line each. They also go in docs/DECISIONS.md. -->

## Open questions

<!-- Questions for the owner, or "none". -->
