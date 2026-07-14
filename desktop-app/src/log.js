const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// A minimal on-disk log so failures that happen in a packaged app (no
// visible console) can still be diagnosed -- e.g. by asking the user to
// open this file and share its contents.
function logPath() {
  return path.join(app.getPath("userData"), "voice-alert.log");
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  // eslint-disable-next-line no-console
  console.log(line);
  try {
    fs.appendFileSync(logPath(), line + "\n", "utf-8");
  } catch {
    // If we can't write the log file, there's nowhere else to report that.
  }
}

module.exports = { log, logPath };
