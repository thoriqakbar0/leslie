import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

void test("builds the leslie launch page for cloudflare pages", async () => {
  const html = await readFile(new URL("dist/index.html", projectRoot), "utf8");

  assert.match(html, /<title>Leslie — The to-do list you’ll actually keep<\/title>/i);
  assert.match(html, /name="description"/i);
  assert.match(html, /https:\/\/leslie\.ta-0\.com\/og-v2\.png/);
  assert.match(html, /property="og:image:type" content="image\/png"/);
  assert.match(html, /name="twitter:image:alt"/);
  assert.match(html, /rel="canonical" href="https:\/\/leslie\.ta-0\.com\/"/);
  assert.match(html, /<div id="root"><\/div>/);

  const assets = await readdir(new URL("dist/assets/", projectRoot));
  assert.ok(assets.some((file) => file.endsWith(".css")));
  assert.ok(assets.some((file) => file.endsWith(".js")));
  await access(new URL("dist/leslie-app.png", projectRoot));
  const socialPreview = await readFile(new URL("dist/og-v2.png", projectRoot));
  assert.equal(socialPreview.readUInt32BE(16), 1200);
  assert.equal(socialPreview.readUInt32BE(20), 630);
});

void test("keeps the launch source responsive and accessible", async () => {
  const [css, app] = await Promise.all([
    readFile(new URL("src/index.css", projectRoot), "utf8"),
    readFile(new URL("src/App.tsx", projectRoot), "utf8"),
  ]);

  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\*::before/);
  assert.match(css, /margin: 0/);
  assert.match(css, /padding: 0/);
  assert.match(app, /aria-label="Main navigation"/);
  assert.match(app, /className="skip-link" href="#main-content"/);
  assert.match(app, /<main id="main-content">/);
  assert.match(app, /alt="Leslie showing two planned tasks and a factual timeline entry"/);
  assert.match(
    app,
    /https:\/\/github\.com\/thoriqakbar0\/leslie\/releases\/download\/v0\.2\.1\/Leslie-v0\.2\.1-macOS\.zip/,
  );
  assert.match(app, /Download the macOS beta/);
  assert.match(app, /Download beta/);
  assert.match(app, /The to-do list you’ll actually keep\./);
  assert.match(app, /Plans change\./);
  assert.match(app, /return to today/);
  assert.match(app, /MIT licensed/);
  assert.match(app, /Not notarized/);
  assert.match(app, /Open source means you can change Leslie\./);
  assert.match(app, /View Leslie’s source/);
  assert.match(app, /https:\/\/github\.com\/thoriqakbar0\/leslie/);
  assert.doesNotMatch(app, /eyebrow|section-kicker|A local-first work log for macOS/);
  assert.doesNotMatch(app, /releases\/latest|Explore Leslie on GitHub|View on GitHub/i);
  assert.doesNotMatch(app, /next\/image|codex-preview|SkeletonPreview/i);
  assert.match(css, /--coral-ink: #c43a0c/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
});
