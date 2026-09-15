(() => {
  const API_BASE = 'https://lab.pioneer-x.cn';
  const DECKS = {
    'data-mining.html': 'dm01',
    'data-object.html': 'dm02',
    'feature-attribute.html': 'dm03',
    'attribute-type.html': 'dm04',
  };

  const file = location.pathname.split('/').pop();
  const deckId = DECKS[file];
  if (!deckId) return;

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
      if (Object.prototype.hasOwnProperty.call(payload, 'slide_edits')) return;
      const style = document.createElement('style');
      style.id = 'dm-edit-capability-guard';
      style.textContent = '.dm-edit-text-btn,.dm-text-editor-panel{display:none!important}';
      document.head.appendChild(style);
    })
    .catch(() => {
      // If the capability probe fails, keep the existing presentation usable.
    });
})();
