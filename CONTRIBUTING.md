# Contributing to Leslie

Thank you for helping Leslie become a to-do list people can return to.

## Before changing the product

Open an issue before a substantial behavior or interface change. Describe the problem, the person who
encounters it, and what Leslie does today.

Keep these product boundaries intact:

- Keep planned work distinct from factual work logs.
- Keep capture permissive and correction reversible.
- Keep data local unless a future feature makes remote storage explicit and optional.
- Do not add streaks, scores, guilt language, or forced backlog review.
- Keep the production Electron app at the repository root and the earlier prototype in `prototype/`.

## Run Leslie locally

```sh
nub install --frozen-lockfile
nub run dev
```

## Verify a change

```sh
nub run check
nub run test
nub run build
```

For marketing-site changes, also run:

```sh
cd website
nub install --frozen-lockfile
nub run check
nub run build
nub run test
```

Keep pull requests focused. Explain what changed, why it belongs in Leslie, and how you verified it.
