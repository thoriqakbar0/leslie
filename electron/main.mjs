import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const appIconPath = path.join(currentDirectory, "../assets/brand/leslie-app-icon.png");

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
    await createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch(failStartup);
      }
    });
  })
  .catch(failStartup);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
