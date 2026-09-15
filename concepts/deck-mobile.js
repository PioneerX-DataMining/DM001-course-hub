(() => {
  const self = document.currentScript && document.currentScript.src;
  const base = self ? new URL('.', self).href : new URL('./', location.href).href;
  const esc = (url) => String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  document.write(
    `<script src="${esc(new URL('deck-mobile-core.js', base).href)}"><\/script>` +
    `<script src="${esc(new URL('deck-editor.js', base).href)}"><\/script>`
  );
})();
