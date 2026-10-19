const crypto = require('crypto');
const { timingSafeEqualStr } = require('./_auth');

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // time to answer the question
const PASS_TTL_MS = 2 * 60 * 1000;        // time to enter the password after solving it

function sign(value) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
}

// Stateless math challenge: the answer is never sent to the browser, only an
// HMAC over (expiry, nonce, answer) that the server can re-check later.
function createChallenge() {
  let a, b, op, answer;
  switch (crypto.randomInt(3)) {
    case 0: a = crypto.randomInt(2, 20); b = crypto.randomInt(2, 20); op = '+'; answer = a + b; break;
    case 1: a = crypto.randomInt(10, 30); b = crypto.randomInt(1, a); op = '−'; answer = a - b; break;
    default: a = crypto.randomInt(2, 10); b = crypto.randomInt(2, 10); op = '×'; answer = a * b;
  }
  const expiry = Date.now() + CHALLENGE_TTL_MS;
  const nonce = crypto.randomBytes(8).toString('hex');
  return {
    question: `${a} ${op} ${b}`,
    challenge: `${expiry}.${nonce}.${sign(`c|${expiry}|${nonce}|${answer}`)}`
  };
}

function checkAnswer(challenge, answer) {
  const [expiry, nonce, sig] = String(challenge || '').split('.');
  if (!expiry || !nonce || !sig || Number(expiry) < Date.now()) return false;
  const n = parseInt(String(answer).trim(), 10);
  if (!Number.isFinite(n)) return false;
  return timingSafeEqualStr(sig, sign(`c|${expiry}|${nonce}|${n}`));
}

// Short-lived proof that a captcha was solved; required by /api/login.
function createPass() {
  const expiry = Date.now() + PASS_TTL_MS;
  return `${expiry}.${sign(`p|${expiry}`)}`;
}

function checkPass(pass) {
  const [expiry, sig] = String(pass || '').split('.');
  if (!expiry || !sig || Number(expiry) < Date.now()) return false;
  return timingSafeEqualStr(sig, sign(`p|${expiry}`));
}

module.exports = { createChallenge, checkAnswer, createPass, checkPass };
