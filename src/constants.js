// The Voice Alert API server this receiver talks to. Update this to the
// deployed backend's public URL before building the installer for real
// desktops -- until the backend is published, this points at the live dev
// URL, which only works while the Replit workspace is open.
//
// Accepts either the bare origin (https://host) or a URL that already
// includes the /api prefix (https://host/api) -- desktop-app/src/api.js
// normalizes either form.
const DEFAULT_SERVER_URL = "https://aa860004-1087-4dca-b6c0-341325e52228-00-2mn3bair3xj3x.sisko.replit.dev/api";

module.exports = { DEFAULT_SERVER_URL };
