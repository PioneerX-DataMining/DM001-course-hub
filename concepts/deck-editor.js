(() => {
  const API_BASE = 'https://lab.pioneer-x.cn';
  const DECKS = [
    { file: 'data-mining.html', id: 'dm01', title: '01 · 数据挖掘' },
    { file: 'data-object.html', id: 'dm02', title: '02 · 数据对象' },
    { file: 'feature-attribute.html', id: 'dm03', title: '03 · 特征与属性' },
    { file: 'attribute-type.html', id: 'dm04', title: '04 · 属性类型' },
  ];

  function init() {
    const file = location.pathname.split('/').pop();
    const deckIndex = DECKS.findIndex((item) => item.file === file);
    if (deckIndex < 0) return;
    const deck = DECKS[deckIndex];
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    if (!root || !stage) return;

    const slides = Array.from(stage.querySelectorAll('.slide'));
    if (!slides.length) return;
    slides.forEach((slide, index) => {
      slide.dataset.slideId = `${deck.id}-s${String(index + 1).padStart(2, '0')}`;
    });

    const params = new URLSearchParams(location.search);
    const embedded = params.get('present') === '1';
    let deleted = new Set();
    let canEdit = false;
    let deleteBtn = null;
    let manageBtn = null;
    let overlay = null;
    let applying = false;

    const css = document.createElement('style');
    css.id = 'dm-deck-editor-style';
    css.textContent = `
      .slide.dm-slide-deleted{display:none!important}
      #dots .dm-dot-deleted{display:none!important}
      .dm-delete-slide-btn{border-color:#f0c7c3!important;color:#a33a30!important;background:#fff9f8!important}
      .dm-delete-slide-btn:hover{border-color:#e5a49d!important;color:#8f2f27!important;background:#fff3f1!important}
      .dm-page-manager-btn{white-space:nowrap}
      .dm-page-manager-overlay{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.42);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px}
      .dm-page-manager-panel{width:min(430px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.22);padding:18px}
      .dm-page-manager-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .dm-page-manager-head h3{margin:0;font-size:19px}.dm-page-manager-close{border:0;background:#eef2f7;border-radius:9px;width:34px;height:34px;font-size:20px;cursor:pointer}
      .dm-page-manager-note{margin:0 0 14px;color:#64748b;font-size:14px;line-height:1.55}
      .dm-deleted-list{display:grid;gap:9px}.dm-deleted-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:11px 12px}
      .dm-deleted-row strong{font-size:14px;line-height:1.4}.dm-restore-btn{flex:0 0 auto;border:1px solid #bcd0ee;background:#fff;color:#245493;border-radius:9px;padding:7px 10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .dm-manager-empty{border:1px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;color:#64748b;font-size:14px}
      .dm-manager-error{margin-top:10px;color:#b42318;font-size:13px;font-weight:700}
      @media(max-width:900px){.dm-page-manager-overlay{padding:68px 12px 12px}.dm-delete-slide-btn span,.dm-page-manager-btn span{display:none}}
    `;
    document.head.appendChild(css);

    const dots = () => Array.from(document.querySelectorAll('#dots .dot-btn'));
    const activeIndex = () => slides.findIndex((slide) => slide.classList.contains('active'));
    const visibleIndices = () => slides.map((_, i) => i).filter((i) => !deleted.has(slides[i].dataset.slideId));
    const prevVisible = (index) => {
      for (let i = index - 1; i >= 0; i -= 1) if (!deleted.has(slides[i].dataset.slideId)) return i;
      return -1;
    };
    const nextVisible = (index) => {
      for (let i = index + 1; i < slides.length; i += 1) if (!deleted.has(slides[i].dataset.slideId)) return i;
      return -1;
    };

    function goToIndex(index) {
      if (index < 0 || index >= slides.length) return false;
      const ds = dots();
      if (ds[index]) {
        ds[index].click();
        return true;
      }
      slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
      return true;
    }

    function conceptUrl(target, start, forceEmbedded) {
      const url = new URL(target.file, location.href);
      url.search = '';
      if (embedded || forceEmbedded) url.searchParams.set('present', '1');
      if (start === 'last') url.searchParams.set('start', 'last');
      return url.href;
    }

    function hopConcept(direction) {
      const target = DECKS[deckIndex + direction];
      if (!target) return false;
      const start = direction < 0 ? 'last' : 'first';
      if (embedded) {
        location.href = conceptUrl(target, start, true);
        return true;
      }
      const isFullscreen = document.fullscreenElement === root || document.webkitFullscreenElement === root;
      if (isFullscreen) {
        const frame = document.createElement('iframe');
        frame.className = 'dm-concept-frame';
        frame.title = target.title;
        frame.allow = 'fullscreen';
        frame.src = conceptUrl(target, start, true);
        root.innerHTML = '';
        root.appendChild(frame);
        frame.addEventListener('load', () => { try { frame.contentWindow.focus(); } catch (_) {} });
      } else {
        location.href = conceptUrl(target, start, false);
      }
      return true;
    }

    function syncCounters() {
      const visible = visibleIndices();
      const total = visible.length;
      slides.forEach((slide, rawIndex) => {
        const position = visible.indexOf(rawIndex);
        const no = slide.querySelector('.slide-no');
        if (no && position >= 0) no.textContent = `${String(position + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      });
      const currentRaw = activeIndex();
      const currentPos = visible.indexOf(currentRaw);
      const status = document.querySelector('.slide-status');
      if (status && currentPos >= 0) status.textContent = `${currentPos + 1} / ${total}`;
    }

    function syncDots() {
      const ds = dots();
      ds.forEach((dot, index) => {
        const isDeleted = !!slides[index] && deleted.has(slides[index].dataset.slideId);
        dot.classList.toggle('dm-dot-deleted', isDeleted);
        dot.setAttribute('aria-hidden', isDeleted ? 'true' : 'false');
        dot.tabIndex = isDeleted ? -1 : 0;
      });
    }

    function ensureActiveVisible() {
      const current = activeIndex();
      if (current < 0 || !deleted.has(slides[current].dataset.slideId)) return;
      const target = nextVisible(current);
      if (target >= 0) goToIndex(target);
      else {
        const previous = prevVisible(current);
        if (previous >= 0) goToIndex(previous);
      }
    }

    function updateTeacherButtons() {
      if (!canEdit || embedded) return;
      const nav = document.querySelector('.deck-nav-right');
      if (!nav) return;
      if (!deleteBtn) {
        deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'tool-btn dm-delete-slide-btn';
        deleteBtn.innerHTML = '⌫ <span>删除本页</span>';
        deleteBtn.addEventListener('click', deleteCurrentSlide);
        nav.insertBefore(deleteBtn, nav.lastElementChild || null);
      }
      if (!manageBtn) {
        manageBtn = document.createElement('button');
        manageBtn.type = 'button';
        manageBtn.className = 'tool-btn dm-page-manager-btn';
        manageBtn.addEventListener('click', openManager);
        nav.insertBefore(manageBtn, nav.lastElementChild || null);
      }
      manageBtn.innerHTML = `☰ <span>页面管理${deleted.size ? ` · 已删除 ${deleted.size}` : ''}</span>`;
      deleteBtn.disabled = visibleIndices().length <= 1;
      deleteBtn.title = deleteBtn.disabled ? '每个概念至少保留 1 页' : '可恢复地删除当前页';
    }

    function renderManager() {
      if (!overlay) return;
      const list = overlay.querySelector('.dm-deleted-list');
      if (!list) return;
      list.innerHTML = '';
      const deletedSlides = slides.filter((slide) => deleted.has(slide.dataset.slideId));
      if (!deletedSlides.length) {
        const empty = document.createElement('div');
        empty.className = 'dm-manager-empty';
        empty.textContent = '当前没有已删除页面。';
        list.appendChild(empty);
        return;
      }
      deletedSlides.forEach((slide) => {
        const row = document.createElement('div');
        row.className = 'dm-deleted-row';
        const title = document.createElement('strong');
        title.textContent = slide.dataset.title || slide.dataset.slideId;
        const restore = document.createElement('button');
        restore.type = 'button';
        restore.className = 'dm-restore-btn';
        restore.textContent = '恢复';
        restore.addEventListener('click', async () => {
          restore.disabled = true;
          try { await writeState(slide.dataset.slideId, false); }
          catch (error) { showManagerError(error.message || '恢复失败'); restore.disabled = false; }
        });
        row.append(title, restore);
        list.appendChild(row);
      });
    }

    function showManagerError(message) {
      if (!overlay) return;
      let el = overlay.querySelector('.dm-manager-error');
      if (!el) {
        el = document.createElement('div');
        el.className = 'dm-manager-error';
        overlay.querySelector('.dm-page-manager-panel').appendChild(el);
      }
      el.textContent = message;
    }

    function openManager() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.className = 'dm-page-manager-overlay';
      overlay.innerHTML = `<div class="dm-page-manager-panel" role="dialog" aria-modal="true" aria-label="页面管理"><div class="dm-page-manager-head"><h3>页面管理</h3><button class="dm-page-manager-close" type="button" aria-label="关闭">×</button></div><p class="dm-page-manager-note">删除是可恢复的软删除；学生端和课堂演示会自动跳过已删除页面。</p><div class="dm-deleted-list"></div></div>`;
      overlay.addEventListener('click', (event) => { if (event.target === overlay) closeManager(); });
      overlay.querySelector('.dm-page-manager-close').addEventListener('click', closeManager);
      document.body.appendChild(overlay);
      renderManager();
    }

    function closeManager() {
      if (overlay) overlay.remove();
      overlay = null;
    }

    async function writeState(slideId, shouldDelete) {
      const body = new URLSearchParams({ deck_id: deck.id, slide_id: slideId, deleted: shouldDelete ? '1' : '0' });
      const response = await fetch(`${API_BASE}/api/dm/slides/state`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        cache: 'no-store',
        body,
      });
      let payload = {};
      try { payload = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(payload.detail || `操作失败（${response.status}）`);
      applyState(payload);
      return payload;
    }

    async function deleteCurrentSlide() {
      const index = activeIndex();
      if (index < 0 || deleted.has(slides[index].dataset.slideId)) return;
      if (visibleIndices().length <= 1) return;
      const title = slides[index].dataset.title || `第 ${index + 1} 页`;
      if (!confirm(`删除“${title}”？\n\n这是可恢复删除：学生端和演示模式会跳过这一页，可在“页面管理”中恢复。`)) return;
      deleteBtn.disabled = true;
      try { await writeState(slides[index].dataset.slideId, true); }
      catch (error) { alert(error.message || '删除失败'); updateTeacherButtons(); }
    }

    function applyState(payload) {
      applying = true;
      deleted = new Set(Array.isArray(payload.deleted_slide_ids) ? payload.deleted_slide_ids : []);
      canEdit = !!payload.can_edit;
      slides.forEach((slide) => slide.classList.toggle('dm-slide-deleted', deleted.has(slide.dataset.slideId)));
      syncDots();
      ensureActiveVisible();
      syncCounters();
      updateTeacherButtons();
      renderManager();
      requestAnimationFrame(() => { syncDots(); syncCounters(); applying = false; });
      setTimeout(() => { syncDots(); syncCounters(); }, 80);
    }

    function interceptNav(button, direction) {
      if (!button) return;
      button.addEventListener('click', (event) => {
        const current = activeIndex();
        if (current < 0) return;
        const target = direction < 0 ? prevVisible(current) : nextVisible(current);
        const adjacent = current + direction;
        if (target >= 0 && target !== adjacent) {
          event.preventDefault(); event.stopImmediatePropagation(); goToIndex(target); syncCounters();
        } else if (target < 0 && adjacent >= 0 && adjacent < slides.length) {
          event.preventDefault(); event.stopImmediatePropagation(); hopConcept(direction);
        }
      }, true);
    }

    interceptNav(document.getElementById('prevBtn'), -1);
    interceptNav(document.getElementById('nextBtn'), 1);

    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      let direction = 0;
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') direction = 1;
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') direction = -1;
      if (!direction) {
        if (event.key === 'Escape' && overlay) closeManager();
        return;
      }
      const current = activeIndex();
      if (current < 0) return;
      const target = direction < 0 ? prevVisible(current) : nextVisible(current);
      const adjacent = current + direction;
      if (target >= 0 && target !== adjacent) {
        event.preventDefault(); event.stopImmediatePropagation(); goToIndex(target); syncCounters();
      } else if (target < 0 && adjacent >= 0 && adjacent < slides.length) {
        event.preventDefault(); event.stopImmediatePropagation(); hopConcept(direction);
      }
    }, true);

    let sx = null, sy = null;
    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      sx = event.clientX; sy = event.clientY;
    }, true);
    stage.addEventListener('pointerup', (event) => {
      if (sx === null || sy === null) return;
      const dx = event.clientX - sx, dy = event.clientY - sy;
      sx = null; sy = null;
      if (Math.abs(dx) <= 60 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
      const direction = dx < 0 ? 1 : -1;
      const current = activeIndex();
      const target = direction < 0 ? prevVisible(current) : nextVisible(current);
      const adjacent = current + direction;
      if (target >= 0 && target !== adjacent) {
        event.preventDefault(); event.stopImmediatePropagation(); goToIndex(target); syncCounters();
      } else if (target < 0 && adjacent >= 0 && adjacent < slides.length) {
        event.preventDefault(); event.stopImmediatePropagation(); hopConcept(direction);
      }
    }, true);

    const observer = new MutationObserver(() => {
      if (applying) return;
      ensureActiveVisible();
      syncCounters();
      syncDots();
    });
    observer.observe(stage, { subtree: true, attributes: true, attributeFilter: ['class'] });
    const dotHost = document.getElementById('dots');
    if (dotHost) observer.observe(dotHost, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    fetch(`${API_BASE}/api/dm/register?resource=slides&deck_id=${encodeURIComponent(deck.id)}`, {
      mode: 'cors',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`state ${response.status}`);
        return response.json();
      })
      .then(applyState)
      .catch(() => {
        // The deck remains fully usable if AutoLab is unavailable.
        syncDots(); syncCounters();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
