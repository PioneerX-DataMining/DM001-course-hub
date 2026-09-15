(() => {
  // Minimal WebKit fullscreen compatibility for mobile Safari variants.
  if (!Element.prototype.requestFullscreen && Element.prototype.webkitRequestFullscreen) {
    Element.prototype.requestFullscreen = function () { return this.webkitRequestFullscreen(); };
  }
  if (!document.exitFullscreen && document.webkitExitFullscreen) {
    document.exitFullscreen = function () { return document.webkitExitFullscreen(); };
  }
  if (!('fullscreenElement' in document) && 'webkitFullscreenElement' in document) {
    Object.defineProperty(document, 'fullscreenElement', { get: () => document.webkitFullscreenElement });
  }
  if ('onwebkitfullscreenchange' in document) {
    document.addEventListener('webkitfullscreenchange', () => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
  }

  const css = `
    .mobile-rotate-hint{display:none}
    @media (orientation:portrait) and (max-width:900px){
      .deck-wrap:fullscreen .mobile-rotate-hint{
        position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
        padding:28px;background:#0c1f46;color:#fff;text-align:center;font-weight:900;font-size:20px;line-height:1.5
      }
      .deck-wrap:fullscreen .mobile-rotate-hint small{display:block;margin-top:8px;color:#b8c8df;font-size:12px;font-weight:650}
    }
    @media (orientation:landscape) and (max-height:650px){
      .deck-wrap:fullscreen{
        padding:max(6px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))!important;
        width:100%!important;height:100%!important;background:#eef2f8!important
      }
      .deck-wrap:fullscreen .stage{border-radius:10px!important;min-height:0!important;box-shadow:none!important}
      .deck-wrap:fullscreen .slide{padding:16px 24px 14px!important;overflow:auto!important}
      .deck-wrap:fullscreen .slide-no{right:16px!important;top:12px!important;font-size:10px!important}
      .deck-wrap:fullscreen .slide-kicker{font-size:9px!important;margin-bottom:5px!important}
      .deck-wrap:fullscreen .slide h1{font-size:clamp(30px,5vw,48px)!important;line-height:1.02!important}
      .deck-wrap:fullscreen .slide h2{font-size:clamp(27px,4.4vw,42px)!important;line-height:1.03!important}
      .deck-wrap:fullscreen .slide .lead{font-size:13px!important;line-height:1.4!important;margin-top:7px!important;max-width:none!important}
      .deck-wrap:fullscreen .slide-content{margin-top:8px!important;justify-content:center!important}
      .deck-wrap:fullscreen .order-layout,
      .deck-wrap:fullscreen .object-layout,
      .deck-wrap:fullscreen .task-map,
      .deck-wrap:fullscreen .scenario-grid{grid-template-columns:1.08fr .92fr!important;gap:12px!important}
      .deck-wrap:fullscreen .definition{grid-template-columns:1fr auto 1fr auto 1fr!important;gap:8px!important;margin:6px 0 10px!important}
      .deck-wrap:fullscreen .arrow{transform:none!important;font-size:22px!important}
      .deck-wrap:fullscreen .criteria{grid-template-columns:repeat(3,1fr)!important;gap:7px!important;margin-top:8px!important}
      .deck-wrap:fullscreen .quiz{grid-template-columns:1fr 1fr!important;gap:7px!important}
      .deck-wrap:fullscreen .task-list{grid-template-columns:1fr 1fr!important;gap:6px!important}
      .deck-wrap:fullscreen .process{grid-template-columns:repeat(7,1fr)!important;gap:5px!important;margin-top:3px!important}
      .deck-wrap:fullscreen .process-step:last-child{grid-column:auto!important}
      .deck-wrap:fullscreen .term-grid{grid-template-columns:repeat(5,1fr)!important;gap:7px!important;margin-bottom:9px!important}
      .deck-wrap:fullscreen .choices{grid-template-columns:repeat(3,1fr)!important;gap:5px!important}
      .deck-wrap:fullscreen .data-card,
      .deck-wrap:fullscreen .thinking-panel,
      .deck-wrap:fullscreen .object-panel{min-height:0!important}
      .deck-wrap:fullscreen .thinking-panel,
      .deck-wrap:fullscreen .object-panel{padding:14px!important}
      .deck-wrap:fullscreen .thinking-panel h3,
      .deck-wrap:fullscreen .object-panel h3{font-size:18px!important;margin:4px 0!important}
      .deck-wrap:fullscreen .thinking-panel p,
      .deck-wrap:fullscreen .object-panel p{font-size:11px!important;line-height:1.4!important}
      .deck-wrap:fullscreen table.mock{font-size:10px!important}
      .deck-wrap:fullscreen .mock th,
      .deck-wrap:fullscreen .mock td{padding:6px 8px!important}
      .deck-wrap:fullscreen .data-head{padding:8px 10px!important}
      .deck-wrap:fullscreen .answer-stack{gap:5px!important;margin-top:8px!important}
      .deck-wrap:fullscreen .answer{padding:6px 8px!important;font-size:10px!important}
      .deck-wrap:fullscreen .prompt-row{margin-top:8px!important;gap:6px!important}
      .deck-wrap:fullscreen .reveal-btn,
      .deck-wrap:fullscreen .choice-btn,
      .deck-wrap:fullscreen .task-btn,
      .deck-wrap:fullscreen .process-btn,
      .deck-wrap:fullscreen .term-btn{padding:6px 9px!important;font-size:10px!important;border-radius:9px!important}
      .deck-wrap:fullscreen .term-btn{padding:9px 6px!important}
      .deck-wrap:fullscreen .term-btn b{font-size:12px!important}.deck-wrap:fullscreen .term-btn small{font-size:9px!important}
      .deck-wrap:fullscreen .criterion{padding:8px!important}.deck-wrap:fullscreen .criterion strong{font-size:11px!important}.deck-wrap:fullscreen .criterion span,.deck-wrap:fullscreen .criterion .detail{font-size:9px!important}
      .deck-wrap:fullscreen .quiz-item{padding:8px!important}.deck-wrap:fullscreen .quiz-item p{font-size:10px!important;margin-bottom:6px!important}.deck-wrap:fullscreen .quiz-result{font-size:9px!important;min-height:14px!important;margin-top:4px!important}
      .deck-wrap:fullscreen .core-definition,
      .deck-wrap:fullscreen .takeaway,
      .deck-wrap:fullscreen .definition-box,
      .deck-wrap:fullscreen .final-takeaway{padding:9px 12px!important;font-size:16px!important;margin-top:8px!important;border-radius:11px!important}
      .deck-wrap:fullscreen .takeaway small,
      .deck-wrap:fullscreen .definition-box small,
      .deck-wrap:fullscreen .final-takeaway small{font-size:9px!important;margin-top:3px!important}
      .deck-wrap:fullscreen .def-node{min-height:70px!important;padding:10px!important}.deck-wrap:fullscreen .def-node strong{font-size:18px!important}.deck-wrap:fullscreen .def-node span{font-size:9px!important}
      .deck-wrap:fullscreen .task-column,.deck-wrap:fullscreen .scenario{padding:10px!important}.deck-wrap:fullscreen .task-head{margin-bottom:6px!important}.deck-wrap:fullscreen .task-head h3,.deck-wrap:fullscreen .scenario h3{font-size:14px!important;margin:4px 0 7px!important}.deck-wrap:fullscreen .task-btn b{font-size:10px!important}.deck-wrap:fullscreen .task-btn small{font-size:8px!important}
      .deck-wrap:fullscreen .task-example{min-height:50px!important;padding:8px 10px!important;margin-top:7px!important}.deck-wrap:fullscreen .task-example p{font-size:10px!important}
      .deck-wrap:fullscreen .process-step{min-height:62px!important;padding:7px 3px!important}.deck-wrap:fullscreen .process-step b{font-size:9px!important}.deck-wrap:fullscreen .process-controls{margin-top:7px!important;gap:6px!important}.deck-wrap:fullscreen .process-note{font-size:9px!important;padding:6px 8px!important}.deck-wrap:fullscreen .big-final{font-size:18px!important;margin-top:7px!important}
      .deck-wrap:fullscreen .term-detail{min-height:54px!important;padding:10px 12px!important;font-size:10px!important}.deck-wrap:fullscreen .object-result{min-height:48px!important;margin-top:8px!important;padding:8px!important;font-size:10px!important}.deck-wrap:fullscreen .scenario-result{min-height:24px!important;margin-top:5px!important;font-size:9px!important}.deck-wrap:fullscreen .next-concept{font-size:9px!important;margin-top:5px!important}
      .deck-wrap:fullscreen .deck-controls{margin-top:5px!important}.deck-wrap:fullscreen .nav-btn{width:36px!important;height:34px!important;border-radius:10px!important;font-size:16px!important}.deck-wrap:fullscreen .tool-btn{min-height:34px!important;padding:0 10px!important;font-size:10px!important}.deck-wrap:fullscreen .dot-btn{width:7px!important;height:7px!important}.deck-wrap:fullscreen .slide-status{font-size:10px!important}
    }
  `;

  const style = document.createElement('style');
  style.id = 'dm-mobile-deck-style';
  style.textContent = css;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('deckRoot');
    if (!root) return;

    const hint = document.createElement('div');
    hint.className = 'mobile-rotate-hint';
    hint.innerHTML = '↻ 正在切换横屏演示<small>如果浏览器没有自动旋转，请把手机横过来。</small>';
    root.appendChild(hint);

    const isMobileLike = () => matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    async function lockLandscape() {
      if (!isMobileLike()) return;
      try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          await screen.orientation.lock('landscape');
        }
      } catch (_) {
        // Some browsers intentionally deny orientation locking. The portrait hint remains as fallback.
      }
    }

    function unlockOrientation() {
      try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') screen.orientation.unlock();
      } catch (_) {}
    }

    const handleFullscreen = () => {
      const active = document.fullscreenElement === root || document.webkitFullscreenElement === root;
      root.classList.toggle('mobile-fullscreen', active);
      if (active) lockLandscape();
      else unlockOrientation();
    };

    document.addEventListener('fullscreenchange', handleFullscreen);
    document.addEventListener('webkitfullscreenchange', handleFullscreen);
  });
})();