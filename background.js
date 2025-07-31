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

function toggleSpecChecker() {
  if (window.specCheckerActive) {
    window.dispatchEvent(new CustomEvent('specchecker:disable'));
  } else {
    window.dispatchEvent(new CustomEvent('specchecker:enable'));
  }
}