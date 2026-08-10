const { contextBridge, ipcRenderer } = require("electron");

const LOAD_CHANNEL = "leslie:storage:load";
const SAVE_CHANNEL = "leslie:storage:save";

contextBridge.exposeInMainWorld(
  "leslieStorage",
  Object.freeze({
    load: () => ipcRenderer.invoke(LOAD_CHANNEL),
    save: (state) => ipcRenderer.invoke(SAVE_CHANNEL, state),
  }),
);
