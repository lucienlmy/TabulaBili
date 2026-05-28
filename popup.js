document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const radioInputs = document.querySelectorAll('input[name="biliMode"]');
  const resetFingerprintBtn = document.getElementById('resetFingerprintBtn');

  // 状态指示描述
  const updateStatusBar = (mode) => {
    switch (mode) {
      case 'pure':
        statusDot.className = 'status-dot active';
        statusText.textContent = '纯净模式运行中，阻止个人数据回传';
        statusText.style.color = 'var(--color-mint)';
        resetFingerprintBtn.style.display = 'none';
        break;
      case 'refresh':
        statusDot.className = 'status-dot active';
        statusText.textContent = '探索模式运行中，每次都有新花样';
        statusText.style.color = 'var(--color-mint)';
        resetFingerprintBtn.style.display = 'block';
        break;
      case 'mixed':
        statusDot.className = 'status-dot active';
        statusText.textContent = '混合模式运行中，热门与推荐兼顾';
        statusText.style.color = 'var(--color-mint)';
        resetFingerprintBtn.style.display = 'block';
        break;
      case 'origin':
      default:
        statusDot.className = 'status-dot';
        statusText.textContent = '个性模式运行中，已恢复B站原生推荐算法';
        statusText.style.color = 'var(--color-text-sub)';
        resetFingerprintBtn.style.display = 'none';
        break;
    }
  };

  chrome.storage.local.get(['bili_mode'], (result) => {
    const currentMode = result.bili_mode || 'pure';
    const targetRadio = document.querySelector(`input[value="${currentMode}"]`);
    if (targetRadio) targetRadio.checked = true;
    updateStatusBar(currentMode);
  });

  radioInputs.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedMode = e.target.value;
      chrome.storage.local.set({ bili_mode: selectedMode }, async () => {
        updateStatusBar(selectedMode);

        //切换时无感异步更新
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && (tab.url.includes('bilibili.com') || tab.url.includes('bilibili.com/?'))) {
          chrome.tabs.sendMessage(tab.id, { 
            action: "triggerModeSwitchRefresh",
            newMode: selectedMode
          });
        }
      });
    });
  });

  //重置刷新设备指纹
  resetFingerprintBtn.addEventListener('click', async () => {
    chrome.storage.local.remove(['bili_fingerprint'], async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url.includes('bilibili.com')) {
        chrome.tabs.sendMessage(tab.id, { action: "resetDeviceFingerprint" }, (res) => {
          if (res && res.success) {
            resetFingerprintBtn.textContent = "✨ 已重置";
            setTimeout(() => { window.close(); }, 600);
          }
        });
      } else {
        alert("请在打开的 B 站首页标签页中点击此按钮进行指纹重置。");
      }
    });
  });
});