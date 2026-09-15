(() => {
  const API_BASE = 'https://lab.pioneer-x.cn';
  const DECKS = {
    'data-mining.html': 'dm01',
    'data-object.html': 'dm02',
    'feature-attribute.html': 'dm03',
    'attribute-type.html': 'dm04',
  };

  const SKIP_DYNAMIC = [
    '.slide-no',
    '.quiz-result',
    '.scenario-result',
    '.object-result',
    '.term-detail',
    '.value-feedback',
    '.number-result',
    '.challenge-feedback',
    '.trap-feedback',
    '.impact-detail',
    '.process-note',
    '.task-example',
  ].join(',');

  function init() {
    const file = location.pathname.split('/').pop();
    const deckId = DECKS[file];
    if (!deckId) return;

    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;

    const params = new URLSearchParams(location.search);
    const embedded = params.get('present') === '1';
    const slides = Array.from(stage.querySelectorAll('.slide'));
    if (!slides.length) return;

    slides.forEach((slide, index) => {
      if (!slide.dataset.slideId) {
        slide.dataset.slideId = `${deckId}-s${String(index + 1).padStart(2, '0')}`;
      }
    });

    const state = {
      canEdit: false,
      editing: false,
      edits: {},
      selected: null,
      button: null,
      panel: null,
      status: null,
      textarea: null,
      sizeInput: null,
      colorInput: null,
      saveTimers: new Map(),
    };

    installStyles();
    wrapEditableText(slides);

    stage.addEventListener('click', (event) => {
      if (!state.editing) return;
      const fragment = event.target.closest && event.target.closest('.dm-edit-fragment');
      if (fragment && stage.contains(fragment)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        selectFragment(fragment);
        return;
      }
      if (event.target.closest && event.target.closest('button,a,input,select,textarea,[role="button"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    fetch(`${API_BASE}/api/dm/register?resource=slides&deck_id=${encodeURIComponent(deckId)}`, {
      mode: 'cors',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`state ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        state.canEdit = !!payload.can_edit;
        state.edits = payload.slide_edits && typeof payload.slide_edits === 'object' ? payload.slide_edits : {};
        applyAllEdits();
        if (state.canEdit && !embedded) installEditButton();
      })
      .catch(() => {
        // Presentation remains fully usable if AutoLab is temporarily unavailable.
      });

    function installStyles() {
      if (document.getElementById('dm-text-editor-style')) return;
      const style = document.createElement('style');
      style.id = 'dm-text-editor-style';
      style.textContent = `
        .dm-edit-text-btn{white-space:nowrap;border-color:#bdd0ee!important;color:#245493!important;background:#f8fbff!important}
        .dm-edit-text-btn.active{background:#155eef!important;color:#fff!important;border-color:#155eef!important}
        .dm-edit-fragment{border-radius:3px}
        .dm-edit-mode .dm-edit-fragment{cursor:text}
        .dm-edit-mode .dm-edit-fragment:hover{outline:2px dashed rgba(21,94,239,.45);outline-offset:2px;background:rgba(234,241,255,.45)}
        .dm-edit-fragment.dm-edit-selected{outline:2px solid #155eef!important;outline-offset:3px;background:rgba(234,241,255,.7)}
        .dm-text-editor-panel{position:fixed;z-index:2050;right:22px;top:78px;width:min(350px,calc(100vw - 28px));max-height:calc(100vh - 96px);overflow:auto;background:#fff;border:1px solid #d7e1ef;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.22);padding:16px;display:none}
        .dm-text-editor-panel.open{display:block}
        .dm-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
        .dm-editor-head strong{font-size:17px}.dm-editor-close{border:0;background:#eef2f7;border-radius:9px;width:32px;height:32px;font-size:18px;cursor:pointer}
        .dm-editor-help{font-size:12px;line-height:1.55;color:#64748b;margin:0 0 13px}
        .dm-editor-empty{border:1px dashed #cbd5e1;border-radius:12px;padding:18px 12px;text-align:center;color:#64748b;font-size:13px}
        .dm-editor-controls{display:none}.dm-editor-controls.ready{display:block}
        .dm-editor-field{display:grid;gap:6px;margin-top:12px}.dm-editor-field label{font-size:12px;font-weight:850;color:#40516a}
        .dm-editor-textarea{width:100%;min-height:92px;resize:vertical;border:1px solid #cfd9e8;border-radius:11px;padding:10px 11px;font:14px/1.5 inherit;color:#172033;background:#fff}
        .dm-editor-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end}
        .dm-editor-sizebox{display:grid;grid-template-columns:34px 1fr 34px;gap:5px}.dm-editor-sizebox button{border:1px solid #cfd9e8;background:#f8fafc;border-radius:9px;font:700 18px/1 inherit;cursor:pointer}.dm-editor-sizebox input{width:100%;min-width:0;border:1px solid #cfd9e8;border-radius:9px;padding:8px;text-align:center;font:inherit}
        .dm-editor-colorbox{display:grid;grid-template-columns:44px 1fr;gap:7px;align-items:center}.dm-editor-colorbox input[type="color"]{width:44px;height:38px;border:1px solid #cfd9e8;border-radius:9px;padding:3px;background:#fff}.dm-editor-color-value{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#526178}
        .dm-editor-actions{display:flex;gap:8px;margin-top:14px}.dm-editor-actions button{flex:1;border:1px solid #cfd9e8;background:#fff;border-radius:10px;padding:9px 10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.dm-editor-actions .danger{color:#a33a30;border-color:#efc2bd;background:#fff9f8}
        .dm-editor-status{min-height:20px;margin-top:10px;font-size:12px;font-weight:750;color:#64748b}.dm-editor-status.saving{color:#8a5b00}.dm-editor-status.saved{color:#0f7a50}.dm-editor-status.error{color:#b42318}
        @media(max-width:900px){.dm-edit-text-btn span{display:none}.dm-text-editor-panel{right:10px;top:68px}}
      `;
      document.head.appendChild(style);
    }

    function wrapEditableText(items) {
      items.forEach((slide) => {
        const nodes = [];
        const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest(SKIP_DYNAMIC)) return NodeFilter.FILTER_REJECT;
            if (parent.closest('script,style,textarea,input,select,option,svg')) return NodeFilter.FILTER_REJECT;
            if (parent.closest('[data-dm-no-edit]')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        while (walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach((node, index) => {
          const span = document.createElement('span');
          span.className = 'dm-edit-fragment';
          span.dataset.dmEditId = `${slide.dataset.slideId}-t${String(index + 1).padStart(3, '0')}`;
          span.textContent = node.nodeValue;
          node.parentNode.replaceChild(span, node);
          const computed = getComputedStyle(span);
          span.dataset.dmOriginalText = span.textContent;
          span.dataset.dmOriginalFontSize = String(parseFloat(computed.fontSize) || 16);
          span.dataset.dmOriginalColor = cssColorToHex(computed.color) || '#0f172a';
        });
      });
    }

    function cssColorToHex(value) {
      if (!value) return null;
      if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
      const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (!match) return null;
      return `#${[match[1], match[2], match[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}`;
    }

    function applyAllEdits() {
      Object.entries(state.edits || {}).forEach(([slideId, edits]) => {
        if (!edits || typeof edits !== 'object') return;
        Object.entries(edits).forEach(([editId, edit]) => {
          const element = stage.querySelector(`[data-dm-edit-id="${CSS.escape(editId)}"]`);
          if (!element || !element.closest(`[data-slide-id="${CSS.escape(slideId)}"]`)) return;
          applyEdit(element, edit);
        });
      });
    }

    function applyEdit(element, edit) {
      if (!edit || typeof edit !== 'object') return;
      if (typeof edit.text === 'string') element.textContent = edit.text;
      if (Number.isFinite(Number(edit.font_size))) {
        element.style.setProperty('font-size', `${Number(edit.font_size)}px`, 'important');
      }
      if (typeof edit.color === 'string' && /^#[0-9a-f]{6}$/i.test(edit.color)) {
        element.style.setProperty('color', edit.color, 'important');
      }
    }

    function installEditButton() {
      if (state.button) return;
      const nav = document.querySelector('.deck-nav-right');
      if (!nav) return;
      state.button = document.createElement('button');
      state.button.type = 'button';
      state.button.className = 'tool-btn dm-edit-text-btn';
      state.button.innerHTML = '✎ <span>编辑本页</span>';
      state.button.addEventListener('click', () => setEditing(!state.editing));
      nav.insertBefore(state.button, nav.lastElementChild || null);
      buildPanel();
    }

    function buildPanel() {
      if (state.panel) return;
      const panel = document.createElement('aside');
      panel.className = 'dm-text-editor-panel';
      panel.setAttribute('aria-label', '页面文字编辑器');
      panel.innerHTML = `
        <div class="dm-editor-head"><strong>编辑本页</strong><button class="dm-editor-close" type="button" aria-label="关闭">×</button></div>
        <p class="dm-editor-help">点击页面中的文字进行编辑。第一版支持改文字、字号和文字颜色，修改会自动保存并同步到学生端。</p>
        <div class="dm-editor-empty">先点击页面中的一段文字。</div>
        <div class="dm-editor-controls">
          <div class="dm-editor-field"><label>文字</label><textarea class="dm-editor-textarea" spellcheck="false"></textarea></div>
          <div class="dm-editor-row">
            <div class="dm-editor-field"><label>字号（px）</label><div class="dm-editor-sizebox"><button type="button" data-size-step="-1">−</button><input type="number" min="8" max="120" step="1"><button type="button" data-size-step="1">＋</button></div></div>
            <div class="dm-editor-field"><label>文字颜色</label><div class="dm-editor-colorbox"><input type="color"><span class="dm-editor-color-value">#000000</span></div></div>
          </div>
          <div class="dm-editor-actions"><button type="button" data-editor-reset>还原这段</button><button type="button" class="danger" data-editor-reset-slide>还原本页</button></div>
        </div>
        <div class="dm-editor-status"></div>
      `;
      document.body.appendChild(panel);
      state.panel = panel;
      state.status = panel.querySelector('.dm-editor-status');
      state.textarea = panel.querySelector('.dm-editor-textarea');
      state.sizeInput = panel.querySelector('input[type="number"]');
      state.colorInput = panel.querySelector('input[type="color"]');

      panel.querySelector('.dm-editor-close').addEventListener('click', () => setEditing(false));
      state.textarea.addEventListener('input', () => {
        if (!state.selected) return;
        state.selected.textContent = state.textarea.value;
        updateDraftFromSelected();
      });
      state.sizeInput.addEventListener('input', () => {
        if (!state.selected) return;
        const size = clampSize(state.sizeInput.value);
        state.sizeInput.value = String(size);
        state.selected.style.setProperty('font-size', `${size}px`, 'important');
        updateDraftFromSelected();
      });
      panel.querySelectorAll('[data-size-step]').forEach((button) => {
        button.addEventListener('click', () => {
          if (!state.selected) return;
          const next = clampSize((Number(state.sizeInput.value) || 16) + Number(button.dataset.sizeStep));
          state.sizeInput.value = String(next);
          state.selected.style.setProperty('font-size', `${next}px`, 'important');
          updateDraftFromSelected();
        });
      });
      state.colorInput.addEventListener('input', () => {
        if (!state.selected) return;
        const color = state.colorInput.value.toLowerCase();
        panel.querySelector('.dm-editor-color-value').textContent = color;
        state.selected.style.setProperty('color', color, 'important');
        updateDraftFromSelected();
      });
      panel.querySelector('[data-editor-reset]').addEventListener('click', resetSelected);
      panel.querySelector('[data-editor-reset-slide]').addEventListener('click', resetCurrentSlide);
    }

    function clampSize(value) {
      return Math.max(8, Math.min(120, Math.round(Number(value) || 16)));
    }

    function setEditing(value) {
      if (!state.canEdit) return;
      state.editing = !!value;
      root.classList.toggle('dm-edit-mode', state.editing);
      if (state.button) {
        state.button.classList.toggle('active', state.editing);
        state.button.innerHTML = state.editing ? '✓ <span>完成编辑</span>' : '✎ <span>编辑本页</span>';
      }
      if (state.panel) state.panel.classList.toggle('open', state.editing);
      if (!state.editing) clearSelection();
    }

    function selectFragment(element) {
      if (state.selected === element) return;
      clearSelection();
      state.selected = element;
      element.classList.add('dm-edit-selected');
      state.panel.querySelector('.dm-editor-empty').style.display = 'none';
      state.panel.querySelector('.dm-editor-controls').classList.add('ready');
      state.textarea.value = element.textContent;
      state.sizeInput.value = String(Math.round(parseFloat(getComputedStyle(element).fontSize) || 16));
      const color = cssColorToHex(getComputedStyle(element).color) || '#0f172a';
      state.colorInput.value = color;
      state.panel.querySelector('.dm-editor-color-value').textContent = color;
      setStatus('已选中文字', '');
    }

    function clearSelection() {
      if (state.selected) state.selected.classList.remove('dm-edit-selected');
      state.selected = null;
      if (state.panel) {
        state.panel.querySelector('.dm-editor-empty').style.display = '';
        state.panel.querySelector('.dm-editor-controls').classList.remove('ready');
      }
    }

    function currentEntry(element) {
      const entry = {};
      const originalText = element.dataset.dmOriginalText || '';
      const originalSize = Number(element.dataset.dmOriginalFontSize) || 16;
      const originalColor = (element.dataset.dmOriginalColor || '#0f172a').toLowerCase();
      const currentText = element.textContent;
      const currentSize = parseFloat(getComputedStyle(element).fontSize) || originalSize;
      const currentColor = (cssColorToHex(getComputedStyle(element).color) || originalColor).toLowerCase();
      if (currentText !== originalText) entry.text = currentText;
      if (Math.abs(currentSize - originalSize) > 0.1) entry.font_size = Math.round(currentSize * 10) / 10;
      if (currentColor !== originalColor) entry.color = currentColor;
      return entry;
    }

    function updateDraftFromSelected() {
      const element = state.selected;
      if (!element) return;
      const slide = element.closest('.slide');
      if (!slide) return;
      const slideId = slide.dataset.slideId;
      const editId = element.dataset.dmEditId;
      if (!state.edits[slideId] || typeof state.edits[slideId] !== 'object') state.edits[slideId] = {};
      const entry = currentEntry(element);
      if (Object.keys(entry).length) state.edits[slideId][editId] = entry;
      else delete state.edits[slideId][editId];
      if (!Object.keys(state.edits[slideId]).length) delete state.edits[slideId];
      queueSave(slideId);
    }

    function queueSave(slideId) {
      const previous = state.saveTimers.get(slideId);
      if (previous) clearTimeout(previous);
      setStatus('正在编辑…', 'saving');
      const timer = setTimeout(() => {
        state.saveTimers.delete(slideId);
        saveSlide(slideId);
      }, 650);
      state.saveTimers.set(slideId, timer);
    }

    async function saveSlide(slideId) {
      if (!state.canEdit) return;
      setStatus('正在保存…', 'saving');
      const body = new URLSearchParams({
        deck_id: deckId,
        slide_id: slideId,
        edits_json: JSON.stringify(state.edits[slideId] || {}),
      });
      try {
        const response = await fetch(`${API_BASE}/api/dm/slides/state`, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          cache: 'no-store',
          body,
        });
        let payload = {};
        try { payload = await response.json(); } catch (_) {}
        if (!response.ok) throw new Error(payload.detail || `保存失败（${response.status}）`);
        if (payload.slide_edits && typeof payload.slide_edits === 'object') state.edits = payload.slide_edits;
        setStatus('已保存', 'saved');
      } catch (error) {
        setStatus(error.message || '保存失败', 'error');
      }
    }

    function resetElement(element) {
      element.textContent = element.dataset.dmOriginalText || '';
      element.style.removeProperty('font-size');
      element.style.removeProperty('color');
    }

    function resetSelected() {
      if (!state.selected) return;
      const element = state.selected;
      resetElement(element);
      state.textarea.value = element.textContent;
      state.sizeInput.value = String(Math.round(Number(element.dataset.dmOriginalFontSize) || 16));
      const color = (element.dataset.dmOriginalColor || '#0f172a').toLowerCase();
      state.colorInput.value = color;
      state.panel.querySelector('.dm-editor-color-value').textContent = color;
      updateDraftFromSelected();
    }

    function resetCurrentSlide() {
      const slide = stage.querySelector('.slide.active');
      if (!slide) return;
      if (!confirm('还原本页全部文字、字号和颜色修改？')) return;
      slide.querySelectorAll('.dm-edit-fragment').forEach(resetElement);
      delete state.edits[slide.dataset.slideId];
      if (state.selected && slide.contains(state.selected)) selectFragment(state.selected);
      saveSlide(slide.dataset.slideId);
    }

    function setStatus(message, kind) {
      if (!state.status) return;
      state.status.textContent = message;
      state.status.className = `dm-editor-status${kind ? ` ${kind}` : ''}`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
