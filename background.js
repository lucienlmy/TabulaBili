
// 核心网络拦截规则动态编译器
function compileDynamicNetworkRules(mode, tabId = null) {
  chrome.storage.local.get(['bili_fingerprint'], (res) => {
    const fingerprint = res.bili_fingerprint || '';
    const ruleIdsToRemove = [100];
    if (mode === 'origin') {
      chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIdsToRemove });
      return;
    }
    let ruleAction = {};
    if (mode === 'pure') {
      ruleAction = {
        type: "modifyHeaders",
        requestHeaders: [{ header: "cookie", operation: "remove" }]
      };
    } else {
      ruleAction = {
        type: "modifyHeaders",
        requestHeaders: [{ 
          header: "cookie", 
          operation: "set", 
          value: fingerprint
        }]
      };
    }

    const addRulesArray = [{
      id: 100,
      priority: 2,
      action: ruleAction,
      condition: {
        urlFilter: "||api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd",
        ...(tabId && { tabIds: [tabId] })
      }
    }];

    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: addRulesArray
    });
  });
}

function syncGlobalModeConfiguration(mode) {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ["rules"]
  });

  if (mode === 'pure' || mode === 'refresh') {
    compileDynamicNetworkRules(mode);
  } else {
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [100] });
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.bili_mode) {
    syncGlobalModeConfiguration(changes.bili_mode.newValue);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['bili_mode'], (res) => {
    const mode = res.bili_mode || 'pure';
    chrome.storage.local.set({ bili_mode: mode });
    syncGlobalModeConfiguration(mode);
  });
});

let tabRequestCounters = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "evaluateMixedRequest") {
    chrome.storage.local.get(['bili_mode'], (res) => {
      const mode = res.bili_mode || 'pure';
      
      if (mode === 'mixed' && sender.tab) {
        const tabId = sender.tab.id;
        
        if (!tabRequestCounters[tabId]) tabRequestCounters[tabId] = 0;
        tabRequestCounters[tabId]++;
        
        const isOdd = (tabRequestCounters[tabId] % 2 !== 0);
        
        if (isOdd) {
          compileDynamicNetworkRules('mixed', tabId);
        } else {
          chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [100] });
        }
        sendResponse({ active: isOdd });
      } else if (mode === 'refresh') {
        compileDynamicNetworkRules('refresh');
        sendResponse({ active: true });
      } else {
        sendResponse({ active: false });
      }
    });
    return true;
  }
});

// 释放内存，防止内存泄漏
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabRequestCounters[tabId]) {
    delete tabRequestCounters[tabId];
  }
});