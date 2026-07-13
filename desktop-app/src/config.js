const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function configPath() {
  return path.join(app.getPath("userData"), "voice-alert-config.json");
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf-8");
}

function isConfigured(config) {
  return Boolean(
    config &&
      typeof config.serverUrl === "string" &&
      config.serverUrl.length > 0 &&
      typeof config.nickname === "string" &&
      config.nickname.length > 0 &&
      typeof config.clientId === "number",
  );
}

module.exports = { loadConfig, saveConfig, isConfigured };
