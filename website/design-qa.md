# Leslie marketing-site design QA

## Comparison target

- Source visual truth: `/Users/thor/.codex/visualizations/2026/08/12/019ff605-49f6-7661-bb52-4c845bf0aad6/leslie-source-final-1440x1000.png`
- Implementation screenshot: `/Users/thor/.codex/visualizations/2026/08/12/019ff605-49f6-7661-bb52-4c845bf0aad6/leslie-final-no-eyebrow-desktop.png`
- Mobile implementation screenshot: `/Users/thor/.codex/visualizations/2026/08/12/019ff605-49f6-7661-bb52-4c845bf0aad6/leslie-final-no-eyebrow-mobile.png`
- Combined comparison: `/Users/thor/.codex/visualizations/2026/08/12/019ff605-49f6-7661-bb52-4c845bf0aad6/leslie-source-vs-final-no-eyebrow.png`
- Viewport: 1440 × 1000 CSS pixels for the desktop comparison; 390 × 844 CSS pixels for the responsive check.
- Pixel dimensions: 1440 × 1000 for both desktop captures; 390 × 844 for mobile.
- Density normalization: `devicePixelRatio` 1 for source and implementation captures. No resampling was required.
- State: homepage at the top of the page, default theme, no hover or focus state.

## Findings

No actionable P0, P1, or P2 mismatch remains.

- Fonts and typography: the implementation preserves the source's Georgia display face and Inter/system sans hierarchy. The user-directed hero copy is an intentional content change. Its desktop heading remains 328.3125 pixels high, preserving the source composition.
- Spacing and layout rhythm: navigation, hero grid, orbit, actions, and product-stage rhythm align with the source. The eyebrow removal intentionally shortens the hero. At 1440 pixels, the hero begins at y=105, is 740 pixels tall, and the product stage begins at y=845.
- Colors and visual tokens: cream, navy, coral, muted copy, and line opacity match the selected source.
- Image quality and asset fidelity: the supplied Leslie mark and application screenshot remain unchanged raster assets. No placeholder or code-drawn replacement was introduced.
- Copy and content: the hero now reads “The to-do list you’ll actually keep.” The supporting sentence explains the researched return behavior. The eyebrow was intentionally removed by user direction. Download calls use the selected “Get the beta” and “Download the macOS beta” labels.
- Open-source positioning: the new section leads with durable control—inspect, change, or maintain Leslie—then names the MIT license. At 1440 and 390 pixels, it has no horizontal overflow and keeps a clear reading order.
- Responsive behavior: the 390- and 320-pixel checks have no horizontal overflow. A 720-pixel check approximating 200% zoom also reflows into one column without overflow.
- Interaction and accessibility: “How it works” scrolls to `#how`; the brand returns to the hero; all three beta actions expose the same direct-release URL; the main navigation and application screenshot retain accessible labels. The first keyboard target is a visible “Skip to content” link.
- Contrast: the darker coral kicker measures approximately APCA Lc 64.8 and WCAG 4.56:1 against paper. Supporting step copy measures approximately APCA Lc 75.2 and WCAG 6.30:1 against paper.
- Motion: smooth scrolling and button movement only run under `prefers-reduced-motion: no-preference`.
- Console: no warnings or errors were present during the desktop or mobile browser checks.

The full-view comparison makes the required hero, navigation, CTA, orbit, and stage details readable. A separate focused crop was unnecessary.

## Comparison history

1. Initial comparison found a P2 vertical-rhythm mismatch: the Cloudflare implementation retained browser-default paragraph margins while the selected ChatGPT-hosted source included a global reset.
2. Added the matching reset for margins, padding, and border defaults.
3. Post-fix evidence matched the source exactly before intentional copy changes: hero y=105, hero height=758, product-stage y=863, with no console errors.
4. Replaced the hero copy after research review and user direction. The final three-line heading preserves the selected type scale and layout.
5. Removed the eyebrow by explicit user direction, leaving the headline as the first hero message.
6. Completed the `better-interface` review. Added a skip link, raised small-text contrast, restricted motion to motion-safe preferences, and verified 320-pixel reflow.
7. Added the open-source positioning section. Verified its desktop and mobile layouts, source link, MIT copy, and zero-overflow behavior in the rendered browser.

## Social preview follow-up

The current `og-v2.png` social card uses the final “The to-do list you’ll actually keep.” promise. The
earlier `og.png` card remains as a versioned artifact and is no longer referenced by page metadata.

final result: passed
