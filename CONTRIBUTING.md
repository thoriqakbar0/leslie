# Contributing to Leslie

Thank you for helping make Leslie a to-do list people can return to. This guide explains how to propose a change, run the project, verify your work, and prepare a pull request.

## Before you start

Open an issue before making a substantial product, behavior, or interface change. In the issue, describe:

- the problem and who encounters it;
- what Leslie does today;
- the outcome you want, without prescribing more implementation than necessary.

Small bug fixes, documentation corrections, and narrowly scoped maintenance changes do not need an issue first.

Keep these product boundaries intact:

- Keep planned work distinct from factual work logs.
- Keep capture permissive and correction reversible.
- Keep data local unless remote storage is explicit and optional.
- Do not add streaks, scores, guilt language, or forced backlog review.
- Keep the production Electron app at the repository root.
- Keep the earlier web prototype isolated in `prototype/`.

## Set up the project

Leslie requires the versions pinned in the repository:

- Node.js 24.19.0, from `.node-version`;
- Nub 0.7.5, from the `packageManager` field in `package.json`.

From the repository root, install the locked dependencies and start the Electron app:

```sh
nub install --frozen-lockfile
nub run dev
```

The development command starts the Vite renderer and opens Leslie in Electron. Application data remains on your machine.

## Find your way around

- `src/` contains the production React renderer.
- `electron/` contains the Electron shell and local SQLite storage.
- `shared/` contains code shared across application boundaries.
- `website/` contains the marketing site.
- `prototype/` preserves the earlier web prototype and has its own contributor instructions in `prototype/AGENTS.md`.
- `docs/` contains research notes and release notes.

Use React, TypeScript, Tailwind CSS, and Vite+ through the existing package scripts. Use Nub for dependency management and keep `nub.lock` in sync with dependency changes.

## Make a focused change

Keep each pull request limited to one problem. Preserve unrelated code and avoid mixing refactors with behavior changes unless the refactor is required for the fix.

When behavior changes, update or add tests that demonstrate the intended result. When commands, setup, or user-visible behavior change, update the relevant documentation in the same pull request.

Do not edit generated directories such as `dist/` or local runtime data in `.leslie-runtime/`.

## Verify your change

Run the root checks before opening a pull request:

```sh
nub run check
nub run test
nub run build
```

Use narrower commands while iterating when helpful:

```sh
nub run format
nub run lint
```

For changes under `website/`, also run the website checks:

```sh
cd website
nub install --frozen-lockfile
nub run check
nub run test
nub run build
```

If a check cannot run in your environment, say which command you skipped and why in the pull request.

## Open a pull request

In the pull request description:

- explain the problem and why the change belongs in Leslie;
- summarize the solution and any important tradeoffs;
- link the related issue, when one exists;
- list the verification commands you ran;
- include screenshots or a short recording for visible interface changes;
- call out data migrations, new dependencies, or follow-up work.

Before requesting review, confirm that:

- the change stays within Leslie’s product boundaries;
- the Electron app still starts and the affected flow works;
- tests and documentation cover the changed behavior;
- no local data, generated output, or unrelated changes are included.

A maintainer may ask for a smaller scope or a different approach before merging. That feedback is part of keeping Leslie coherent and maintainable.
