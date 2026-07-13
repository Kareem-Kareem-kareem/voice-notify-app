const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require("electron");
const path = require("path");

const { loadConfig, saveConfig, isConfigured } = require("./config");
const { registerDesktop, fetchActiveMessages, wsUrl } = require("./api");
const { connectWebSocket } = require("./wsClient");
const { createAlertManager } = require("./alertLoop");

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let tray = null;
let setupWindow = null;
let playerWindow = null;
let wsHandle = null;
let alertManager = null;
let connected = false;

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[voice-alert] ${message}`);
}

function iconPath() {
  return path.join(__dirname, "..", "assets", "icon.png");
}

function createPlayerWindow() {
  playerWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  playerWindow.loadFile(path.join(__dirname, "player.html"));
}

function playAudio(dataUrl) {
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.webContents.send("play-audio", dataUrl);
  }
}

function updateTray() {
  if (!tray) return;
  const config = loadConfig();
  const statusLabel = connected ? "Connected" : "Disconnected - retrying...";
  const activeCount = alertManager ? alertManager.activeIds().length : 0;

  tray.setToolTip(
    `Voice Alert Receiver - ${config.nickname ?? "Not set up"} (${statusLabel})`,
  );

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Nickname: ${config.nickname ?? "Not set"}`, enabled: false },
      { label: `Status: ${statusLabel}`, enabled: false },
      {
        label: `Active alerts: ${activeCount}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: "Reconfigure server / nickname",
        click: () => openSetupWindow(true),
      },
      { type: "separator" },
      { label: "Quit Voice Alert Receiver", click: () => app.quit() },
    ]),
  );
}

function createTray() {
  const image = nativeImage.createFromPath(iconPath());
  tray = new Tray(image.isEmpty() ? image : image.resize({ width: 16, height: 16 }));
  updateTray();
}

function openSetupWindow(allowCancel) {
  if (setupWindow) {
    setupWindow.focus();
    return;
  }

  setupWindow = new BrowserWindow({
    width: 380,
    height: 360,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "Voice Alert Receiver Setup",
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "setupPreload.js"),
    },
  });

  setupWindow.setMenuBarVisibility(false);
  setupWindow.loadFile(path.join(__dirname, "setup.html"));

  setupWindow.on("closed", () => {
    setupWindow = null;
    // If setup was mandatory (first run) and the user closed without
    // saving, quit rather than run an unconfigured, useless background app.
    if (!allowCancel && !isConfigured(loadConfig())) {
      app.quit();
    }
  });
}

async function startConnection() {
  const config = loadConfig();
  if (!isConfigured(config)) return;

  alertManager = createAlertManager({ playAudio, log });

  if (wsHandle) {
    wsHandle.close();
    wsHandle = null;
  }

  wsHandle = connectWebSocket({
    url: wsUrl(config.serverUrl, config.clientId),
    log,
    onStatusChange: (isConnected) => {
      connected = isConnected;
      updateTray();
      if (isConnected) {
        // Catch up on anything active, including messages sent while offline.
        catchUpActiveMessages(config);
      }
    },
    onMessage: (payload) => {
      if (!alertManager) return;
      if (payload.type === "message:new" && payload.message) {
        alertManager.start(payload.message);
        updateTray();
      } else if (payload.type === "message:stop") {
        if (payload.all) {
          alertManager.stopAll();
        } else if (typeof payload.id === "number") {
          alertManager.stop(payload.id);
        }
        updateTray();
      }
    },
  });

  await catchUpActiveMessages(config);
}

async function catchUpActiveMessages(config) {
  try {
    const activeMessages = await fetchActiveMessages(config.serverUrl);
    for (const message of activeMessages) {
      alertManager.start(message);
    }

    // Stop any local loop for a message the server no longer considers active
    // (covers the case where a stop happened entirely while we were offline).
    const activeIds = new Set(activeMessages.map((m) => m.id));
    for (const id of alertManager.activeIds()) {
      if (!activeIds.has(id)) {
        alertManager.stop(id);
      }
    }
    updateTray();
  } catch (err) {
    log(`Failed to fetch active messages: ${err.message}`);
  }
}

ipcMain.handle("setup:get-defaults", () => {
  const config = loadConfig();
  return { serverUrl: config.serverUrl ?? "", nickname: config.nickname ?? "" };
});

ipcMain.handle("setup:submit", async (_event, { serverUrl, nickname }) => {
  try {
    const existing = loadConfig();

    // Only register once per machine; reuse the existing id on future edits
    // (e.g. renaming) unless the server address changed, which implies a
    // different server/database that has never seen this client before.
    let clientId = existing.clientId;
    if (!clientId || existing.serverUrl !== serverUrl) {
      const registered = await registerDesktop(serverUrl, nickname);
      clientId = registered.id;
    }

    saveConfig({ serverUrl, nickname, clientId });

    if (setupWindow) {
      setupWindow.destroy();
      setupWindow = null;
    }

    await startConnection();
    updateTray();

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(async () => {
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });

  createPlayerWindow();
  createTray();

  const config = loadConfig();
  if (!isConfigured(config)) {
    openSetupWindow(false);
  } else {
    await startConnection();
  }
});

app.on("window-all-closed", () => {
  // Never quit on window close — this is a tray background app. Quitting
  // only happens via the tray "Quit" menu item.
});

app.on("before-quit", () => {
  if (wsHandle) wsHandle.close();
  if (alertManager) alertManager.stopAll();
});
