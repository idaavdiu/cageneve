const { requireAuth } = require('./_auth');
const { getJsonFile, putJsonFile } = require('./_github');

const FILE = 'data/events.json';

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
      if (!body.image || !body.title_sq || !body.title_fr || !body.date) {
        return res.status(400).json({ error: 'Bild, Datum und beide Titel sind erforderlich.' });
      }
      const { data, sha } = await getJsonFile(FILE);
      const entry = {
        id: `evt-${body.date}-${slug(body.title_sq)}-${Date.now().toString(36)}`,
        date: body.date,
        date_display_sq: body.date_display_sq || null,
        date_display_fr: body.date_display_fr || null,
        image: body.image,
        title_sq: body.title_sq,
        title_fr: body.title_fr,
        video_url: body.video_url || null
      };
      data.push(entry);
      await putJsonFile(FILE, data, sha, `Flyer hinzugefügt: ${entry.title_sq}`);
      return res.status(200).json(entry);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ error: 'id fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const idx = data.findIndex(e => e.id === body.id);
      if (idx === -1) return res.status(404).json({ error: 'Flyer nicht gefunden.' });
      const updated = { ...data[idx] };
      for (const key of ['date', 'date_display_sq', 'date_display_fr', 'image', 'title_sq', 'title_fr', 'video_url']) {
        if (key in body) updated[key] = body[key];
      }
      data[idx] = updated;
      await putJsonFile(FILE, data, sha, `Flyer bearbeitet: ${updated.title_sq}`);
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const idx = data.findIndex(e => e.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Flyer nicht gefunden.' });
      const [removed] = data.splice(idx, 1);
      await putJsonFile(FILE, data, sha, `Flyer gelöscht: ${removed.title_sq}`);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
