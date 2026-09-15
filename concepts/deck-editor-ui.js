(() => {
  function init() {
    const style = document.createElement('style');
    style.id = 'dm-deck-editor-ui-style';
    style.textContent = `
      .deck-nav-right .dm-delete-slide-btn{display:none!important}
      .dm-editor-page-danger{margin-top:16px;padding-top:14px;border-top:1px solid #e6ebf2}
      .dm-editor-page-danger-label{font-size:11px;font-weight:900;letter-spacing:.08em;color:#94a3b8;margin-bottom:8px}
      .dm-editor-delete-page{width:100%;border:1px solid #e8b4ae;background:#fff7f6;color:#a33a30;border-radius:10px;padding:10px 12px;font:inherit;font-size:13px;font-weight:850;cursor:pointer}
      .dm-editor-delete-page:hover{background:#fff0ee;border-color:#dc8f86}
      .dm-editor-delete-page:disabled{opacity:.45;cursor:not-allowed}
      .dm-editor-page-danger-note{margin-top:7px;font-size:11px;line-height:1.45;color:#94a3b8}
    `;
    document.head.appendChild(style);

    function sync() {
      const panel = document.querySelector('.dm-text-editor-panel');
      const originalDelete = document.querySelector('.dm-delete-slide-btn');
      if (!panel || !originalDelete) return false;

      let danger = panel.querySelector('.dm-editor-page-danger');
      if (!danger) {
        danger = document.createElement('div');
        danger.className = 'dm-editor-page-danger';
        danger.innerHTML = `
          <div class="dm-editor-page-danger-label">页面操作</div>
          <button type="button" class="dm-editor-delete-page">删除本页</button>
          <div class="dm-editor-page-danger-note">删除后学生端和演示模式会跳过本页，可在“页面管理”中恢复。</div>
        `;
        const status = panel.querySelector('.dm-editor-status');
        if (status) panel.insertBefore(danger, status);
        else panel.appendChild(danger);

        danger.querySelector('.dm-editor-delete-page').addEventListener('click', () => {
          const source = document.querySelector('.dm-delete-slide-btn');
          if (!source || source.disabled) return;
          source.click();
        });
      }

      const button = danger.querySelector('.dm-editor-delete-page');
      button.disabled = originalDelete.disabled;
      button.title = originalDelete.title || '可恢复地删除当前页';
      return true;
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'title'] });
    setTimeout(sync, 300);
    setTimeout(sync, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
