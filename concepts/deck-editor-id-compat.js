(() => {
  function remapComponentIds() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    const slides = Array.from(stage.querySelectorAll('.slide'));
    slides.forEach((slide) => {
      const slideId = slide.dataset.slideId;
      if (!slideId) return;
      const components = Array.from(slide.querySelectorAll('.dm-edit-component'));
      components.forEach((element, index) => {
        // AutoLab's existing slide-edit validator accepts the established text-style
        // element IDs (...-tNNN). Reserve t501+ for whole-component selections so
        // they cannot collide with normal editable text fragments.
        element.dataset.dmEditId = `${slideId}-t${String(501 + index).padStart(3, '0')}`;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(remapComponentIds, 0), { once: true });
  } else {
    setTimeout(remapComponentIds, 0);
  }
})();
