const { requireAuth } = require('./_auth');
const { getJsonFile, putJsonFile, reorderById } = require('./_github');

const FILE = 'data/board.json';
const FIELDS = ['name', 'role_sq', 'role_fr', 'photo', 'photo_position', 'bio_sq', 'bio_fr'];

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
      if (!body.name || !body.role_sq || !body.role_fr) {
        return res.status(400).json({ error: 'Name und beide Rollen sind erforderlich.' });
      }
      const { data, sha } = await getJsonFile(FILE);
      const member = {
        id: `mbr-${slug(body.name)}-${Date.now().toString(36)}`,
        name: body.name,
        role_sq: body.role_sq,
        role_fr: body.role_fr,
        photo: body.photo || null,
        photo_position: null,
        bio_sq: body.bio_sq || '',
        bio_fr: body.bio_fr || ''
      };
      data.push(member);
      await putJsonFile(FILE, data, sha, `Kryesia: ${member.name} hinzugefügt`);
      return res.status(200).json(member);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ error: 'id fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const idx = data.findIndex(m => m.id === body.id);
      if (idx === -1) return res.status(404).json({ error: 'Person nicht gefunden.' });
      const updated = { ...data[idx] };
      for (const key of FIELDS) {
        if (key in body) updated[key] = body[key];
      }
      if (!updated.name || !updated.role_sq || !updated.role_fr) {
        return res.status(400).json({ error: 'Name und beide Rollen sind erforderlich.' });
      }
      data[idx] = updated;
      await putJsonFile(FILE, data, sha, `Kryesia: ${updated.name} bearbeitet`);
      return res.status(200).json(updated);
    }

    if (req.method === 'PATCH') {
      const { data, sha } = await getJsonFile(FILE);
      const reordered = reorderById(data, (req.body || {}).ids);
      await putJsonFile(FILE, reordered, sha, 'Kryesia-Reihenfolge geändert');
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const idx = data.findIndex(m => m.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Person nicht gefunden.' });
      const [removed] = data.splice(idx, 1);
      await putJsonFile(FILE, data, sha, `Kryesia: ${removed.name} entfernt`);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
