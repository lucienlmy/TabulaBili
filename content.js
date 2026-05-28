chrome.storage.local.get(['bili_mode'], (result) => {
  const currentMode = result.bili_mode || 'pure';
  document.documentElement.setAttribute('data-tabula-mode', currentMode);
});

const getRawCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]*)'));
  return match ? match[2] : null;
};

const buvid3 = getRawCookie('buvid3');
const buvid4 = getRawCookie('buvid4');

if (buvid3) {
  const fingerprintString = `buvid3=${buvid3}${buvid4 ? `; buvid4=${buvid4}` : ''}`;
  chrome.storage.local.set({ bili_fingerprint: fingerprintString });
}

chrome.storage.local.get(['bili_mode'], (result) => {
  const currentMode = result.bili_mode || 'pure';
  document.documentElement.setAttribute('data-tabula-mode', currentMode);

  if (currentMode === 'pure') {
    const tryClickRollBtn = () => {
      const rollBtn = document.querySelector('.roll-btn');
      if (rollBtn) {
        if (window.scrollY < 100) rollBtn.click();
      } else {
        setTimeout(tryClickRollBtn, 200);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryClickRollBtn);
    } else {
      tryClickRollBtn();
    }
  }

  window.addEventListener('tabula_request_triggered', (event) => {
    const eventId = event.detail.eventId;
    chrome.runtime.sendMessage({ action: "evaluateMixedRequest" }, (response) => {
      window.dispatchEvent(new CustomEvent('tabula_network_ready', {
        detail: { eventId }
      }));
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "triggerModeSwitchRefresh") {
    document.documentElement.setAttribute('data-tabula-mode', message.newMode);
    const rollBtn = document.querySelector('.roll-btn');
    if (rollBtn) {
      rollBtn.click();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "resetDeviceFingerprint") {
    document.cookie = "buvid3=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.bilibili.com";
    document.cookie = "buvid4=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.bilibili.com";
    sendResponse({ success: true });
    window.location.reload();
    return true;
  }
});