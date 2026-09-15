(() => {
  const url = new URL(location.href);
  if (url.searchParams.get('start') !== 'last') return;

  const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isReload = navEntry && navEntry.type === 'reload';

  const clearStartParam = () => {
    const clean = new URL(location.href);
    clean.searchParams.delete('start');
    history.replaceState(history.state, '', clean.href);
  };

  // A reload should never replay the transient "open previous concept on its last slide" command.
  // Remove it immediately so deck-mobile-core sees a normal URL at DOMContentLoaded.
  if (isReload) {
    clearStartParam();
    return;
  }

  // On a real cross-concept navigation, let deck-mobile-core consume start=last once.
  // Its DOMContentLoaded handler was registered before this script, so by the time this
  // handler runs it has already captured the parameter and scheduled the one-time jump.
  document.addEventListener('DOMContentLoaded', clearStartParam, { once: true });
})();
