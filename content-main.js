const nativeFetch = window.fetch;

window.fetch = async function(...args) {
  const url = args[0];

  if (typeof url === 'string' && url.includes('/x/web-interface/wbi/index/top/feed/rcmd')) {
    // 💡 从 DOM 属性中秒读当前工作模式
    const currentMode = document.documentElement.getAttribute('data-tabula-mode') || 'pure';
    
    // 💡 如果是纯净模式或原生个性模式，底层规则是固定的，直接闪电放行，免去跨进程通信延迟！
    if (currentMode === 'pure' || currentMode === 'origin') {
      return nativeFetch(...args);
    }

    // 只有混合模式（mixed）和刷新模式（refresh）才需要阻塞并等待后台切换指纹
    await prepareNetworkState();
    return nativeFetch(...args);
  }

  return nativeFetch(...args);
};

// 配合 Promise 与事件总线打通与 Isolated 沙箱的安全握手
function prepareNetworkState() {
  return new Promise((resolve) => {
    const eventId = Math.random().toString(36).substring(2);

    function onNetworkReady(e) {
      if (e.detail && e.detail.eventId === eventId) {
        window.removeEventListener('tabula_network_ready', onNetworkReady);
        resolve(); // 规则已在底层网络层配置妥当，安全放行原生 fetch 动作
      }
    }

    window.addEventListener('tabula_network_ready', onNetworkReady);
    window.dispatchEvent(new CustomEvent('tabula_request_triggered', { detail: { eventId } }));
  });
}