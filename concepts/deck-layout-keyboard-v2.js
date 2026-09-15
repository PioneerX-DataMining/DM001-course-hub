(() => {
  const SELECTOR = '.dm-edit-fragment,.dm-edit-component';
  const SMALL_STEP = 4;
  const LARGE_STEP = 16;
  const MAX_MOVE = 4000;
  let primary = null;

  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value) => Math.max(-MAX_MOVE, Math.min(MAX_MOVE, Math.round(Number(value) * 10) / 10));

  function init() {
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;

    // Keep our own authoritative "last page element clicked" pointer. The text editor
    // and layout editor have separate private selection state, so a visible blue outline
    // did not previously guarantee that the keyboard mover knew what to move.
    document.addEventListener('pointerdown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (event.target.closest && event.target.closest('.dm-text-editor-panel')) return;
      const element = event.target.closest && event.target.closest(SELECTOR);
      if (!element || !stage.contains(element) || !element.closest('.slide.active')) return;
      primary = element;

      // Clicking back on the slide means the next arrow key is a layout command, not an
      // input-field cursor command. The browser may focus buttons after pointerdown, which
      // is harmless; only form controls inside the editor panel retain text-edit semantics.
      const active = document.activeElement;
      if (active && active.closest && active.closest('.dm-text-editor-panel')) {
        try { active.blur(); } catch (_) {}
      }
    }, true);

    // Clear stale primary selection when the slide changes or edit mode closes.
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('dm-edit-mode')) primary = null;
      else if (primary && (!document.contains(primary) || !primary.closest('.slide.active'))) primary = null;
    });
    observer.observe(stage, { subtree: true, attributes: true, attributeFilter: ['class'] });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    // Capture before the deck's own arrow-key slide navigation.
    window.addEventListener('keydown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

      // If the user explicitly clicked back into a text/number field in the side panel,
      // keep normal input behaviour. A prior click on the slide has already blurred it.
      const eventTarget = event.target;
      if (eventTarget && eventTarget.closest && eventTarget.closest('.dm-text-editor-panel') &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(eventTarget.tagName)) return;

      const targets = currentTargets(stage);
      if (!targets.length) return;

      const step = event.shiftKey ? LARGE_STEP : SMALL_STEP;
      let dx = 0, dy = 0;
      if (event.key === 'ArrowLeft') dx = -step;
      else if (event.key === 'ArrowRight') dx = step;
      else if (event.key === 'ArrowUp') dy = -step;
      else if (event.key === 'ArrowDown') dy = step;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      targets.forEach((element) => {
        const x = clamp(num(element.dataset.dmMoveX) + dx);
        const y = clamp(num(element.dataset.dmMoveY) + dy);
        element.dataset.dmMoveX = String(x);
        element.dataset.dmMoveY = String(y);
        // Individual translate is intentionally used so authored transform/scale rules
        // continue to work. Current Chromium/Edge supports this property directly.
        if (x || y) element.style.setProperty('translate', `${x}px ${y}px`);
        else element.style.removeProperty('translate');
      });

      markLayoutDirty(targets);
      updatePanel(targets);
    }, true);

    function currentTargets(stageEl) {
      const activeSlide = stageEl.querySelector('.slide.active');
      if (!activeSlide) return [];

      // Multi-select is represented visually by dm-layout-selected. Read it directly
      // instead of depending on another module's private Set.
      let list = Array.from(activeSlide.querySelectorAll('.dm-layout-selected'));
      if (!list.length && primary && activeSlide.contains(primary)) list = [primary];
      if (!list.length) {
        const visibleSelected = activeSlide.querySelector('.dm-edit-selected');
        if (visibleSelected) list = [visibleSelected];
      }

      // If both a whole component and a child text fragment are selected, move only the
      // outer component so the child is not translated twice.
      return list.filter((element) => !list.some((other) => other !== element && other.contains(element)));
    }

    function markLayoutDirty(targets) {
      const slide = targets[0] && targets[0].closest('.slide');
      if (!slide) return;
      slide.dataset.dmKeyboardMoveDirty = '1';
      const save = document.querySelector('.dm-layout-save');
      if (save) save.disabled = false;
      const status = document.querySelector('.dm-layout-status');
      if (status) {
        status.textContent = '位置有未保存修改';
        status.className = 'dm-layout-status dirty';
      }
    }

    function updatePanel(targets) {
      const count = document.querySelector('.dm-layout-count');
      const x = document.querySelector('.dm-layout-coords [data-x]');
      const y = document.querySelector('.dm-layout-coords [data-y]');
      if (count) count.textContent = `已选 ${targets.length} 个`;
      if (targets.length === 1) {
        if (x) x.textContent = String(num(targets[0].dataset.dmMoveX));
        if (y) y.textContent = String(num(targets[0].dataset.dmMoveY));
      } else {
        if (x) x.textContent = '—';
        if (y) y.textContent = '—';
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
