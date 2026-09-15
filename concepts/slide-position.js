(() => {
  const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isReload = navEntry ? navEntry.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
  const storageKey = `dm-slide-position:${location.pathname}`;

  document.addEventListener('DOMContentLoaded', () => {
    // deck-mobile-core may schedule a one-time start=last jump on the same event.
    // Run after that so cross-concept navigation keeps its intended landing page.
    setTimeout(() => {
      const stage = document.getElementById('stage');
      if (!stage) return;

      const slides = Array.from(stage.querySelectorAll('.slide'));
      const dots = document.getElementById('dots');
      if (!slides.length) return;

      const isVisible = (slide) => !slide.classList.contains('dm-slide-deleted') && getComputedStyle(slide).display !== 'none';
      const activeIndex = () => slides.findIndex(slide => slide.classList.contains('active'));

      const saveCurrent = () => {
        const index = activeIndex();
        if (index < 0) return;
        try {
          sessionStorage.setItem(storageKey, String(index));
        } catch (_) {}
      };

      if (isReload) {
        let saved = -1;
        try {
          saved = Number.parseInt(sessionStorage.getItem(storageKey) || '', 10);
        } catch (_) {}

        if (Number.isInteger(saved) && saved >= 0 && saved < slides.length) {
          // If that page was soft-deleted since the last view, choose the nearest visible page.
          let target = saved;
          if (!isVisible(slides[target])) {
            const visibleIndexes = slides
              .map((slide, index) => ({ slide, index }))
              .filter(item => isVisible(item.slide))
              .map(item => item.index);
            if (visibleIndexes.length) {
              target = visibleIndexes.reduce((best, index) =>
                Math.abs(index - saved) < Math.abs(best - saved) ? index : best,
              visibleIndexes[0]);
            }
          }

          const dot = dots && dots.children[target];
          if (dot && typeof dot.click === 'function') {
            dot.click();
          } else {
            slides.forEach((slide, index) => slide.classList.toggle('active', index === target));
          }
        }
      }

      // Start observing only after restoration, otherwise the initial first slide would
      // overwrite the saved position before we get a chance to restore it.
      const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class')) saveCurrent();
      });
      slides.forEach(slide => observer.observe(slide, { attributes: true, attributeFilter: ['class'] }));

      saveCurrent();
    }, 0);
  });
})();
