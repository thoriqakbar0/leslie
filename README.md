# Leslie

Local-first Electron app for planned work and factual work logs. Leslie uses React,
TypeScript, Tailwind CSS, Vite+, Nub, and SQLite.

The previous product prototype is preserved in `prototype/`.

The public marketing site lives in `website/`. It has its own Nub lockfile, production
build, rendered-page tests, and Sites hosting configuration.

## Commands

- `nub install --frozen-lockfile` installs dependencies from `nub.lock`.
- `nub run dev` starts Vite and the Electron window.
- `nub run check` checks formatting, lint rules, and types.
- `nub run test` runs the test suite once.
- `nub run build` builds the React renderer.
- `nub run start` opens the built Electron application.

Run website commands from `website/`:

- `nub run dev` starts the local marketing site.
- `nub run build` builds the production site.
- `nub run test` checks the rendered launch page.

Nub 0.7.5 and Node 24.19.0 are pinned in the repository. Vite+ remains the renderer,
test, formatting, and lint engine behind the package scripts.
