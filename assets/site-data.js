// Renders the Events and Documents sections from data/events.json and
// data/documents.json, so index.html and cageneve.html always show the
// same content without needing to be edited (and kept in sync) by hand.
(function () {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Repo-relative paths need URL-encoding (spaces, accents); absolute URLs
  // (e.g. Vercel Blob) are already valid and must be left untouched, since
  // re-encoding would turn an existing "%20" into "%2520".
  function hrefFor(path) {
    return /^https?:\/\//.test(path) ? path : encodeURI(path);
  }

  function renderEvents(events) {
    const grid = document.querySelector('.events-grid');
    if (!grid) return;
    const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
    grid.innerHTML = sorted.map(function (e) {
      const dateHtml = e.date_display_sq
        ? '<span class="lang-sq">' + escapeHtml(e.date_display_sq) + '</span><span class="lang-fr">' + escapeHtml(e.date_display_fr) + '</span>'
        : escapeHtml(formatDate(e.date));
      const videoBadge = e.video_url
        ? '<a href="' + escapeHtml(e.video_url) + '" target="_blank" rel="noopener" class="event-video-badge" onclick="event.stopPropagation()" aria-label="Video">▶</a>'
        : '';
      const src = hrefFor(e.image);
      return '<div class="event-card" onclick="showFlyer(\'' + e.image.replace(/'/g, "\\'") + '\')">' +
        '<div class="event-thumb"><img loading="lazy" src="' + src + '" alt="' + escapeHtml(e.title_sq) + '">' +
        videoBadge + '<div class="event-zoom">⤢</div></div>' +
        '<div class="event-meta"><div class="event-date">' + dateHtml + '</div>' +
        '<div class="event-title"><span class="lang-sq">' + escapeHtml(e.title_sq) + '</span><span class="lang-fr">' + escapeHtml(e.title_fr) + '</span></div>' +
        '</div></div>';
    }).join('');
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return d + '.' + m + '.' + y;
  }

  function renderDocuments(years) {
    const grid = document.querySelector('.docs-grid');
    if (!grid) return;
    const sorted = [...years].sort((a, b) => b.year.localeCompare(a.year));
    grid.innerHTML = sorted.map(function (y) {
      const links = y.docs.map(function (d) {
        return '<a class="doc-link" href="' + hrefFor(d.file) + '" target="_blank">' +
          '<span class="lang-sq">' + escapeHtml(d.title_sq) + '</span><span class="lang-fr">' + escapeHtml(d.title_fr) + '</span></a>';
      }).join('');
      return '<div class="doc-card"><div class="doc-year">' + escapeHtml(y.year) + '</div>' +
        '<div class="doc-subtitle"><span class="lang-sq">' + escapeHtml(y.subtitle_sq) + '</span><span class="lang-fr">' + escapeHtml(y.subtitle_fr) + '</span></div>' +
        '<div class="doc-links">' + links + '</div></div>';
    }).join('');
  }

  Promise.all([
    fetch('data/events.json').then(r => r.json()),
    fetch('data/documents.json').then(r => r.json())
  ]).then(function ([events, documents]) {
    renderEvents(events);
    renderDocuments(documents);
  }).catch(function (err) {
    console.error('Failed to load site data', err);
  });
})();
