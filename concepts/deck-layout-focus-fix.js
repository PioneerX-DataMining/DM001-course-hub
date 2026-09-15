(() => {
  const SELECTOR = '.dm-edit-fragment,.dm-edit-component';

  function init() {
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;

    document.addEventListener('pointerdown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      const target = event.target && event.target.closest ? event.target.closest(SELECTOR) : null;
      if (!target || !stage.contains(target)) return;
      const active = document.activeElement;
      if (!active || active === document.body) return;
      if (active.closest && active.closest('.dm-text-editor-panel')) {
        try { active.blur(); } catch (_) {}
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
