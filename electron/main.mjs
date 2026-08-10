import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLeslieDatabase } from "./sqlite-storage.mjs";
import storageChannels from "./storage-channels.cjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const appIconPath = path.join(currentDirectory, "../assets/brand/leslie-app-icon.png");
const preloadPath = path.join(currentDirectory, "preload.cjs");
let localDatabase = null;
let databaseOpenFailed = false;

function parseRendererUrl(value) {
  if (!value) return null;

  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
    throw new Error("LESLIE_RENDERER_URL must use local HTTP");
  }

  return url;
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: "#ffffff",
    icon: appIconPath,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const rendererUrl = parseRendererUrl(process.env.LESLIE_RENDERER_URL);
  if (rendererUrl) {
    await window.loadURL(rendererUrl.toString());
    return;
  }

  await window.loadFile(path.join(currentDirectory, "../dist/index.html"));
}

function storageFailure(operation) {
  return { ok: false, error: { operation } };
}

function registerStorageHandlers() {
  try {
    localDatabase = createLeslieDatabase(path.join(app.getPath("userData"), "leslie.sqlite3"));
  } catch {
    databaseOpenFailed = true;
  }

  ipcMain.handle(storageChannels.load, () => {
    if (databaseOpenFailed || localDatabase === null) return storageFailure("open");
    try {
      return { ok: true, value: localDatabase.loadState() };
    } catch {
      return storageFailure("read");
    }
  });

  ipcMain.handle(storageChannels.save, (_event, state) => {
    if (databaseOpenFailed || localDatabase === null) return storageFailure("open");
    try {
      localDatabase.saveState(state);
      return { ok: true, value: null };
    } catch {
      return storageFailure("write");
    }
  });
}

function failStartup(cause) {
  console.error("Leslie failed to start", cause);
  app.quit();
}

app.setName("Leslie");
Menu.setApplicationMenu(null);

app
  .whenReady()
  .then(async () => {
    if (process.platform === "darwin") app.dock.setIcon(appIconPath);
    registerStorageHandlers();
    await createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch(failStartup);
      }
    });
  })
  .catch(failStartup);

app.on("before-quit", () => {
  localDatabase?.close();
  localDatabase = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
