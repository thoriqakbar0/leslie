import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

void test("builds the leslie launch page for cloudflare pages", async () => {
  const html = await readFile(new URL("dist/index.html", projectRoot), "utf8");

  assert.match(html, /<title>Leslie — The to-do list you’ll actually keep<\/title>/i);
  assert.match(html, /name="description"/i);
  assert.match(html, /https:\/\/leslie\.ta-0\.com\/og\.png/);
  assert.match(html, /rel="canonical" href="https:\/\/leslie\.ta-0\.com\/"/);
  assert.match(html, /<div id="root"><\/div>/);

  const assets = await readdir(new URL("dist/assets/", projectRoot));
  assert.ok(assets.some((file) => file.endsWith(".css")));
  assert.ok(assets.some((file) => file.endsWith(".js")));
  await access(new URL("dist/leslie-app.png", projectRoot));
  await access(new URL("dist/og.png", projectRoot));
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
    /https:\/\/github\.com\/thoriqakbar0\/leslie\/releases\/download\/v0\.2\.0\/Leslie-v0\.2\.0-macOS\.zip/,
  );
  assert.match(app, /Download the macOS beta/);
  assert.match(app, /Get the beta/);
  assert.match(app, /The to-do list you’ll actually keep\./);
  assert.match(app, /Because when plans change/);
  assert.match(app, /brings you back to/);
  assert.doesNotMatch(app, /eyebrow|A local-first work log for macOS/);
  assert.doesNotMatch(app, /releases\/latest|Explore Leslie on GitHub|View on GitHub/i);
  assert.doesNotMatch(app, /next\/image|codex-preview|SkeletonPreview/i);
  assert.match(css, /--coral-ink: #c43a0c/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
});
