const { requireAuth } = require('./_auth');
const { getJsonFile, putJsonFile, reorderById } = require('./_github');

const FILE = 'data/documents.json';
const DEFAULT_SUBTITLE_SQ = 'Raportet e vitit';
const DEFAULT_SUBTITLE_FR = "Rapports de l'année";

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
      const { data, sha } = await getJsonFile(FILE);

      if (body.action === 'create-year') {
        if (!body.year) return res.status(400).json({ error: 'Jahr fehlt.' });
        if (data.some(y => y.year === body.year)) {
          return res.status(400).json({ error: `Jahr ${body.year} existiert bereits.` });
        }
        const yearBox = {
          year: body.year,
          subtitle_sq: body.subtitle_sq || DEFAULT_SUBTITLE_SQ,
          subtitle_fr: body.subtitle_fr || DEFAULT_SUBTITLE_FR,
          docs: []
        };
        data.push(yearBox);
        await putJsonFile(FILE, data, sha, `Jahr-Box angelegt: ${body.year}`);
        return res.status(200).json(yearBox);
      }

      if (body.action === 'add-doc') {
        if (!body.year || !body.file || !body.title_sq || !body.title_fr) {
          return res.status(400).json({ error: 'Jahr, Datei und beide Titel sind erforderlich.' });
        }
        let yearBox = data.find(y => y.year === body.year);
        if (!yearBox) {
          yearBox = { year: body.year, subtitle_sq: DEFAULT_SUBTITLE_SQ, subtitle_fr: DEFAULT_SUBTITLE_FR, docs: [] };
          data.push(yearBox);
        }
        const doc = {
          id: `doc-${body.year}-${slug(body.title_sq)}-${Date.now().toString(36)}`,
          file: body.file,
          title_sq: body.title_sq,
          title_fr: body.title_fr
        };
        yearBox.docs.push(doc);
        await putJsonFile(FILE, data, sha, `Dokument hinzugefügt (${body.year}): ${doc.title_sq}`);
        return res.status(200).json(doc);
      }

      return res.status(400).json({ error: 'Unbekannte Aktion.' });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (!body.year || !body.id) return res.status(400).json({ error: 'year und id sind erforderlich.' });
      const { data, sha } = await getJsonFile(FILE);
      const yearBox = data.find(y => y.year === body.year);
      if (!yearBox) return res.status(404).json({ error: 'Jahr nicht gefunden.' });
      const doc = yearBox.docs.find(d => d.id === body.id);
      if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });
      for (const key of ['file', 'title_sq', 'title_fr']) {
        if (key in body) doc[key] = body[key];
      }
      await putJsonFile(FILE, data, sha, `Dokument bearbeitet (${body.year}): ${doc.title_sq}`);
      return res.status(200).json(doc);
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      if (!body.year) return res.status(400).json({ error: 'year fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const yearBox = data.find(y => y.year === body.year);
      if (!yearBox) return res.status(404).json({ error: 'Jahr nicht gefunden.' });
      yearBox.docs = reorderById(yearBox.docs, body.ids);
      await putJsonFile(FILE, data, sha, `Dokument-Reihenfolge geändert (${body.year})`);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { year, id, deleteYear } = req.query;
      if (!year) return res.status(400).json({ error: 'year fehlt.' });
      const { data, sha } = await getJsonFile(FILE);
      const yIdx = data.findIndex(y => y.year === year);
      if (yIdx === -1) return res.status(404).json({ error: 'Jahr nicht gefunden.' });

      if (deleteYear === 'true') {
        if (data[yIdx].docs.length > 0) {
          return res.status(400).json({ error: 'Jahr enthält noch Dokumente — zuerst diese löschen.' });
        }
        data.splice(yIdx, 1);
        await putJsonFile(FILE, data, sha, `Jahr-Box gelöscht: ${year}`);
        return res.status(200).json({ ok: true });
      }

      if (!id) return res.status(400).json({ error: 'id fehlt.' });
      const docIdx = data[yIdx].docs.findIndex(d => d.id === id);
      if (docIdx === -1) return res.status(404).json({ error: 'Dokument nicht gefunden.' });
      const [removed] = data[yIdx].docs.splice(docIdx, 1);
      await putJsonFile(FILE, data, sha, `Dokument gelöscht (${year}): ${removed.title_sq}`);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(405).json({ error: 'Methode nicht erlaubt.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
