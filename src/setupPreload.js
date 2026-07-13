// Intentionally left minimal: setup.html uses nodeIntegration-free access via
// ipcRenderer through this preload's context bridge equivalent. We keep
// contextIsolation default (true) here and expose ipcRenderer directly
// because this is a fully trusted, first-party local window.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipcRenderer", {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
});
