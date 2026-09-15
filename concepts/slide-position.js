(() => {
  const initialUrl = new URL(location.href);
  const hadTransientLast = initialUrl.searchParams.get('start') === 'last';

  const readHashSlide = () => {
    const match = location.hash.match(/^#slide=(\d+)$/);
    if (!match) return null;
    const n = Number.parseInt(match[1], 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const writeHashSlide = (n) => {
    if (!Number.isInteger(n) || n < 1) return;
    const next = `#slide=${n}`;
    if (location.hash === next) return;
    const url = new URL(location.href);
    url.hash = next;
    history.replaceState(history.state, '', url.href);
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Individual deck scripts run before DOMContentLoaded and finish their own
    // showSlide(0) initialization first. Restore only after that initialization.
    setTimeout(() => {
      const stage = document.getElementById('stage');
      const dots = document.getElementById('dots');
      if (!stage) return;

      const slides = Array.from(stage.querySelectorAll('.slide'));
      if (!slides.length) return;

      const activeNumber = () => {
        const index = slides.findIndex(slide => slide.classList.contains('active'));
        return index >= 0 ? index + 1 : 1;
      };

      const requested = readHashSlide();

      // start=last is a one-time cross-concept navigation command and has priority.
      // deck-mobile-core schedules that jump on the same DOMContentLoaded event, so
      // do not fight it with an older hash value here.
      if (!hadTransientLast && requested && requested <= slides.length) {
        const targetSlide = slides[requested - 1];
        if (!targetSlide.classList.contains('dm-slide-deleted')) {
          const dot = dots && dots.children[requested - 1];
          if (dot && typeof dot.click === 'function') dot.click();
        }
      }

      // Make the URL the durable source of truth for refreshes. Any navigation
      // mechanism (buttons, keyboard, swipe, dots, presenter helpers) ultimately
      // changes the active class, so observing that class keeps the hash in sync.
      const syncHash = () => writeHashSlide(activeNumber());
      const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class')) {
          queueMicrotask(syncHash);
        }
      });
      slides.forEach(slide => observer.observe(slide, { attributes: true, attributeFilter: ['class'] }));

      // If start=last was used, let its scheduled jump finish before recording the hash.
      if (hadTransientLast) setTimeout(syncHash, 0);
      else syncHash();
    }, 0);
  });
})();
