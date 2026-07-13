const { Notification } = require("electron");

const REPEAT_INTERVAL_MS = 60_000;

/**
 * Manages the set of currently-active voice alert loops. Each loop repeats
 * its audio every REPEAT_INTERVAL_MS forever until explicitly stopped via
 * stop()/stopAll() (only triggered by an admin stop command or app restart
 * catch-up, never by the desktop user).
 */
function createAlertManager({ playAudio, log }) {
  const loops = new Map();

  function start(message) {
    if (loops.has(message.id)) return;

    log(`Starting alert loop for message ${message.id}`);

    new Notification({
      title: "Voice Alert",
      body: "New voice alert from admin. It will keep repeating until the admin stops it.",
      urgency: "critical",
    }).show();

    const dataUrl = `data:${message.mimeType};base64,${message.audioData}`;
    playAudio(dataUrl);

    const intervalId = setInterval(() => {
      playAudio(dataUrl);
    }, REPEAT_INTERVAL_MS);

    loops.set(message.id, intervalId);
  }

  function stop(id) {
    const intervalId = loops.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      loops.delete(id);
      log(`Stopped alert loop for message ${id}`);
    }
  }

  function stopAll() {
    for (const [id, intervalId] of loops) {
      clearInterval(intervalId);
      log(`Stopped alert loop for message ${id}`);
    }
    loops.clear();
  }

  function activeIds() {
    return [...loops.keys()];
  }

  return { start, stop, stopAll, activeIds };
}

module.exports = { createAlertManager };
