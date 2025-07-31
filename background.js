chrome.runtime.onInstalled.addListener(() => {
  // 使用與 content.js 和 settings.js 一致的預設值格式
  chrome.storage.sync.set({
    specRules: {
      fontSize: [
        { size: 12, lineHeight: 18 },
        { size: 14, lineHeight: 21 },
        { size: 16, lineHeight: 24 },
        { size: 18, lineHeight: 22 },
        { size: 20, lineHeight: 24 },
        { size: 24, lineHeight: 30 },
        { size: 32, lineHeight: 40 }
      ],
      spacing: [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64],
      borderRadius: [0, 4, 8, 12, 16, 28, 36],
      colors: ['#0c0e1f', '#494a57', '#aeafb4', '#0093c1', '#00a59b', '#f5693d', '#551e0d', '#fcf1ed']
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