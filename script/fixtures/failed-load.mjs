import { app, ipcMain } from "electron";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const appRoot = process.env.LESLIE_VERIFY_APP_ROOT;
const profile = process.env.LESLIE_VERIFY_PROFILE;
if (!appRoot || !profile) throw new Error("The failed-load fixture needs an app root and profile");

const dataDirectory = path.join(profile, "data");
mkdirSync(dataDirectory);
app.setPath("userData", dataDirectory);
void app.whenReady().then(async () => {
  const storageUrl = pathToFileURL(path.join(appRoot, "electron/sqlite-storage.mjs"));
  const { createLeslieDatabase } = await import(storageUrl.href);
  const database = createLeslieDatabase(path.join(dataDirectory, "leslie.sqlite3"));
  database.saveState({
    lists: [{ id: "inbox", name: "Inbox" }],
    activeListId: "inbox",
    tasks: [
      {
        id: "protected",
        listId: "inbox",
        title: "Protected original task",
        notes: "Keep these notes",
        estimatedMinutes: 30,
        scheduledAt: Date.now(),
      },
    ],
    workLog: [],
    history: [],
  });
  database.close();

  let loadFailuresRemaining = 2;
  const writes = [];
  const receiptsPath = path.join(profile, "writes.json");
  writeFileSync(receiptsPath, JSON.stringify(writes));
  const handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, listener) =>
    handle(channel, (...args) => {
      if (channel === "leslie:storage:load" && loadFailuresRemaining > 0) {
        loadFailuresRemaining -= 1;
        return { ok: false, error: { operation: "read" } };
      }
      if (channel === "leslie:storage:save") {
        writes.push("save");
        writeFileSync(receiptsPath, JSON.stringify(writes));
      }
      return listener(...args);
    });
  await import(pathToFileURL(path.join(appRoot, "electron/main.mjs")).href);
});
