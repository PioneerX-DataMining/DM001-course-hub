(() => {
  const VERSION = '20260915-1800';
  const SEQUENCE = [
    { file: 'data-mining.html', title: '01 · 数据挖掘' },
    { file: 'data-object.html', title: '02 · 数据对象' },
    { file: 'feature-attribute.html', title: '03 · 特征与属性' },
    { file: 'attribute-type.html', title: '04 · 属性类型' },
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (!root || !stage || !prevBtn || !nextBtn) return;

    const slides = Array.from(stage.querySelectorAll('.slide'));
    const currentFile = location.pathname.split('/').pop();
    const index = SEQUENCE.findIndex((item) => item.file === currentFile);
    if (index < 0 || !slides.length) return;

    const embedded = new URLSearchParams(location.search).get('present') === '1';
    const atFirst = () => slides[0].classList.contains('active');
    const atLast = () => slides[slides.length - 1].classList.contains('active');

    function targetUrl(target, start, forceEmbedded = false) {
      const url = new URL(target.file, location.href);
      url.search = '';
      url.searchParams.set('v', VERSION);
      if (embedded || forceEmbedded) url.searchParams.set('present', '1');
      if (start === 'last') url.searchParams.set('start', 'last');
      return url.href;
    }

    function hop(direction) {
      const target = SEQUENCE[index + direction];
      if (!target) return false;
      const start = direction < 0 ? 'last' : 'first';

      if (embedded) {
        location.href = targetUrl(target, start, true);
        return true;
      }

      const fullscreen = document.fullscreenElement === root || document.webkitFullscreenElement === root;
      if (fullscreen) {
        const frame = document.createElement('iframe');
        frame.className = 'dm-concept-frame';
        frame.title = target.title;
        frame.allow = 'fullscreen';
        frame.src = targetUrl(target, start, true);
        root.innerHTML = '';
        root.appendChild(frame);
        frame.addEventListener('load', () => {
          try { frame.contentWindow.focus(); } catch (_) {}
        });
        return true;
      }

      location.href = targetUrl(target, start, false);
      return true;
    }

    function maybeHop(direction, event) {
      const shouldHop = direction < 0 ? atFirst() && index > 0 : atLast() && index < SEQUENCE.length - 1;
      if (!shouldHop) return false;
      if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return hop(direction);
    }

    prevBtn.addEventListener('click', (event) => maybeHop(-1, event), true);
    nextBtn.addEventListener('click', (event) => maybeHop(1, event), true);

    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') maybeHop(-1, event);
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') maybeHop(1, event);
    }, true);
  }, { once: true });
})();
