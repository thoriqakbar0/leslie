# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Selected visual direction

- Recreate `exec-4483ae71-731d-40be-a8e7-cbb520c0a608.png` as the visual source of truth.
- Keep the timer digits simple and compact.
- Preserve the reset control beside the primary timer action.
- Show an editable session purpose as a title and short description above the timer.
- Keep the warm, floating macOS utility-window character and tabbed note editor.
- Keep start, pause, and reset as direct timer controls. Do not hide reset in a menu.
- Let users choose a break, continue focusing, or finish when a session ends.
- Treat folders as the permanent note library and tabs as the temporary workspace.
- Keep note folders foldable, show note save status, and support standard tab keyboard navigation.
- Run the product inside an Electron desktop shell while preserving the existing web and Sites builds.
- Keep the Leslie work-log prototype at `/protoype` without changing the Focus Dock root experience.
- Keep Leslie capture actions at the input end, accept natural-language time estimates, and support quick list creation.
- Keep the Focus Dock root free of the timer strip, timer history action, and reset timer option.
- Use Leslie as the repository, package, Electron application, and project name.
