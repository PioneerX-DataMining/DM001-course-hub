(() => {
  const VERSION = '20260915-1905';
  const self = document.currentScript && document.currentScript.src;
  const base = self ? new URL('.', self).href : new URL('./', location.href).href;
  const esc = (url) => String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const asset = (name) => {
    const url = new URL(name, base);
    url.searchParams.set('v', VERSION);
    return url.href;
  };
  document.write(
    `<link rel="stylesheet" href="${esc(asset('concept-standards.css'))}">` +
    `<script src="${esc(asset('concept-version-router.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-mobile-core.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-editor.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-text-editor.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-editor-id-compat.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-layout-editor.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-edit-capability-guard.js'))}"><\/script>` +
    `<script src="${esc(asset('deck-editor-ui.js'))}"><\/script>` +
    `<link rel="stylesheet" href="${esc(asset('fullscreen-consistency.css'))}">` +
    `<link rel="stylesheet" href="${esc(asset('data-mining-definition-refine.css'))}">` +
    `<script src="${esc(asset('fullscreen-sync.js'))}"><\/script>`
  );
})();
