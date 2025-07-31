chrome.runtime.onInstalled.addListener(() => {
  
  chrome.storage.sync.set({
    specRules: {
      fontSize: { min: 12, max: 72 },
      padding: { min: 4, max: 48 },
      margin: { min: 0, max: 64 },
      colors: ['#000000', '#ffffff', '#333333']
    },
    isEnabled: true
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleSpecChecker
  });
});

// 處理截圖請求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureVisibleTab') {
    // 獲取當前活動標籤
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        sendResponse({ error: '找不到活動標籤' });
        return;
      }
      
      const currentTab = tabs[0];
      
      // 截圖
      chrome.tabs.captureVisibleTab(currentTab.windowId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else if (dataUrl) {
          sendResponse({ dataUrl: dataUrl });
        } else {
          sendResponse({ error: '截圖返回空數據' });
        }
      });
    });
    
    return true; // 保持消息通道開啟
  }
  
  if (request.action === 'downloadScreenshot') {
    const filename = `specchecker-screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    
    chrome.downloads.download({
      url: request.dataUrl,
      filename: filename,
      saveAs: true // 讓用戶選擇保存位置
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    
    return true; // 保持消息通道開啟
  }
});

function toggleSpecChecker() {
  if (window.specCheckerActive) {
    window.dispatchEvent(new CustomEvent('specchecker:disable'));
  } else {
    window.dispatchEvent(new CustomEvent('specchecker:enable'));
  }
}