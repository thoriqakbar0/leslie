# Design QA

## Evidence

- Source visual truth: `/Users/thor/.codex/generated_images/019fe77d-7091-7b93-a006-326c317851e6/exec-4483ae71-731d-40be-a8e7-cbb520c0a608.png`
- Source pixels: `1487 x 1058`.
- Normalized source: `source-normalized.png`, center-cropped to `1440 x 1024` without scaling.
- Implementation screenshot: `implementation-final.png`.
- Implementation pixels: `1440 x 1024`.
- Combined comparison: `comparison-final.png`.
- CSS viewport: `1440 x 1024`.
- Browser device pixel ratio: `2`.
- Browser screenshot output: normalized to `1440 x 1024` CSS pixels by the in-app browser.
- Rendered app frame: `550 x 844` CSS pixels at approximately `x: 445`, `y: 91`.
- State: running 25-minute focus session, `session` note selected, note editor focused.

## Full-view comparison evidence

`comparison-final.png` places the normalized source on the left and the browser-rendered implementation on the right. The floating window position, `550 x 844` frame, five-region vertical structure, title hierarchy, timer controls, tab row, note density, status bar, and warm backdrop align closely.

## Focused region comparison evidence

The app window is large and readable in the same `2880 x 1024` combined image. A separate crop was not needed. The comparison clearly shows title wrapping, timer typography, control placement, tab spacing, note line breaks, border radius, and footer alignment.

## Required fidelity surfaces

- Fonts and typography: system San Francisco fallbacks reproduce the native macOS character. Title, purpose, timer, tab, note, and status weights preserve the source hierarchy. The timer uses tabular digits.
- Spacing and layout rhythm: the frame measures `550 x 844`, matching the selected visual. Header, purpose, timer, tabs, editor, and footer align with the source proportions. The session purpose now uses the same two-line width.
- Colors and visual tokens: warm off-white window, graphite text, muted secondary text, amber controls, fine separators, and soft elevation match the source.
- Image quality and asset fidelity: the backdrop is a project-local generated raster asset at `public/assets/focus-dock-wallpaper.png`. It matches the source palette and composition without embedding duplicated interface content. Phosphor supplies all non-system icons.
- Copy and content: visible title, purpose, tabs, note, status, and duration match the selected visual. The live timer differs by seconds because it is functional.

## Comparison history

### Iteration 1

- [P2] Session purpose was too wide.
  - Evidence: `comparison-v1.png` showed the implementation wrapping after “prepare the,” while the source wrapped after “and.”
  - Fix: narrowed and offset the editable title and purpose fields while preserving centered timer controls.
  - Post-fix evidence: `comparison-final.png` shows the same two-line purpose wrapping as the source.

- [P2] Captured interaction focus changed the primary timer control.
  - Evidence: `implementation-v2.png` showed the keyboard focus ring after shortcut testing.
  - Fix: captured the final resting state with focus in the note editor.
  - Post-fix evidence: `implementation-final.png` shows the default timer control treatment.

## Findings

No actionable P0, P1, or P2 differences remain.

The generated wallpaper is not pixel-identical to the mock backdrop, but it preserves the source composition and does not affect the product surface. This is an acceptable P3 variation.

## Primary interactions tested

- Pause and resume the timer.
- Reset the timer to `25:00`.
- Switch note tabs.
- Add, rename, edit, persist, and close a note tab.
- Toggle pinned and movable window states.
- Hide and restore the window with `Command-Shift-Space`.
- Reload and confirm note persistence.
- Check browser console errors: none.

## Implementation checklist

- [x] Match the selected visual target.
- [x] Preserve user-requested compact timer and session purpose.
- [x] Implement the full primary interaction path.
- [x] Verify persistence and keyboard behavior.
- [x] Verify production build and Sites package tests.

## Follow-up polish

- Optional P3: tune wallpaper texture if the prototype later needs pixel-level backdrop matching.

final result: passed
