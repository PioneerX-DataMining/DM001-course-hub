(() => {
  const API_BASE = 'https://lab.pioneer-x.cn';
  const DECKS = {
    'data-mining.html': 'dm01',
    'data-object.html': 'dm02',
    'feature-attribute.html': 'dm03',
    'attribute-type.html': 'dm04',
  };
  const SELECTOR = '.dm-edit-fragment,.dm-edit-component';
  const SMALL_STEP = 4;
  const LARGE_STEP = 16;
  const MAX_MOVE = 4000;
  const LAYOUT_MARKER = '__DM_LAYOUT_V1__';

  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value) => Math.max(-MAX_MOVE, Math.min(MAX_MOVE, Math.round(value * 10) / 10));
  const clone = (value) => JSON.parse(JSON.stringify(value || {}));

  function start() {
    const file = location.pathname.split('/').pop();
    const deckId = DECKS[file];
    if (!deckId) return;
    const params = new URLSearchParams(location.search);
    const embedded = params.get('present') === '1';
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;

    // deck-editor-id-compat remaps whole-component IDs on the same DOMContentLoaded turn.
    // Wait one tick so positions always target the final tNNN IDs accepted by AutoLab.
    setTimeout(() => init(deckId, root, stage, embedded), 20);
  }

  async function init(deckId, root, stage, embedded) {
    const state = {
      canEdit: false,
      multi: false,
      selected: new Set(),
      dirty: new Set(),
      panel: null,
      tools: null,
      count: null,
      xValue: null,
      yValue: null,
      multiBtn: null,
      saveBtn: null,
      status: null,
    };

    installStyles();

    let payload;
    try {
      const response = await fetch(`${API_BASE}/api/dm/register?resource=slides&deck_id=${encodeURIComponent(deckId)}`, {
        mode: 'cors', credentials: 'include', cache: 'no-store',
      });
      if (!response.ok) return;
      payload = await response.json();
    } catch (_) {
      return;
    }

    const slideEdits = payload.slide_edits && typeof payload.slide_edits === 'object' ? payload.slide_edits : {};
    applySavedMoves(stage, slideEdits);
    state.canEdit = !!payload.can_edit;
    if (!state.canEdit || embedded) return;

    ensureTools();

    document.addEventListener('click', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (event.target.closest && event.target.closest('.dm-text-editor-panel')) return;
      const element = event.target.closest && event.target.closest(SELECTOR);
      if (!element || !stage.contains(element) || !element.closest('.slide.active')) return;
      if (!(state.multi || event.ctrlKey || event.metaKey || event.shiftKey)) {
        if (state.selected.size) clearMultiSelection();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleMultiSelection(element);
    }, true);

    // Move selected elements before the deck's own arrow-key navigation sees the key.
    window.addEventListener('keydown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      const list = movementTargets();
      if (!list.length) return;
      const step = event.shiftKey ? LARGE_STEP : SMALL_STEP;
      let dx = 0, dy = 0;
      if (event.key === 'ArrowLeft') dx = -step;
      else if (event.key === 'ArrowRight') dx = step;
      else if (event.key === 'ArrowUp') dy = -step;
      else if (event.key === 'ArrowDown') dy = step;
      else return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      move(list, dx, dy);
    }, true);

    // The original text editor owns its own draft object. If it saves later in the same
    // session, re-save layout metadata afterwards so that new positions are never lost.
    document.addEventListener('click', (event) => {
      const save = event.target.closest && event.target.closest('[data-editor-save]');
      if (!save || !hasAnyMovedElement(stage)) return;
      waitForTextSaveThenSync();
    }, true);

    // "还原本页" should also restore element positions to their authored locations.
    document.addEventListener('click', (event) => {
      const reset = event.target.closest && event.target.closest('[data-editor-reset-slide]');
      if (!reset || !root.classList.contains('dm-edit-mode')) return;
      setTimeout(() => {
        const slide = activeSlide();
        if (!slide) return;
        const moved = Array.from(slide.querySelectorAll('[data-dm-edit-id]')).filter((el) => num(el.dataset.dmMoveX) || num(el.dataset.dmMoveY));
        moved.forEach((el) => setPosition(el, 0, 0));
        if (moved.length) {
          state.dirty.add(slide.dataset.slideId);
          syncUi();
        }
      }, 0);
    }, true);

    const modeObserver = new MutationObserver(() => {
      if (!root.classList.contains('dm-edit-mode')) {
        clearMultiSelection();
        state.multi = false;
        syncUi();
      }
    });
    modeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });

    function ensureTools() {
      const insert = () => {
        const panel = document.querySelector('.dm-text-editor-panel');
        if (!panel || panel.querySelector('.dm-layout-tools')) return false;
        state.panel = panel;
        const tools = document.createElement('section');
        tools.className = 'dm-layout-tools';
        tools.innerHTML = `
          <div class="dm-layout-head"><strong>布局 / 位置</strong><span class="dm-layout-count">未选择</span></div>
          <div class="dm-layout-select-row">
            <button type="button" class="dm-layout-multi">多选模式</button>
            <button type="button" class="dm-layout-clear">清除多选</button>
          </div>
          <div class="dm-layout-help">Ctrl / ⌘ 点击可追加选择；也可开启多选模式连续点击。方向键移动 4 px，Shift + 方向键移动 16 px。</div>
          <div class="dm-layout-move-grid" aria-label="移动选中元素">
            <span></span><button type="button" data-move="0,-4">↑</button><span></span>
            <button type="button" data-move="-4,0">←</button><button type="button" class="dm-layout-center" data-reset-position>归零</button><button type="button" data-move="4,0">→</button>
            <span></span><button type="button" data-move="0,4">↓</button><span></span>
          </div>
          <div class="dm-layout-coords"><span>X <b data-x>0</b> px</span><span>Y <b data-y>0</b> px</span></div>
          <button type="button" class="dm-layout-save" disabled>保存位置</button>
          <div class="dm-layout-status"></div>
        `;
        const danger = panel.querySelector('.dm-editor-page-danger');
        if (danger) panel.insertBefore(tools, danger);
        else panel.appendChild(tools);
        state.tools = tools;
        state.count = tools.querySelector('.dm-layout-count');
        state.xValue = tools.querySelector('[data-x]');
        state.yValue = tools.querySelector('[data-y]');
        state.multiBtn = tools.querySelector('.dm-layout-multi');
        state.saveBtn = tools.querySelector('.dm-layout-save');
        state.status = tools.querySelector('.dm-layout-status');

        state.multiBtn.addEventListener('click', () => {
          state.multi = !state.multi;
          if (!state.multi) clearMultiSelection();
          syncUi();
        });
        tools.querySelector('.dm-layout-clear').addEventListener('click', clearMultiSelection);
        tools.querySelectorAll('[data-move]').forEach((button) => {
          button.addEventListener('click', (event) => {
            const list = movementTargets();
            if (!list.length) return;
            const [baseX, baseY] = button.dataset.move.split(',').map(Number);
            const scale = event.shiftKey ? LARGE_STEP / SMALL_STEP : 1;
            move(list, baseX * scale, baseY * scale);
          });
        });
        tools.querySelector('[data-reset-position]').addEventListener('click', () => {
          const list = movementTargets();
          if (!list.length) return;
          list.forEach((element) => setPosition(element, 0, 0));
          markDirty(list);
        });
        state.saveBtn.addEventListener('click', () => saveLayout(false));
        syncUi();
        return true;
      };
      if (insert()) return;
      const observer = new MutationObserver(() => {
        if (insert()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(insert, 300);
      setTimeout(insert, 1000);
    }

    function activeSlide() {
      return stage.querySelector('.slide.active');
    }

    function movementTargets() {
      let list = [];
      if (state.selected.size) {
        list = Array.from(state.selected).filter((el) => document.contains(el) && el.closest('.slide.active'));
      } else {
        const single = stage.querySelector('.slide.active .dm-edit-selected');
        if (single) list = [single];
      }
      return list.filter((element) => !list.some((other) => other !== element && other.contains(element)));
    }

    function toggleMultiSelection(element) {
      if (state.selected.has(element)) {
        state.selected.delete(element);
        element.classList.remove('dm-layout-selected');
      } else {
        state.selected.add(element);
        element.classList.add('dm-layout-selected');
      }
      syncUi();
    }

    function clearMultiSelection() {
      state.selected.forEach((element) => element.classList.remove('dm-layout-selected'));
      state.selected.clear();
      syncUi();
    }

    function move(elements, dx, dy) {
      elements.forEach((element) => {
        setPosition(element, num(element.dataset.dmMoveX) + dx, num(element.dataset.dmMoveY) + dy);
      });
      markDirty(elements);
    }

    function setPosition(element, x, y) {
      x = clamp(x); y = clamp(y);
      element.dataset.dmMoveX = String(x);
      element.dataset.dmMoveY = String(y);
      if (x || y) element.style.setProperty('translate', `${x}px ${y}px`);
      else element.style.removeProperty('translate');
    }

    function markDirty(elements) {
      elements.forEach((element) => {
        const slide = element.closest('.slide');
        if (slide && slide.dataset.slideId) state.dirty.add(slide.dataset.slideId);
      });
      syncUi();
    }

    function syncUi() {
      if (!state.tools) return;
      const targets = movementTargets();
      const slide = activeSlide();
      const slideId = slide && slide.dataset.slideId;
      state.multiBtn.classList.toggle('active', state.multi);
      state.multiBtn.textContent = state.multi ? '多选模式：开' : '多选模式';
      if (!targets.length) {
        state.count.textContent = '未选择';
        state.xValue.textContent = '0';
        state.yValue.textContent = '0';
      } else if (targets.length === 1) {
        state.count.textContent = '已选 1 个';
        state.xValue.textContent = String(num(targets[0].dataset.dmMoveX));
        state.yValue.textContent = String(num(targets[0].dataset.dmMoveY));
      } else {
        state.count.textContent = `已选 ${targets.length} 个`;
        state.xValue.textContent = '—';
        state.yValue.textContent = '—';
      }
      const dirty = !!slideId && state.dirty.has(slideId);
      state.saveBtn.disabled = !dirty;
      if (dirty && !state.status.classList.contains('saving')) setLayoutStatus('位置有未保存修改', 'dirty');
      else if (!dirty && !state.status.classList.contains('saved')) setLayoutStatus('', '');
    }

    function setLayoutStatus(text, kind) {
      if (!state.status) return;
      state.status.textContent = text;
      state.status.className = `dm-layout-status${kind ? ` ${kind}` : ''}`;
    }

    function collectLayout(slide) {
      const positions = {};
      slide.querySelectorAll('[data-dm-edit-id]').forEach((element) => {
        const id = element.dataset.dmEditId;
        const x = clamp(num(element.dataset.dmMoveX));
        const y = clamp(num(element.dataset.dmMoveY));
        if (id && (x || y)) positions[id] = [x, y];
      });
      return positions;
    }

    async function saveLayout(silent) {
      const slide = activeSlide();
      if (!slide || !slide.dataset.slideId) return;
      const slideId = slide.dataset.slideId;
      if (!silent) {
        state.saveBtn.disabled = true;
        setLayoutStatus('正在保存位置…', 'saving');
      }

      try {
        const currentResponse = await fetch(`${API_BASE}/api/dm/register?resource=slides&deck_id=${encodeURIComponent(deckId)}`, {
          mode: 'cors', credentials: 'include', cache: 'no-store',
        });
        if (!currentResponse.ok) throw new Error(`读取失败（${currentResponse.status}）`);
        const current = await currentResponse.json();
        const merged = clone((current.slide_edits && current.slide_edits[slideId]) || {});
        const metaId = `${slideId}-t999`;
        const positions = collectLayout(slide);
        if (Object.keys(positions).length) merged[metaId] = { text: LAYOUT_MARKER + JSON.stringify(positions) };
        else delete merged[metaId];

        const body = new URLSearchParams({
          deck_id: deckId,
          slide_id: slideId,
          edits_json: JSON.stringify(merged),
        });
        const response = await fetch(`${API_BASE}/api/dm/slides/state`, {
          method: 'POST', mode: 'cors', credentials: 'include', cache: 'no-store', body,
        });
        let saved = {};
        try { saved = await response.json(); } catch (_) {}
        if (!response.ok) throw new Error(saved.detail || `保存失败（${response.status}）`);
        state.dirty.delete(slideId);
        if (!silent) setLayoutStatus('位置已保存', 'saved');
        syncUi();
      } catch (error) {
        state.dirty.add(slideId);
        if (!silent) setLayoutStatus(error.message || '位置保存失败', 'error');
        syncUi();
      }
    }

    function waitForTextSaveThenSync() {
      const status = document.querySelector('.dm-editor-status');
      const started = Date.now();
      const tick = () => {
        if (status && status.classList.contains('error')) return;
        if (status && status.classList.contains('saved')) {
          saveLayout(true);
          return;
        }
        if (Date.now() - started < 5000) setTimeout(tick, 120);
      };
      setTimeout(tick, 120);
    }
  }

  function applySavedMoves(stage, slideEdits) {
    Object.entries(slideEdits || {}).forEach(([slideId, edits]) => {
      if (!edits || typeof edits !== 'object') return;
      const meta = edits[`${slideId}-t999`];
      if (meta && typeof meta.text === 'string' && meta.text.startsWith(LAYOUT_MARKER)) {
        try {
          const positions = JSON.parse(meta.text.slice(LAYOUT_MARKER.length));
          Object.entries(positions || {}).forEach(([editId, coords]) => {
            if (!Array.isArray(coords) || coords.length < 2) return;
            applyPosition(stage, editId, coords[0], coords[1]);
          });
        } catch (_) {}
      }
      // Forward-compatible fallback if AutoLab later stores native move fields.
      Object.entries(edits).forEach(([editId, edit]) => {
        if (!edit || typeof edit !== 'object' || (!('move_x' in edit) && !('move_y' in edit))) return;
        applyPosition(stage, editId, edit.move_x, edit.move_y);
      });
    });
  }

  function applyPosition(stage, editId, rawX, rawY) {
    const x = clamp(num(rawX));
    const y = clamp(num(rawY));
    const element = stage.querySelector(`[data-dm-edit-id="${CSS.escape(editId)}"]`);
    if (!element) return;
    element.dataset.dmMoveX = String(x);
    element.dataset.dmMoveY = String(y);
    if (x || y) element.style.setProperty('translate', `${x}px ${y}px`);
  }

  function hasAnyMovedElement(stage) {
    return Array.from(stage.querySelectorAll('[data-dm-edit-id]')).some((element) => num(element.dataset.dmMoveX) || num(element.dataset.dmMoveY));
  }

  function installStyles() {
    if (document.getElementById('dm-layout-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'dm-layout-editor-style';
    style.textContent = `
      .dm-layout-selected{outline:3px solid #7c3aed!important;outline-offset:4px!important;box-shadow:0 0 0 5px rgba(124,58,237,.12)!important}
      .dm-layout-tools{margin-top:15px;padding-top:14px;border-top:1px solid #e6ebf2}
      .dm-layout-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
      .dm-layout-head strong{font-size:14px}.dm-layout-count{font-size:11px;font-weight:850;color:#64748b;background:#f1f5f9;border-radius:999px;padding:4px 8px}
      .dm-layout-select-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.dm-layout-select-row button,.dm-layout-move-grid button,.dm-layout-save{border:1px solid #cfd9e8;background:#fff;border-radius:9px;padding:8px 9px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}
      .dm-layout-multi.active{background:#ede9fe!important;border-color:#a78bfa!important;color:#6d28d9!important}
      .dm-layout-help{font-size:11px;line-height:1.45;color:#64748b;margin:8px 0 10px}
      .dm-layout-move-grid{width:142px;margin:0 auto;display:grid;grid-template-columns:42px 50px 42px;grid-template-rows:34px 40px 34px;gap:4px;align-items:stretch}.dm-layout-move-grid button{padding:0;font-size:16px}.dm-layout-move-grid .dm-layout-center{font-size:11px;color:#475569;background:#f8fafc}
      .dm-layout-coords{display:flex;justify-content:center;gap:18px;margin:8px 0;font-size:11px;color:#64748b}.dm-layout-coords b{color:#172033;font-variant-numeric:tabular-nums}
      .dm-layout-save{width:100%;background:#0f766e;color:#fff;border-color:#0f766e}.dm-layout-save:disabled{opacity:.42;cursor:default}
      .dm-layout-status{min-height:18px;margin-top:7px;font-size:11px;font-weight:800;color:#64748b}.dm-layout-status.dirty{color:#9a5c00}.dm-layout-status.saving{color:#0f5e76}.dm-layout-status.saved{color:#0f7a50}.dm-layout-status.error{color:#b42318}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
