const { createChallenge, checkAnswer, createPass } = require('./_captcha');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json(createChallenge());
  }

  if (req.method === 'POST') {
    const { challenge, answer } = req.body || {};
    if (!checkAnswer(challenge, answer)) {
      await new Promise(r => setTimeout(r, 400)); // slow down naive guessing
      return res.status(400).json({ error: 'Falsche Antwort. Bitte neue Aufgabe lösen.' });
    }
    return res.status(200).json({ pass: createPass() });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Methode nicht erlaubt.' });
};
