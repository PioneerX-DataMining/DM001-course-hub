(() => {
  const DEFAULT_STAGE = { width: 1180, height: 663.75, controlsHeight: 46, gap: 16 };
  const OWNED_STYLE_PROPS = {
    root: ['position','width','height','margin','padding','display','overflow','background'],
    stage: ['position','left','top','width','height','min-height','max-height','aspect-ratio','margin','transform','transform-origin'],
    controls: ['position','left','top','width','margin','transform','transform-origin'],
  };

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('deckRoot');
    const stage = document.getElementById('stage');
    const controls = root && root.querySelector('.deck-controls');
    if (!root || !stage || !controls) return;

    const params = new URLSearchParams(location.search);
    const embedded = params.get('present') === '1';
    const pageKey = `dm-normal-geometry:${location.pathname.split('/').pop() || 'deck'}`;
    let normalGeometry = null;
    let applying = false;

    function isFullscreen() {
      return document.fullscreenElement === root || document.webkitFullscreenElement === root;
    }

    function presentationActive() {
      return embedded || isFullscreen();
    }

    function saveGeometry(geometry) {
      normalGeometry = geometry;
      try { sessionStorage.setItem(pageKey, JSON.stringify(geometry)); } catch (_) {}
    }

    function loadGeometry() {
      if (normalGeometry) return normalGeometry;
      try {
        const parsed = JSON.parse(sessionStorage.getItem(pageKey) || 'null');
        if (parsed && parsed.width > 500 && parsed.height > 300) return parsed;
      } catch (_) {}
      return { ...DEFAULT_STAGE };
    }

    function captureNormalGeometry() {
      if (applying || presentationActive()) return;
      const stageRect = stage.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      if (stageRect.width < 500 || stageRect.height < 300) return;
      const gap = Math.max(0, controlsRect.top - stageRect.bottom);
      saveGeometry({
        width: stageRect.width,
        height: stageRect.height,
        controlsHeight: Math.max(1, controlsRect.height),
        gap: Number.isFinite(gap) ? gap : 16,
      });
    }

    function setImportant(el, name, value) {
      el.style.setProperty(name, value, 'important');
    }

    function clearOwnedStyles() {
      Object.entries(OWNED_STYLE_PROPS).forEach(([key, props]) => {
        const el = key === 'root' ? root : key === 'stage' ? stage : controls;
        props.forEach((prop) => el.style.removeProperty(prop));
      });
      root.classList.remove('dm-fixed-layout-presenter');
    }

    function applyPresentationGeometry() {
      if (!presentationActive()) {
        applying = true;
        clearOwnedStyles();
        applying = false;
        requestAnimationFrame(captureNormalGeometry);
        return;
      }

      applying = true;
      const base = loadGeometry();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || base.width;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || base.height;
      const outerPadX = 20;
      const outerPadY = 12;
      const packageHeight = base.height + base.gap + base.controlsHeight;
      const scale = Math.max(0.25, Math.min(
        (viewportWidth - outerPadX * 2) / base.width,
        (viewportHeight - outerPadY * 2) / packageHeight
      ));
      const scaledWidth = base.width * scale;
      const scaledPackageHeight = packageHeight * scale;
      const left = Math.max(outerPadX, (viewportWidth - scaledWidth) / 2);
      const top = Math.max(outerPadY, (viewportHeight - scaledPackageHeight) / 2);
      const controlsTop = top + (base.height + base.gap) * scale;

      root.classList.add('dm-fixed-layout-presenter');
      setImportant(root, 'position', 'relative');
      setImportant(root, 'width', '100%');
      setImportant(root, 'height', '100vh');
      setImportant(root, 'margin', '0');
      setImportant(root, 'padding', '0');
      setImportant(root, 'display', 'block');
      setImportant(root, 'overflow', 'hidden');
      setImportant(root, 'background', '#eef2f8');

      setImportant(stage, 'position', 'absolute');
      setImportant(stage, 'left', `${left}px`);
      setImportant(stage, 'top', `${top}px`);
      setImportant(stage, 'width', `${base.width}px`);
      setImportant(stage, 'height', `${base.height}px`);
      setImportant(stage, 'min-height', '0');
      setImportant(stage, 'max-height', 'none');
      setImportant(stage, 'aspect-ratio', 'auto');
      setImportant(stage, 'margin', '0');
      setImportant(stage, 'transform-origin', 'top left');
      setImportant(stage, 'transform', `scale(${scale})`);

      setImportant(controls, 'position', 'absolute');
      setImportant(controls, 'left', `${left}px`);
      setImportant(controls, 'top', `${controlsTop}px`);
      setImportant(controls, 'width', `${base.width}px`);
      setImportant(controls, 'margin', '0');
      setImportant(controls, 'transform-origin', 'top left');
      setImportant(controls, 'transform', `scale(${scale})`);
      applying = false;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!presentationActive()) captureNormalGeometry();
    });
    resizeObserver.observe(stage);
    resizeObserver.observe(controls);

    captureNormalGeometry();
    document.addEventListener('fullscreenchange', () => requestAnimationFrame(applyPresentationGeometry));
    document.addEventListener('webkitfullscreenchange', () => requestAnimationFrame(applyPresentationGeometry));
    window.addEventListener('resize', () => {
      if (presentationActive()) applyPresentationGeometry();
      else captureNormalGeometry();
    });

    if (embedded) requestAnimationFrame(applyPresentationGeometry);
  });
})();
