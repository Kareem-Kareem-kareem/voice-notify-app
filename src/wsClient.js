const WebSocket = require("ws");

const RECONNECT_DELAY_MS = 5000;

/**
 * Maintains a persistent WebSocket connection to the API server, reconnecting
 * automatically on drop. Calls onMessage(parsedJson) for every server push
 * and onStatusChange(connected: boolean) whenever connectivity flips.
 */
function connectWebSocket({ url, onMessage, onStatusChange, log }) {
  let ws = null;
  let closedByCaller = false;
  let reconnectTimer = null;

  function connect() {
    ws = new WebSocket(url);

    ws.on("open", () => {
      log(`WebSocket connected: ${url}`);
      onStatusChange(true);
    });

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        onMessage(parsed);
      } catch (err) {
        log(`Failed to parse WS message: ${err}`);
      }
    });

    ws.on("close", () => {
      onStatusChange(false);
      if (!closedByCaller) {
        log("WebSocket closed, reconnecting in 5s");
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    });

    ws.on("error", (err) => {
      log(`WebSocket error: ${err.message}`);
    });
  }

  connect();

  return {
    close() {
      closedByCaller = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}

module.exports = { connectWebSocket };
