(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    const dots = document.getElementById('dots');
    if (!root || !stage || !dots) return;

    const slides = Array.from(stage.querySelectorAll('.slide'));
    if (!slides.length) return;

    const readRequestedSlide = () => {
      const match = location.hash.match(/^#slide=(\d+)$/);
      if (!match) return null;
      const n = Number.parseInt(match[1], 10);
      return Number.isInteger(n) && n >= 1 && n <= slides.length ? n : null;
    };

    const activeSlideNumber = () => {
      const index = slides.findIndex((slide) => slide.classList.contains('active'));
      return index >= 0 ? index + 1 : 1;
    };

    const replaceUrl = ({ clearStart = false } = {}) => {
      const url = new URL(location.href);
      if (clearStart) url.searchParams.delete('start');
      url.hash = `slide=${activeSlideNumber()}`;
      history.replaceState(history.state, '', url.href);
    };

    const clickSlide = (n) => {
      const dot = dots.children[n - 1];
      if (dot && typeof dot.click === 'function') dot.click();
    };

    const syncSoon = () => setTimeout(() => replaceUrl(), 0);

    // Let the deck's own initialization and deck-mobile-core's one-time cross-concept
    // navigation finish first. Then restore a normal #slide=n location exactly once.
    setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (params.get('start') === 'last') {
        clickSlide(slides.length);
        replaceUrl({ clearStart: true });
      } else {
        const requested = readRequestedSlide();
        if (requested) clickSlide(requested);
        replaceUrl();
      }

      // Keep the hash in sync only after explicit user navigation. No observers,
      // reload detection, hashchange handlers, or recursive navigation are used.
      root.addEventListener('click', syncSoon);
      document.addEventListener('keydown', syncSoon);
      stage.addEventListener('pointerup', syncSoon);
    }, 0);
  });
})();
