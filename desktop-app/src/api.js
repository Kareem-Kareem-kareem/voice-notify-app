function normalizeBaseUrl(serverUrl) {
  // Accept either the bare server origin (https://host) or a URL that
  // already includes the /api prefix (https://host/api) -- callers below
  // always append /api/... themselves, so strip a trailing /api here to
  // avoid producing a doubled /api/api/... path either way.
  return serverUrl.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

const TIMEOUT_MS = 10_000;

// A bare `fetch` can hang indefinitely on some networks (captive portals,
// firewalls that silently drop packets instead of rejecting the
// connection) with no error ever surfacing -- from the user's point of
// view that looks exactly like "nothing happened" when they click Save.
// Force a bounded wait so a failure always produces a visible error.
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        `Could not reach the server within ${TIMEOUT_MS / 1000}s (${url}). Check your internet connection and that the server address is correct.`,
      );
    }
    throw new Error(`Network error reaching ${url}: ${err.message || String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function registerDesktop(serverUrl, nickname) {
  const res = await fetchWithTimeout(`${normalizeBaseUrl(serverUrl)}/api/desktop/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nickname }),
  });

  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function fetchActiveMessages(serverUrl) {
  const res = await fetchWithTimeout(`${normalizeBaseUrl(serverUrl)}/api/messages/active`);

  if (!res.ok) {
    throw new Error(`Failed to fetch active messages: ${res.status}`);
  }

  return res.json();
}

function wsUrl(serverUrl, clientId) {
  const base = normalizeBaseUrl(serverUrl).replace(/^http/, "ws");
  return `${base}/api/ws?clientId=${clientId}`;
}

module.exports = { registerDesktop, fetchActiveMessages, wsUrl };
