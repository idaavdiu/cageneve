const { requireAuth } = require('./_auth');
const { getJsonFile, putJsonFile, reorderById } = require('./_github');

const FILE = 'data/sponsors.json';
const FIELDS = ['name', 'logo', 'url'];

function slug(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { data } = await getJsonFile(FILE);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.name || !body.logo) {
        return res.status(400).json({ error: 'Name und Logo sind erforderlich.' });
      }
      const { data, sha } = await getJsonFile(FILE);
      const sponsor = {
        id: `spn-${slug(body.name)}-${Date.now().toString(36)}`,
        name: body.name,
        logo: body.logo,
        url: body.url || null
      };
      data.push(sponsor);
      await putJsonFile(FILE, data, sha, `Sponsor hinzugefügt: ${sponsor.name}`);
      return res.status(200).json(sponsor);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ error: 'id fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const idx = data.findIndex(s => s.id === body.id);
      if (idx === -1) return res.status(404).json({ error: 'Sponsor nicht gefunden.' });
      const updated = { ...data[idx] };
      for (const key of FIELDS) {
        if (key in body) updated[key] = body[key];
      }
      if (!updated.name || !updated.logo) {
        return res.status(400).json({ error: 'Name und Logo sind erforderlich.' });
      }
      updated.url = updated.url || null;
      data[idx] = updated;
      await putJsonFile(FILE, data, sha, `Sponsor bearbeitet: ${updated.name}`);
      return res.status(200).json(updated);
    }

    if (req.method === 'PATCH') {
      const { data, sha } = await getJsonFile(FILE);
      const reordered = reorderById(data, (req.body || {}).ids);
      await putJsonFile(FILE, reordered, sha, 'Sponsoren-Reihenfolge geändert');
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const idx = data.findIndex(s => s.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Sponsor nicht gefunden.' });
      const [removed] = data.splice(idx, 1);
      await putJsonFile(FILE, data, sha, `Sponsor entfernt: ${removed.name}`);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
