const { createSessionCookie, timingSafeEqualStr } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  }

  const { password } = req.body || {};
  const ok = password && timingSafeEqualStr(password, process.env.ADMIN_PASSWORD || '');
  if (!ok) {
    await new Promise(r => setTimeout(r, 400)); // slow down naive brute force
    return res.status(401).json({ error: 'Falsches Passwort.' });
  }

  res.setHeader('Set-Cookie', createSessionCookie(process.env.SESSION_SECRET));
  return res.status(200).json({ ok: true });
};
