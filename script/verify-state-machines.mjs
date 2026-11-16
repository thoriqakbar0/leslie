import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.resolve(process.argv[2] ?? root);
const profile = await mkdtemp(path.join(tmpdir(), "leslie-state-check-"));
const display = spawn("Xvfb", ["-displayfd", "1", "-screen", "0", "1100x760x24"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let electron;
let socket;
let nextId = 0;
const pending = new Map();
const failures = [];
const events = new Map();

async function until(probe, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const value = await probe();
    if (value) return value;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out on CDP ${method}`));
    }, 10_000);
    pending.set(id, {
      resolve(value) {
        clearTimeout(timer);
        resolve(value);
      },
      reject(error) {
        clearTimeout(timer);
        reject(error);
      },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function onceEvent(method) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      events.delete(method);
      reject(new Error(`Timed out on ${method}`));
    }, 10_000);
    events.set(method, () => {
      clearTimeout(timer);
      events.delete(method);
      resolve();
    });
  });
}

async function evaluate(expression) {
  const response = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
const query = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
async function waitFor(selector) {
  await until(() => evaluate(`!!${query(selector)}`), selector);
}
async function click(selector) {
  await waitFor(selector);
  await evaluate(`${query(selector)}.click()`);
  await delay(50);
}
async function input(selector, value) {
  await waitFor(selector);
  await evaluate(
    `(() => { const input = ${query(selector)}; input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await delay(50);
}
async function key(key, code = key) {
  await command("Input.dispatchKeyEvent", { type: "keyDown", key, code });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key, code });
  await delay(50);
}
async function stored() {
  return evaluate("window.leslieStorage.load()");
}
async function waitStored(probe, label) {
  return until(async () => {
    const result = await stored();
    return result.ok && probe(result.value) ? result.value : null;
  }, label);
}

try {
  const displayNumber = await new Promise((resolve, reject) => {
    display.stdout.once("data", (data) => resolve(data.toString().trim()));
    display.once("error", reject);
    display.once("exit", (code) => reject(new Error(`Xvfb exited ${code}`)));
  });
  const receiptsPath = path.join(profile, "writes.json");
  const fixturePath = path.join(profile, "main.mjs");
  await writeFile(
    fixturePath,
    `
import { ipcMain } from "electron";
import { writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
const receipts = [];
const record = (value) => { receipts.push(value); writeFileSync(${JSON.stringify(receiptsPath)}, JSON.stringify(receipts)); };
const handle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, listener) => handle(channel, async (...args) => {
  if (channel !== "leslie:storage:save") return listener(...args);
  const label = args[1].tasks.find(task => task.title.startsWith("Queue "))?.title ?? "ordinary";
  record("start:" + label);
  if (label === "Queue failed write" || label === "Queue slow write") await delay(500);
  const result = label === "Queue failed write" ? { ok: false, error: { operation: "write" } } : await listener(...args);
  record("end:" + label);
  return result;
});
await import(${JSON.stringify(pathToFileURL(path.join(appRoot, "electron/main.mjs")).href)});
`,
  );
  const receipts = async () => JSON.parse(await readFile(receiptsPath, "utf8"));
  electron = spawn(
    path.join(root, "node_modules/electron/dist/electron"),
    ["--no-sandbox", "--remote-debugging-port=0", fixturePath],
    {
      env: {
        ...process.env,
        DISPLAY: `:${displayNumber}`,
        XDG_CONFIG_HOME: profile,
        NODE_OPTIONS: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  electron.stderr.on("data", (data) => {
    stderr += data;
  });
  electron.once("error", (error) => failures.push(String(error)));
  const port = await until(() => {
    const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (electron.exitCode !== null)
      throw new Error(`Electron exited ${electron.exitCode}: ${stderr}`);
    return match?.[1];
  }, "Electron debugger");
  const page = await until(async () => {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    return pages.find((page) => page.type === "page" && page.url.startsWith("file:"));
  }, "production renderer");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = ({ data }) => {
    const response = JSON.parse(data);
    events.get(response.method)?.();
    if (response.method === "Runtime.exceptionThrown")
      failures.push(JSON.stringify(response.params));
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.error) request.reject(new Error(response.error.message));
    else request.resolve(response.result);
  };
  socket.onclose = () => {
    for (const request of pending.values())
      request.reject(new Error("Electron debugger disconnected"));
    pending.clear();
  };
  await command("Runtime.enable");
  await command("Page.enable");
  await waitFor(".leslie-app");
  assert.deepEqual(await receipts(), ["start:ordinary", "end:ordinary"]);
  const before = await stored();
  assert.equal(before.ok, true);
  const task = before.value.tasks.find((task) => task.listId === "inbox");
  assert.ok(task);
  const play = `[aria-label="Playback for ${task.title}"]`;
  await click(play);
  await waitFor(".is-playing");
  await delay(1100);
  await click(play);
  await waitFor(".is-paused");
  assert.match(await evaluate("document.querySelector('.playback-bar').textContent"), /0:01/);
  await click(play);
  await waitFor(".is-playing");
  await click(".playback-stop");
  assert.equal(await evaluate("!!document.querySelector('.is-current')"), false);

  const trigger = `[data-notes-trigger="task:${task.id}"]`;
  await evaluate(`${query(trigger)}.focus()`);
  await key("e", "KeyE");
  await input(".activity-title-editor", "A cancelled title");
  await key("Escape");
  assert.equal(await evaluate(`${query(trigger)}.textContent`), task.title);
  await key("e", "KeyE");
  await input(".activity-title-editor", "State machine smoke task");
  await key("Enter");
  const renamed = await waitStored(
    (state) =>
      state.tasks.some((item) => item.id === task.id && item.title === "State machine smoke task"),
    "title persistence",
  );
  assert.equal(
    renamed.history.filter((entry) => entry.type === "title-changed" && entry.itemId === task.id)
      .length,
    1,
  );

  await click(trigger);
  await waitFor(".rich-notes-editor");
  await command("Input.insertText", { text: "Notes flushed on close" });
  await key("Escape");
  await waitStored(
    (state) =>
      state.tasks.some(
        (item) => item.id === task.id && item.notes.includes("Notes flushed on close"),
      ),
    "notes flush",
  );

  await click('[aria-label="Add folder"]');
  await input("#new-list-name", "Draft preserved");
  await evaluate(
    "document.querySelector('.list-select').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))",
  );
  await waitFor(".list-edit input");
  assert.equal(await evaluate("document.querySelector('#new-list-name').value"), "Draft preserved");
  await input(".list-edit input", "Cancelled folder");
  await key("Escape");
  assert.equal((await stored()).value.lists[0].name, "Inbox");
  await click(".new-list-submit");
  await waitStored(
    (state) => state.lists.some((list) => list.name === "Draft preserved"),
    "folder creation",
  );
  await evaluate(
    "Array.from(document.querySelectorAll('.list-select')).find(button => button.textContent.includes('Inbox')).click()",
  );

  await click('[aria-label="Playback for State machine smoke task"]');
  await click('[aria-label="Complete State machine smoke task"]');
  await waitStored(
    (state) =>
      !state.tasks.some((item) => item.id === task.id) &&
      state.workLog.some((item) => item.id === task.id && item.origin === "planned"),
    "completion",
  );
  assert.equal(await evaluate("!!document.querySelector('.is-current')"), false);
  await click('[aria-label="Delete work log: Completed State machine smoke task."]');
  await click(".toast button");
  await waitStored((state) => state.workLog.some((item) => item.id === task.id), "undo");

  await click(".current-date");
  await waitFor(".date-picker");
  await key("Escape");
  assert.equal(await evaluate("document.activeElement.className"), "current-date");
  const queueTask = before.value.tasks.find(
    (item) => item.id !== task.id && item.listId === "inbox",
  );
  assert.ok(queueTask);
  const queueTrigger = `[data-notes-trigger="task:${queueTask.id}"]`;
  async function renameQueueTask(title) {
    await evaluate(`${query(queueTrigger)}.focus()`);
    await key("e", "KeyE");
    await input(".activity-title-editor", title);
    await key("Enter");
  }
  await renameQueueTask("Queue failed write");
  await waitFor(".storage-warning");
  await renameQueueTask("Queue slow write");
  await renameQueueTask("Queue latest write");
  assert.equal(await evaluate("!!document.querySelector('.storage-warning')"), true);
  await waitStored(
    (state) =>
      state.tasks.some((item) => item.id === queueTask.id && item.title === "Queue latest write"),
    "latest queued write",
  );
  await until(
    async () => !(await evaluate("!!document.querySelector('.storage-warning')")),
    "warning recovery",
  );
  assert.deepEqual(
    (await receipts()).filter((value) => value.includes("Queue ")),
    [
      "start:Queue failed write",
      "end:Queue failed write",
      "start:Queue slow write",
      "end:Queue slow write",
      "start:Queue latest write",
      "end:Queue latest write",
    ],
  );
  const writesBeforeReload = await receipts();
  const reload = onceEvent("Page.loadEventFired");
  await command("Page.reload");
  await reload;
  await waitFor(".leslie-app");
  await waitStored(
    (state) => state.workLog.some((item) => item.id === task.id),
    "reload persistence",
  );
  assert.equal(await evaluate(`${query(queueTrigger)}.textContent`), "Queue latest write");
  await delay(250);
  assert.deepEqual(await receipts(), writesBeforeReload);
  assert.deepEqual(failures, []);
  console.log(
    `PASS production Electron smoke (${appRoot}): playback, title commit/cancel, notes flush, independent folder drafts, completion, undo, date-picker focus, ordered writes, warning recovery, hydration without duplicate writes, SQLite reload`,
  );
} finally {
  socket?.close();
  electron?.kill();
  display.kill();
  if (electron && electron.exitCode === null)
    await new Promise((resolve) => electron.once("exit", resolve));
  await rm(profile, { recursive: true, force: true });
}
