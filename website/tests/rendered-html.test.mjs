import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

void test("builds the leslie launch page for cloudflare pages", async () => {
  const html = await readFile(new URL("dist/index.html", projectRoot), "utf8");

  assert.match(html, /<title>Leslie — Make peace with what got done<\/title>/i);
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
  assert.match(app, /aria-label="Main navigation"/);
  assert.match(app, /alt="Leslie showing two planned tasks and a factual timeline entry"/);
  assert.match(app, /https:\/\/github\.com\/thoriqakbar0\/leslie/);
  assert.doesNotMatch(app, /releases\/latest|Download the macOS beta|Get the beta/i);
  assert.doesNotMatch(app, /next\/image|codex-preview|SkeletonPreview/i);
});
