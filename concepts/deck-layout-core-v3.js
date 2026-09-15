(() => {
  const SELECTOR = '.dm-edit-fragment,.dm-edit-component';
  const SMALL_STEP = 4;
  const LARGE_STEP = 16;
  const MAX_MOVE = 4000;
  let primary = null;

  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value) => Math.max(-MAX_MOVE, Math.min(MAX_MOVE, Math.round(Number(value) * 10) / 10));

  function renderPosition(element) {
    if (!element) return;
    const x = clamp(num(element.dataset.dmMoveX));
    const y = clamp(num(element.dataset.dmMoveY));

    if (element.classList.contains('dm-edit-fragment')) {
      // Editable text fragments are inline spans. CSS translate/transform is not
      // dependable for ordinary inline text, so move them with relative offsets.
      if (x || y) {
        element.style.setProperty('position', 'relative');
        element.style.setProperty('left', `${x}px`);
        element.style.setProperty('top', `${y}px`);
      } else {
        element.style.removeProperty('left');
        element.style.removeProperty('top');
        element.style.removeProperty('position');
      }
      element.style.removeProperty('translate');
    } else {
      // Buttons/cards are block-like components; individual translate preserves
      // the authored layout flow and does not consume surrounding space.
      if (x || y) element.style.setProperty('translate', `${x}px ${y}px`);
      else element.style.removeProperty('translate');
    }
  }

  function currentTargets(stage) {
    const slide = stage.querySelector('.slide.active');
    if (!slide) return [];

    let list = Array.from(slide.querySelectorAll('.dm-layout-selected'));
    if (!list.length && primary && slide.contains(primary)) list = [primary];
    if (!list.length) {
      const visible = slide.querySelector('.dm-edit-selected');
      if (visible) list = [visible];
    }
    return list.filter((element) => !list.some((other) => other !== element && other.contains(element)));
  }

  function updateUi(targets) {
    const count = document.querySelector('.dm-layout-count');
    const xLabel = document.querySelector('.dm-layout-coords [data-x]');
    const yLabel = document.querySelector('.dm-layout-coords [data-y]');
    const save = document.querySelector('.dm-layout-save');
    const status = document.querySelector('.dm-layout-status');

    if (count) count.textContent = `已选 ${targets.length} 个`;
    if (targets.length === 1) {
      if (xLabel) xLabel.textContent = String(num(targets[0].dataset.dmMoveX));
      if (yLabel) yLabel.textContent = String(num(targets[0].dataset.dmMoveY));
    } else {
      if (xLabel) xLabel.textContent = '—';
      if (yLabel) yLabel.textContent = '—';
    }
    if (save) save.disabled = false;
    if (status) {
      status.textContent = '位置有未保存修改';
      status.className = 'dm-layout-status dirty';
    }
  }

  function move(targets, dx, dy) {
    targets.forEach((element) => {
      element.dataset.dmMoveX = String(clamp(num(element.dataset.dmMoveX) + dx));
      element.dataset.dmMoveY = String(clamp(num(element.dataset.dmMoveY) + dy));
      renderPosition(element);
    });
    updateUi(targets);
  }

  function init() {
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;

    // Track the actual page element the user last touched. This is independent from
    // the text editor's private selection state and therefore cannot get out of sync.
    document.addEventListener('pointerdown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (event.target.closest && event.target.closest('.dm-text-editor-panel')) return;
      const element = event.target.closest && event.target.closest(SELECTOR);
      if (!element || !stage.contains(element) || !element.closest('.slide.active')) return;
      primary = element;
      const active = document.activeElement;
      if (active && active.closest && active.closest('.dm-text-editor-panel')) {
        try { active.blur(); } catch (_) {}
      }
    }, true);

    // Apply the correct renderer whenever an older module or saved-state loader changes
    // the X/Y data attributes. This also fixes the arrow buttons in the side panel.
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'data-dm-move-x' || mutation.attributeName === 'data-dm-move-y')) {
          renderPosition(mutation.target);
        }
      });
      if (!root.classList.contains('dm-edit-mode')) primary = null;
      else if (primary && (!document.contains(primary) || !primary.closest('.slide.active'))) primary = null;
    });
    observer.observe(stage, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-dm-move-x', 'data-dm-move-y', 'class'],
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    // Register before the legacy layout editor. Once we handle an arrow key, stop it
    // here so slide navigation and older movement listeners cannot run a second time.
    window.addEventListener('keydown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

      const target = event.target;
      if (target && target.closest && target.closest('.dm-text-editor-panel') &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

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
      move(targets, dx, dy);
    }, true);

    // Normalize any already-restored positions after all deck scripts finish loading.
    setTimeout(() => {
      stage.querySelectorAll('[data-dm-move-x],[data-dm-move-y]').forEach(renderPosition);
    }, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
