# Leslie

Local-first Electron app for planned work and factual work logs. Leslie uses React,
TypeScript, Tailwind CSS, Vite+, Nub, and SQLite.

The previous product prototype is preserved in `prototype/`.

## Commands

- `nub install --frozen-lockfile` installs dependencies from `nub.lock`.
- `nub run dev` starts Vite and the Electron window.
- `nub run check` checks formatting, lint rules, and types.
- `nub run test` runs the test suite once.
- `nub run build` builds the React renderer.
- `nub run start` opens the built Electron application.

Nub 0.7.5 and Node 24.19.0 are pinned in the repository. Vite+ remains the renderer,
test, formatting, and lint engine behind the package scripts.
