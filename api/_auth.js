const crypto = require('crypto');

const COOKIE_NAME = 'cageneve_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function createSessionCookie(secret) {
  const expiry = Date.now() + SESSION_TTL_MS;
  const value = `${expiry}.${sign(String(expiry), secret)}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(function (part) {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function timingSafeEqualStr(a, b) {
  const aBuf = Buffer.from(String(a == null ? '' : a));
  const bBuf = Buffer.from(String(b == null ? '' : b));
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf); // keep timing roughly constant
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isAuthenticated(req, secret) {
  const raw = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot === -1) return false;
  const expiryStr = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!timingSafeEqualStr(sig, sign(expiryStr, secret))) return false;
  return Number(expiryStr) > Date.now();
}

function requireAuth(req, res) {
  if (!isAuthenticated(req, process.env.SESSION_SECRET)) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return false;
  }
  return true;
}

module.exports = { createSessionCookie, clearSessionCookie, isAuthenticated, requireAuth, timingSafeEqualStr };
