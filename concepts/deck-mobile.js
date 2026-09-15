(() => {
  const self = document.currentScript && document.currentScript.src;
  const base = self ? new URL('.', self).href : new URL('./', location.href).href;
  const esc = (url) => String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  document.write(
    `<link rel="stylesheet" href="${esc(new URL('concept-standards.css', base).href)}">` +
    `<script src="${esc(new URL('deck-mobile-core.js', base).href)}"><\/script>` +
    `<script src="${esc(new URL('start-once.js', base).href)}"><\/script>` +
    `<script src="${esc(new URL('deck-editor.js', base).href)}"><\/script>` +
    `<script src="${esc(new URL('deck-text-editor.js', base).href)}"><\/script>` +
    `<link rel="stylesheet" href="${esc(new URL('fullscreen-consistency.css', base).href)}">` +
    `<script src="${esc(new URL('fullscreen-sync.js', base).href)}"><\/script>` +
    `<script src="${esc(new URL('slide-position.js', base).href)}"><\/script>`
  );
})();
