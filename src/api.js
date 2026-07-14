function normalizeBaseUrl(serverUrl) {
  // Accept either the bare server origin (https://host) or a URL that
  // already includes the /api prefix (https://host/api) -- callers below
  // always append /api/... themselves, so strip a trailing /api here to
  // avoid producing a doubled /api/api/... path either way.
  return serverUrl.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

async function registerDesktop(serverUrl, nickname) {
  const res = await fetch(`${normalizeBaseUrl(serverUrl)}/api/desktop/register`, {
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
  const res = await fetch(`${normalizeBaseUrl(serverUrl)}/api/messages/active`);

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
