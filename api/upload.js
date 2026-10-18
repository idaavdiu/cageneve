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
      token: process.env.BLOBREADWRITETOKEN,
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
    return res.status(400).json({ error: err.message });
  }
};
