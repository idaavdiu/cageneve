const { createSessionCookie, timingSafeEqualStr } = require('./_auth');
const { checkPass } = require('./_captcha');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  }

  const { password, captchaPass } = req.body || {};
  if (!checkPass(captchaPass)) {
    return res.status(400).json({ error: 'Bitte zuerst die Sicherheitsfrage lösen.', captcha: true });
  }
  const ok = password && timingSafeEqualStr(password, process.env.ADMIN_PASSWORD || '');
  if (!ok) {
    await new Promise(r => setTimeout(r, 400)); // slow down naive brute force
    return res.status(401).json({ error: 'Falsches Passwort.' });
  }

  res.setHeader('Set-Cookie', createSessionCookie(process.env.SESSION_SECRET));
  return res.status(200).json({ ok: true });
};
