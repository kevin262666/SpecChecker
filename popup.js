document.addEventListener('DOMContentLoaded', async () => {
  // 顯示版本號
  const versionElement = document.getElementById('version');
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifest.version}`;
  
  const enableToggle = document.getElementById('enableToggle');
  const scanBtn = document.getElementById('scanBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const reportBtn = document.getElementById('reportBtn');
  const stats = document.getElementById('stats');
  const checkedCount = document.getElementById('checkedCount');
  const issueCount = document.getElementById('issueCount');

  const result = await chrome.storage.sync.get(['isEnabled', 'scanResults']);
  
  if (result.isEnabled) {
    enableToggle.classList.add('active');
  }
  
  if (result.scanResults) {
    stats.style.display = 'block';
    checkedCount.textContent = result.scanResults.checkedElements || 0;
    issueCount.textContent = result.scanResults.issues?.length || 0;
  }

  enableToggle.addEventListener('click', async () => {
    const isEnabled = enableToggle.classList.contains('active');
    const newState = !isEnabled;
    
    enableToggle.classList.toggle('active');
    await chrome.storage.sync.set({ isEnabled: newState });
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { 
      action: newState ? 'enable' : 'disable' 
    });
  });

  scanBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'scan' }, (response) => {
      if (response) {
        stats.style.display = 'block';
        checkedCount.textContent = response.checkedElements || 0;
        issueCount.textContent = response.issues?.length || 0;
        
        chrome.storage.sync.set({ scanResults: response });
      }
    });
  });

  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });

  reportBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'showReport' });
  });
});