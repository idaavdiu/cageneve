const OWNER = 'idaavdiu';
const REPO = 'cageneve';
const BRANCH = 'master';
const API = 'https://api.github.com';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cageneve-admin'
  };
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function getJsonFile(path) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodePath(path)}?ref=${BRANCH}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`GitHub read failed for ${path} (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: json.sha };
}

async function putJsonFile(path, data, sha, message) {
  const content = JSON.stringify(data, null, 2) + '\n';
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodePath(path)}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
      branch: BRANCH,
      committer: { name: 'cageneve-admin', email: 'cageneve@gmail.com' }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409 || res.status === 422) {
      throw new Error('Jemand anderes hat gerade gespeichert. Bitte Seite neu laden und erneut versuchen.');
    }
    throw new Error(`GitHub write failed for ${path} (${res.status}): ${text}`);
  }
  return res.json();
}

module.exports = { getJsonFile, putJsonFile };
