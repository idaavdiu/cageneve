const { handleUpload } = require('@vercel/blob/client');
const { isAuthenticated } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req, process.env.SESSION_SECRET)) {
    return res.status(401).json({ error: 'Nicht angemeldet.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOBREADWRITETOKEN,
      onBeforeGenerateToken: async function () {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'],
          addRandomSuffix: true,
          maximumSizeInBytes: 50 * 1024 * 1024
        };
      },
      onUploadCompleted: async function () {
        // no-op: the admin page writes the resulting URL into events.json/documents.json itself
      }
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('upload error:', err);
    // TEMP diagnostics: describe the token's shape without revealing the secret
    const describe = function (v) {
      if (v == null) return 'nicht gesetzt';
      return 'Länge ' + v.length + ', beginnt mit ' + JSON.stringify(v.slice(0, 19)) +
        ', Unterstriche ' + (v.split('_').length - 1) + (/\s/.test(v) ? ', ENTHÄLT LEERZEICHEN' : '');
    };
    return res.status(400).json({
      error: err.message,
      BLOB_READ_WRITE_TOKEN: describe(process.env.BLOB_READ_WRITE_TOKEN),
      BLOBREADWRITETOKEN: describe(process.env.BLOBREADWRITETOKEN)
    });
  }
};
