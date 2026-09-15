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
  const MAX_MOVE = 1200;
  const META_SUFFIX = 't999';
  const MARKER_V2 = '__DM_LAYOUT_V2__';
  const MARKER_V1 = '__DM_LAYOUT_V1__';

  const clone = (value) => JSON.parse(JSON.stringify(value || {}));
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value) => Math.max(-MAX_MOVE, Math.min(MAX_MOVE, Math.round(num(value) * 10) / 10));

  function start() {
    const file = location.pathname.split('/').pop();
    const deckId = DECKS[file];
    if (!deckId) return;
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;
    const embedded = new URLSearchParams(location.search).get('present') === '1';

    // Component IDs are remapped by deck-editor-id-compat.js on the next task.
    setTimeout(() => init(deckId, root, stage, embedded), 35);
  }

  async function init(deckId, root, stage, embedded) {
    const state = {
      canEdit: false,
      mode: 'flow',
      multi: false,
      primary: null,
      selected: new Set(),
      dirty: new Set(),
      layouts: {},
      panel: null,
      tools: null,
      modeFlow: null,
      modeFree: null,
      multiBtn: null,
      count: null,
      xValue: null,
      yValue: null,
      help: null,
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

    state.canEdit = !!payload.can_edit;
    const slideEdits = payload.slide_edits && typeof payload.slide_edits === 'object' ? payload.slide_edits : {};
    loadLayouts(slideEdits);
    applyAllLayouts();

    if (!state.canEdit || embedded) return;
    ensureTools();

    document.addEventListener('pointerdown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (event.target.closest && event.target.closest('.dm-text-editor-panel')) return;
      const element = event.target.closest && event.target.closest(SELECTOR);
      if (!element || !stage.contains(element) || !element.closest('.slide.active')) return;
      state.primary = element;
      const active = document.activeElement;
      if (active && active.closest && active.closest('.dm-text-editor-panel')) {
        try { active.blur(); } catch (_) {}
      }
      setTimeout(syncUi, 0);
    }, true);

    document.addEventListener('click', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (event.target.closest && event.target.closest('.dm-text-editor-panel')) return;
      const element = event.target.closest && event.target.closest(SELECTOR);
      if (!element || !stage.contains(element) || !element.closest('.slide.active')) return;

      if (state.multi || event.ctrlKey || event.metaKey || event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggleMulti(element);
      } else if (state.selected.size) {
        clearMulti();
      }
    }, true);

    window.addEventListener('keydown', (event) => {
      if (!root.classList.contains('dm-edit-mode')) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const target = event.target;
      if (target && target.closest && target.closest('.dm-text-editor-panel') &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const targets = movementTargets();
      if (!targets.length) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const step = event.shiftKey ? LARGE_STEP : SMALL_STEP;
      let dx = 0, dy = 0;
      if (event.key === 'ArrowLeft') dx = -step;
      else if (event.key === 'ArrowRight') dx = step;
      else if (event.key === 'ArrowUp') dy = -step;
      else if (event.key === 'ArrowDown') dy = step;
      moveTargets(targets, dx, dy);
    }, true);

    document.addEventListener('click', (event) => {
      const save = event.target.closest && event.target.closest('[data-editor-save]');
      if (!save) return;
      const slide = activeSlide();
      if (!slide) return;
      const slideId = slide.dataset.slideId;
      // The text editor keeps a private draft snapshot and can overwrite t999.
      // Re-merge layout metadata immediately after its save completes.
      const started = Date.now();
      const tick = () => {
        const status = document.querySelector('.dm-editor-status');
        if (status && status.classList.contains('error')) return;
        if (status && status.classList.contains('saved')) {
          saveLayout(slideId, true);
          return;
        }
        if (Date.now() - started < 5000) setTimeout(tick, 120);
      };
      setTimeout(tick, 120);
    }, true);

    window.addEventListener('beforeunload', (event) => {
      if (!state.dirty.size) return;
      event.preventDefault();
      event.returnValue = '';
    });

    const modeObserver = new MutationObserver(() => {
      if (!root.classList.contains('dm-edit-mode')) {
        state.primary = null;
        clearMulti();
        state.multi = false;
      }
      if (state.primary && (!document.contains(state.primary) || !state.primary.closest('.slide.active'))) {
        state.primary = null;
      }
      syncUi();
    });
    modeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
    modeObserver.observe(stage, { subtree: true, attributes: true, attributeFilter: ['class'] });

    function loadLayouts(editsBySlide) {
      Object.entries(editsBySlide || {}).forEach(([slideId, edits]) => {
        const meta = edits && edits[`${slideId}-${META_SUFFIX}`];
        if (!meta || typeof meta.text !== 'string') return;
        const text = meta.text;
        if (text.startsWith(MARKER_V2)) {
          try {
            const parsed = JSON.parse(text.slice(MARKER_V2.length));
            if (parsed && typeof parsed === 'object') {
              state.layouts[slideId] = {
                mode: parsed.mode === 'free' ? 'free' : 'flow',
                items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
              };
            }
          } catch (_) {}
        } else if (text.startsWith(MARKER_V1)) {
          try {
            const positions = JSON.parse(text.slice(MARKER_V1.length));
            const items = {};
            Object.entries(positions || {}).forEach(([editId, coords]) => {
              if (!Array.isArray(coords) || coords.length < 2) return;
              items[`i:${editId.split('-').pop()}`] = { free: [clamp(coords[0]), clamp(coords[1])] };
            });
            state.layouts[slideId] = { mode: 'flow', items };
          } catch (_) {}
        }
      });
    }

    function applyAllLayouts() {
      stage.querySelectorAll('.slide').forEach((slide) => {
        const slideId = slide.dataset.slideId;
        const layout = state.layouts[slideId];
        if (!layout) return;
        Object.entries(layout.items || {}).forEach(([key, item]) => {
          const element = elementFromKey(slide, key);
          if (!element || !item || typeof item !== 'object') return;
          if (Array.isArray(item.flow)) applyFlow(element, item.flow[0], item.flow[1]);
          if (Array.isArray(item.free)) applyFree(element, item.free[0], item.free[1]);
        });
      });
    }

    function ensureTools() {
      const insert = () => {
        const panel = document.querySelector('.dm-text-editor-panel');
        if (!panel || panel.querySelector('.dm-layout-tools-v4')) return false;
        state.panel = panel;
        const tools = document.createElement('section');
        tools.className = 'dm-layout-tools-v4';
        tools.innerHTML = `
          <div class="dm-layout-head-v4"><strong>布局 / 位置</strong><span class="dm-layout-count-v4">未选择</span></div>
          <div class="dm-layout-mode-label">移动方式</div>
          <div class="dm-layout-mode-switch">
            <button type="button" data-layout-mode="flow">自动排版</button>
            <button type="button" data-layout-mode="free">自由移动</button>
          </div>
          <div class="dm-layout-help-v4"></div>
          <div class="dm-layout-select-row-v4">
            <button type="button" class="dm-layout-multi-v4">多选模式</button>
            <button type="button" class="dm-layout-clear-v4">清除多选</button>
          </div>
          <div class="dm-layout-move-grid-v4" aria-label="移动选中元素">
            <span></span><button type="button" data-move="0,-4">↑</button><span></span>
            <button type="button" data-move="-4,0">←</button><button type="button" data-reset-position>归零</button><button type="button" data-move="4,0">→</button>
            <span></span><button type="button" data-move="0,4">↓</button><span></span>
          </div>
          <div class="dm-layout-coords-v4"><span>X <b data-x>0</b> px</span><span>Y <b data-y>0</b> px</span></div>
          <button type="button" class="dm-layout-save-v4" disabled>保存位置</button>
          <div class="dm-layout-status-v4"></div>
        `;
        const status = panel.querySelector('.dm-editor-status');
        if (status) panel.insertBefore(tools, status);
        else panel.appendChild(tools);

        state.tools = tools;
        state.modeFlow = tools.querySelector('[data-layout-mode="flow"]');
        state.modeFree = tools.querySelector('[data-layout-mode="free"]');
        state.multiBtn = tools.querySelector('.dm-layout-multi-v4');
        state.count = tools.querySelector('.dm-layout-count-v4');
        state.xValue = tools.querySelector('[data-x]');
        state.yValue = tools.querySelector('[data-y]');
        state.help = tools.querySelector('.dm-layout-help-v4');
        state.saveBtn = tools.querySelector('.dm-layout-save-v4');
        state.status = tools.querySelector('.dm-layout-status-v4');

        state.modeFlow.addEventListener('click', () => setMode('flow'));
        state.modeFree.addEventListener('click', () => setMode('free'));
        state.multiBtn.addEventListener('click', () => {
          state.multi = !state.multi;
          if (!state.multi) clearMulti();
          syncUi();
        });
        tools.querySelector('.dm-layout-clear-v4').addEventListener('click', clearMulti);
        tools.querySelectorAll('[data-move]').forEach((button) => {
          button.addEventListener('click', (event) => {
            const targets = movementTargets();
            if (!targets.length) return;
            const [bx, by] = button.dataset.move.split(',').map(Number);
            const scale = event.shiftKey ? LARGE_STEP / SMALL_STEP : 1;
            moveTargets(targets, bx * scale, by * scale);
          });
        });
        tools.querySelector('[data-reset-position]').addEventListener('click', () => {
          const targets = movementTargets();
          if (!targets.length) return;
          targets.forEach((element) => setOffset(element, state.mode, 0, 0));
          markDirty(targets);
          syncUi();
        });
        state.saveBtn.addEventListener('click', () => {
          const slide = activeSlide();
          if (slide) saveLayout(slide.dataset.slideId, false);
        });

        syncModeFromSlide();
        syncUi();
        return true;
      };

      if (insert()) return;
      const observer = new MutationObserver(() => {
        if (insert()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(insert, 250);
      setTimeout(insert, 900);
    }

    function setMode(mode) {
      state.mode = mode === 'free' ? 'free' : 'flow';
      const slide = activeSlide();
      if (slide) ensureLayout(slide.dataset.slideId).mode = state.mode;
      syncUi();
    }

    function syncModeFromSlide() {
      const slide = activeSlide();
      const layout = slide && state.layouts[slide.dataset.slideId];
      state.mode = layout && layout.mode === 'free' ? 'free' : 'flow';
    }

    function activeSlide() {
      return stage.querySelector('.slide.active');
    }

    function selectedExact() {
      const slide = activeSlide();
      if (!slide) return [];
      let list = Array.from(state.selected).filter((el) => document.contains(el) && slide.contains(el));
      if (!list.length && state.primary && slide.contains(state.primary)) list = [state.primary];
      if (!list.length) {
        const visible = slide.querySelector('.dm-edit-selected');
        if (visible) list = [visible];
      }
      return dedupeNested(list);
    }

    function movementTargets() {
      const slide = activeSlide();
      if (!slide) return [];
      const exact = selectedExact();
      if (state.mode === 'free') return exact;
      return dedupeNested(exact.map((element) => flowUnitFor(element, slide)).filter(Boolean));
    }

    function flowUnitFor(element, slide) {
      const component = element.closest && element.closest('.dm-edit-component');
      if (component && slide.contains(component)) return component;
      if (!element.classList.contains('dm-edit-fragment')) return element;

      let node = element.parentElement;
      let fallback = element;
      while (node && node !== slide) {
        const tag = node.tagName;
        const display = getComputedStyle(node).display;
        const blockLike = ['block', 'flex', 'grid', 'list-item', 'table-cell', 'inline-block', 'inline-flex'].includes(display);
        if (blockLike && !['STRONG', 'EM', 'B', 'I', 'SPAN', 'A', 'SMALL', 'CODE'].includes(tag)) {
          const rect = node.getBoundingClientRect();
          const slideRect = slide.getBoundingClientRect();
          // Avoid promoting a short text selection to the entire slide shell.
          if (rect.height < slideRect.height * 0.7 || ['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'TD', 'TH', 'BUTTON'].includes(tag)) {
            return node;
          }
          fallback = node;
        }
        node = node.parentElement;
      }
      return fallback;
    }

    function dedupeNested(list) {
      const unique = Array.from(new Set(list));
      return unique.filter((element) => !unique.some((other) => other !== element && other.contains(element)));
    }

    function toggleMulti(element) {
      if (state.selected.has(element)) {
        state.selected.delete(element);
        element.classList.remove('dm-layout-selected-v4');
      } else {
        state.selected.add(element);
        element.classList.add('dm-layout-selected-v4');
      }
      syncUi();
    }

    function clearMulti() {
      state.selected.forEach((element) => element.classList.remove('dm-layout-selected-v4'));
      state.selected.clear();
      syncUi();
    }

    function moveTargets(targets, dx, dy) {
      targets.forEach((element) => {
        const [x, y] = getOffset(element, state.mode);
        setOffset(element, state.mode, x + dx, y + dy);
      });
      markDirty(targets);
      syncUi();
    }

    function getOffset(element, mode) {
      const slide = element.closest('.slide');
      if (!slide) return [0, 0];
      const key = layoutKey(element, slide);
      const item = ensureItem(slide.dataset.slideId, key);
      const pair = Array.isArray(item[mode]) ? item[mode] : [0, 0];
      return [clamp(pair[0]), clamp(pair[1])];
    }

    function setOffset(element, mode, rawX, rawY) {
      const slide = element.closest('.slide');
      if (!slide) return;
      const key = layoutKey(element, slide);
      const item = ensureItem(slide.dataset.slideId, key);
      const x = clamp(rawX), y = clamp(rawY);
      if (x || y) item[mode] = [x, y];
      else delete item[mode];
      if (!item.flow && !item.free) delete ensureLayout(slide.dataset.slideId).items[key];
      if (mode === 'flow') applyFlow(element, x, y);
      else applyFree(element, x, y);
    }

    function applyFlow(element, rawX, rawY) {
      const x = clamp(rawX), y = clamp(rawY);
      rememberFlowBase(element);
      const baseLeft = num(element.dataset.dmFlowBaseLeft);
      const baseTop = num(element.dataset.dmFlowBaseTop);
      if (x || y) {
        element.style.setProperty('margin-left', `${baseLeft + x}px`, 'important');
        element.style.setProperty('margin-top', `${baseTop + y}px`, 'important');
        element.dataset.dmFlowApplied = '1';
      } else if (element.dataset.dmFlowApplied === '1') {
        restoreOriginalMargin(element, 'left');
        restoreOriginalMargin(element, 'top');
        delete element.dataset.dmFlowApplied;
      }
    }

    function rememberFlowBase(element) {
      if (element.dataset.dmFlowBaseReady === '1') return;
      const computed = getComputedStyle(element);
      element.dataset.dmFlowBaseLeft = String(parseFloat(computed.marginLeft) || 0);
      element.dataset.dmFlowBaseTop = String(parseFloat(computed.marginTop) || 0);
      element.dataset.dmFlowInlineLeft = element.style.marginLeft || '';
      element.dataset.dmFlowInlineTop = element.style.marginTop || '';
      element.dataset.dmFlowBaseReady = '1';
    }

    function restoreOriginalMargin(element, side) {
      const key = side === 'left' ? 'dmFlowInlineLeft' : 'dmFlowInlineTop';
      const prop = side === 'left' ? 'margin-left' : 'margin-top';
      const original = element.dataset[key] || '';
      if (original) element.style.setProperty(prop, original);
      else element.style.removeProperty(prop);
    }

    function applyFree(element, rawX, rawY) {
      const x = clamp(rawX), y = clamp(rawY);
      if (element.classList.contains('dm-edit-fragment')) {
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
        if (x || y) element.style.setProperty('translate', `${x}px ${y}px`);
        else element.style.removeProperty('translate');
      }
    }

    function ensureLayout(slideId) {
      if (!state.layouts[slideId]) state.layouts[slideId] = { mode: 'flow', items: {} };
      return state.layouts[slideId];
    }

    function ensureItem(slideId, key) {
      const layout = ensureLayout(slideId);
      if (!layout.items[key]) layout.items[key] = {};
      return layout.items[key];
    }

    function layoutKey(element, slide) {
      const editId = element.dataset.dmEditId;
      if (editId) return `i:${editId.split('-').pop()}`;
      const path = [];
      let node = element;
      while (node && node !== slide) {
        const parent = node.parentElement;
        if (!parent) break;
        path.unshift(Array.prototype.indexOf.call(parent.children, node));
        node = parent;
      }
      return `p:${path.join('.')}`;
    }

    function elementFromKey(slide, key) {
      if (key.startsWith('i:')) {
        const suffix = key.slice(2);
        return slide.querySelector(`[data-dm-edit-id="${CSS.escape(`${slide.dataset.slideId}-${suffix}`)}"]`);
      }
      if (!key.startsWith('p:')) return null;
      const indexes = key.slice(2).split('.').filter(Boolean).map(Number);
      let node = slide;
      for (const index of indexes) {
        if (!node.children || !node.children[index]) return null;
        node = node.children[index];
      }
      return node === slide ? null : node;
    }

    function markDirty(targets) {
      targets.forEach((element) => {
        const slide = element.closest('.slide');
        if (slide && slide.dataset.slideId) state.dirty.add(slide.dataset.slideId);
      });
      syncUi();
    }

    function syncUi() {
      if (!state.tools) return;
      const slide = activeSlide();
      if (!slide) return;
      const slideId = slide.dataset.slideId;
      const targets = movementTargets();

      state.modeFlow.classList.toggle('active', state.mode === 'flow');
      state.modeFree.classList.toggle('active', state.mode === 'free');
      state.multiBtn.classList.toggle('active', state.multi);
      state.multiBtn.textContent = state.multi ? '多选模式：开' : '多选模式';
      state.help.textContent = state.mode === 'flow'
        ? '默认模式：移动整段、标题或卡片的布局位置；上下移动会改变页面间距，后续内容会自动补位。'
        : '自由移动：只改变选中对象的视觉位置，其他元素不会补位。适合特殊构图或精细对齐。';

      if (!targets.length) {
        state.count.textContent = '未选择';
        state.xValue.textContent = '0';
        state.yValue.textContent = '0';
      } else if (targets.length === 1) {
        state.count.textContent = state.mode === 'flow' ? '已选 1 个布局块' : '已选 1 个';
        const [x, y] = getOffset(targets[0], state.mode);
        state.xValue.textContent = String(x);
        state.yValue.textContent = String(y);
      } else {
        state.count.textContent = `已选 ${targets.length} 个`;
        state.xValue.textContent = '—';
        state.yValue.textContent = '—';
      }

      const dirty = state.dirty.has(slideId);
      state.saveBtn.disabled = !dirty;
      if (dirty && !state.status.classList.contains('saving')) setStatus('位置有未保存修改', 'dirty');
      else if (!dirty && !state.status.classList.contains('saved')) setStatus('', '');
    }

    function setStatus(message, kind) {
      if (!state.status) return;
      state.status.textContent = message;
      state.status.className = `dm-layout-status-v4${kind ? ` ${kind}` : ''}`;
    }

    async function saveLayout(slideId, silent) {
      if (!slideId) return;
      if (!silent) {
        state.saveBtn.disabled = true;
        setStatus('正在保存位置…', 'saving');
      }
      try {
        const currentResponse = await fetch(`${API_BASE}/api/dm/register?resource=slides&deck_id=${encodeURIComponent(deckId)}`, {
          mode: 'cors', credentials: 'include', cache: 'no-store',
        });
        if (!currentResponse.ok) throw new Error(`读取失败（${currentResponse.status}）`);
        const current = await currentResponse.json();
        const merged = clone((current.slide_edits && current.slide_edits[slideId]) || {});
        const layout = ensureLayout(slideId);
        const cleanItems = {};
        Object.entries(layout.items || {}).forEach(([key, item]) => {
          const clean = {};
          if (Array.isArray(item.flow) && (num(item.flow[0]) || num(item.flow[1]))) clean.flow = [clamp(item.flow[0]), clamp(item.flow[1])];
          if (Array.isArray(item.free) && (num(item.free[0]) || num(item.free[1]))) clean.free = [clamp(item.free[0]), clamp(item.free[1])];
          if (Object.keys(clean).length) cleanItems[key] = clean;
        });
        if (Object.keys(cleanItems).length || layout.mode === 'free') {
          merged[`${slideId}-${META_SUFFIX}`] = {
            text: MARKER_V2 + JSON.stringify({ mode: layout.mode === 'free' ? 'free' : 'flow', items: cleanItems }),
          };
        } else {
          delete merged[`${slideId}-${META_SUFFIX}`];
        }

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
        if (!silent) setStatus('位置已保存', 'saved');
        syncUi();
      } catch (error) {
        state.dirty.add(slideId);
        if (!silent) setStatus(error.message || '位置保存失败', 'error');
        syncUi();
      }
    }
  }

  function installStyles() {
    if (document.getElementById('dm-layout-editor-v4-style')) return;
    const style = document.createElement('style');
    style.id = 'dm-layout-editor-v4-style';
    style.textContent = `
      .dm-layout-selected-v4{outline:3px solid #7c3aed!important;outline-offset:4px!important;box-shadow:0 0 0 5px rgba(124,58,237,.12)!important}
      .dm-layout-tools-v4{margin-top:15px;padding-top:14px;border-top:1px solid #e6ebf2}
      .dm-layout-head-v4{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .dm-layout-head-v4 strong{font-size:14px}.dm-layout-count-v4{font-size:11px;font-weight:850;color:#64748b;background:#f1f5f9;border-radius:999px;padding:4px 8px}
      .dm-layout-mode-label{font-size:11px;font-weight:850;color:#40516a;margin-bottom:6px}
      .dm-layout-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;background:#eef2f7;border-radius:11px}
      .dm-layout-mode-switch button{border:0;background:transparent;border-radius:8px;padding:8px 7px;font:inherit;font-size:12px;font-weight:850;color:#64748b;cursor:pointer}
      .dm-layout-mode-switch button.active{background:#fff;color:#155eef;box-shadow:0 1px 4px rgba(15,23,42,.12)}
      .dm-layout-help-v4{font-size:11px;line-height:1.48;color:#64748b;margin:8px 0 10px;padding:8px 9px;background:#f8fafc;border-radius:9px}
      .dm-layout-select-row-v4{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .dm-layout-select-row-v4 button,.dm-layout-move-grid-v4 button,.dm-layout-save-v4{border:1px solid #cfd9e8;background:#fff;border-radius:9px;padding:8px 9px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}
      .dm-layout-multi-v4.active{background:#ede9fe!important;border-color:#a78bfa!important;color:#6d28d9!important}
      .dm-layout-move-grid-v4{width:142px;margin:10px auto 0;display:grid;grid-template-columns:42px 50px 42px;grid-template-rows:34px 40px 34px;gap:4px;align-items:stretch}
      .dm-layout-move-grid-v4 button{padding:0;font-size:16px}.dm-layout-move-grid-v4 [data-reset-position]{font-size:11px;color:#475569;background:#f8fafc}
      .dm-layout-coords-v4{display:flex;justify-content:center;gap:18px;margin:8px 0;font-size:11px;color:#64748b}.dm-layout-coords-v4 b{color:#172033;font-variant-numeric:tabular-nums}
      .dm-layout-save-v4{width:100%;background:#0f766e;color:#fff;border-color:#0f766e}.dm-layout-save-v4:disabled{opacity:.42;cursor:default}
      .dm-layout-status-v4{min-height:18px;margin-top:7px;font-size:11px;font-weight:800;color:#64748b}.dm-layout-status-v4.dirty{color:#9a5c00}.dm-layout-status-v4.saving{color:#0f5e76}.dm-layout-status-v4.saved{color:#0f7a50}.dm-layout-status-v4.error{color:#b42318}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
