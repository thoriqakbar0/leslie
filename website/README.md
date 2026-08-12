# Leslie website

Public marketing site for Leslie, a local-first macOS work log.

GitHub `main` is the deployment source. Cloudflare Pages builds from this directory and
serves the canonical site at `https://leslie.ta-0.com`.

## Commands

- `nub install --frozen-lockfile` installs dependencies from `nub.lock`.
- `nub run dev` starts the local site.
- `nub run check` checks formatting, lint rules, and types.
- `nub run build` creates the static production site in `dist/`.
- `nub run test` checks the built HTML and launch assets.

## Cloudflare Pages

- Production branch: `main`
- Root directory: `website`
- Build command: `npx -y @nubjs/nub@0.7.5 install --frozen-lockfile --ignore-scripts && npx -y @nubjs/nub@0.7.5 run build`
- Build output directory: `dist`
- Canonical domain: `leslie.ta-0.com`

## Launch assets

- `public/leslie-app.png` is a real Leslie window captured from a temporary demo profile.
- `public/leslie-app-icon.png` and `public/leslie-mark.png` come from Leslie's approved brand assets.
- `public/og.png` is the 1200 × 630 social preview created for this launch.

The demo profile used generic tasks and was removed after the screenshot was captured.
