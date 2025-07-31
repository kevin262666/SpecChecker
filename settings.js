document.addEventListener('DOMContentLoaded', async () => {
  
  // 顯示版本號
  const versionElement = document.getElementById('version');
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifest.version}`;
  
  // 確保先初始化事件監聽器
  setupEventListeners();
  setupButtonListeners();
  setupColorListListener();
  setupFontSpecListListener();
  
  // 載入設定（如果沒有設定會自動建立預設值）
  await loadSettings();
});

async function loadSettings() {
  console.log('正在載入設定...');
  
  // 先獲取預設值
  const defaultRules = getDefaultRules();
  console.log('預設規則:', defaultRules);
  
  // 從儲存中讀取設定
  const result = await chrome.storage.sync.get(['specRules']);
  let rules = result.specRules;
  console.log('從儲存讀取的規則:', rules);
  
  // 強制使用預設值（臨時解決方案 - 直到問題解決）
  console.log('強制使用預設值');
  rules = defaultRules;
  await chrome.storage.sync.set({ specRules: rules });
  
  // 顯示設定到UI
  console.log('顯示設定到UI', rules);
  
  // 顯示字體設定
  renderFontSpecList(rules.fontSize);
  
  // 顯示間距設定
  const spacingInput = document.getElementById('spacingValues');
  if (spacingInput) {
    spacingInput.value = rules.spacing.join(', ');
    console.log('設定間距值:', rules.spacing.join(', '));
  } else {
    console.error('找不到 spacingValues 元素');
  }
  
  // 顯示圓角設定
  const borderRadiusInput = document.getElementById('borderRadiusValues');
  if (borderRadiusInput) {
    borderRadiusInput.value = rules.borderRadius.join(', ');
    console.log('設定圓角值:', rules.borderRadius.join(', '));
  } else {
    console.error('找不到 borderRadiusValues 元素');
  }
  
  // 顯示顏色設定
  console.log('準備顯示顏色:', rules.colors);
  renderColorList(rules.colors);
  
  console.log('設定載入完成');
}

function setupEventListeners() {
  const colorPicker = document.getElementById('colorPicker');
  const colorInput = document.getElementById('colorInput');
  
  colorPicker.addEventListener('change', (e) => {
    colorInput.value = e.target.value;
  });
  
  colorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    if (isValidColor(color)) {
      colorPicker.value = color;
    }
  });
  
  colorInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addColor();
    }
  });
}

function getDefaultRules() {
  return {
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
  };
}

function renderFontSpecList(fontSpecs) {
  const fontSpecList = document.getElementById('fontSpecList');
  if (!fontSpecList) {
    console.error('找不到 fontSpecList 元素');
    return;
  }
  fontSpecList.textContent = '';
  
  fontSpecs.forEach((spec, index) => {
    const fontSpecItem = document.createElement('div');
    fontSpecItem.className = 'font-spec-item';
    
    // 安全地創建 DOM 元素
    const sizeLabel = document.createElement('div');
    sizeLabel.className = 'font-spec-label';
    sizeLabel.textContent = '字級';
    
    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.className = 'font-spec-input';
    sizeInput.setAttribute('data-field', 'size');
    sizeInput.setAttribute('data-index', index.toString());
    sizeInput.value = spec.size.toString();
    sizeInput.min = '1';
    sizeInput.placeholder = '字體大小';
    
    const pxLabel1 = document.createElement('div');
    pxLabel1.className = 'font-spec-label';
    pxLabel1.textContent = 'px';
    
    const lineHeightLabel = document.createElement('div');
    lineHeightLabel.className = 'font-spec-label';
    lineHeightLabel.textContent = '行高';
    
    const lineHeightInput = document.createElement('input');
    lineHeightInput.type = 'number';
    lineHeightInput.className = 'font-spec-input';
    lineHeightInput.setAttribute('data-field', 'lineHeight');
    lineHeightInput.setAttribute('data-index', index.toString());
    lineHeightInput.value = spec.lineHeight.toString();
    lineHeightInput.min = '1';
    lineHeightInput.placeholder = '行高';
    
    const pxLabel2 = document.createElement('div');
    pxLabel2.className = 'font-spec-label';
    pxLabel2.textContent = 'px';
    
    const removeButton = document.createElement('button');
    removeButton.className = 'font-spec-remove';
    removeButton.setAttribute('data-index', index.toString());
    removeButton.title = '移除';
    removeButton.textContent = '×';
    
    fontSpecItem.appendChild(sizeLabel);
    fontSpecItem.appendChild(sizeInput);
    fontSpecItem.appendChild(pxLabel1);
    fontSpecItem.appendChild(lineHeightLabel);
    fontSpecItem.appendChild(lineHeightInput);
    fontSpecItem.appendChild(pxLabel2);
    fontSpecItem.appendChild(removeButton);
    
    fontSpecList.appendChild(fontSpecItem);
  });
}

function renderColorList(colors) {
  const colorList = document.getElementById('colorList');
  if (!colorList) {
    console.error('找不到 colorList 元素');
    return;
  }
  colorList.textContent = '';
  
  colors.forEach((color, index) => {
    const colorItem = document.createElement('div');
    colorItem.className = 'color-item';
    
    // 安全地創建 DOM 元素
    const colorPreview = document.createElement('div');
    colorPreview.className = 'color-preview';
    colorPreview.style.backgroundColor = color;
    
    const colorSpan = document.createElement('span');
    colorSpan.textContent = color;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'color-remove';
    removeButton.setAttribute('data-index', index.toString());
    removeButton.title = '移除';
    removeButton.textContent = '×';
    
    colorItem.appendChild(colorPreview);
    colorItem.appendChild(colorSpan);
    colorItem.appendChild(removeButton);
    
    colorList.appendChild(colorItem);
  });
}

// 為顏色清單設置事件委派（只執行一次）
function setupColorListListener() {
  const colorList = document.getElementById('colorList');
  if (colorList && !colorList.hasAttribute('data-listener-added')) {
    colorList.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-remove')) {
        const index = parseInt(e.target.getAttribute('data-index'));
        removeColor(index);
      }
    });
    colorList.setAttribute('data-listener-added', 'true');
  }
}

async function addColor() {
  try {
    
    const colorInput = document.getElementById('colorInput');
    const color = colorInput.value.trim();
    
    
    if (!color) {
      alert('請輸入顏色值');
      return;
    }
    
    if (!isValidColor(color)) {
      alert('請輸入有效的顏色值（如 #000000）');
      return;
    }
    
    const result = await chrome.storage.sync.get(['specRules']);
    const rules = result.specRules || getDefaultRules();
    
    const normalizedColor = color.toLowerCase();
    if (rules.colors.includes(normalizedColor)) {
      alert('此顏色已存在於清單中');
      return;
    }
    
    rules.colors.push(normalizedColor);
    await chrome.storage.sync.set({ specRules: rules });
    
    renderColorList(rules.colors);
    colorInput.value = '';
    showNotification('顏色已新增');
  } catch (error) {
    console.error('Error adding color:', error);
    alert('新增顏色時發生錯誤: ' + error.message);
  }
}

async function removeColor(index) {
  try {
    
    const result = await chrome.storage.sync.get(['specRules']);
    const rules = result.specRules || getDefaultRules();
    
    rules.colors.splice(index, 1);
    await chrome.storage.sync.set({ specRules: rules });
    
    renderColorList(rules.colors);
    showNotification('顏色已移除');
  } catch (error) {
    console.error('Error removing color:', error);
    alert('移除顏色時發生錯誤: ' + error.message);
  }
}

function isValidColor(color) {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

function normalizeColor(color) {
  return color.toLowerCase();
}

async function saveSettings() {
  try {
    
    const spacingInput = document.getElementById('spacingValues').value.trim();
    const borderRadiusInput = document.getElementById('borderRadiusValues').value.trim();
    
    // 獲取字體規範數據
    const fontSpecInputs = document.querySelectorAll('.font-spec-input');
    const fontSpecs = [];
    const fontSpecsMap = new Map();
    
    fontSpecInputs.forEach(input => {
      const index = parseInt(input.getAttribute('data-index'));
      const field = input.getAttribute('data-field');
      const value = parseInt(input.value);
      
      if (isNaN(value) || value <= 0) {
        throw new Error(`字體規範 ${field} "${input.value}" 不是有效的數字或必須大於 0`);
      }
      
      if (!fontSpecsMap.has(index)) {
        fontSpecsMap.set(index, {});
      }
      fontSpecsMap.get(index)[field] = value;
    });
    
    // 轉換為數組並驗證
    for (const [index, spec] of fontSpecsMap.entries()) {
      if (!spec.size || !spec.lineHeight) {
        throw new Error(`字體規範 ${index + 1} 缺少字體大小或行高`);
      }
      fontSpecs.push(spec);
    }
    
    if (fontSpecs.length === 0) {
      alert('請至少設定一個字體規範');
      return;
    }
    
    
    // 解析間距數值
    let spacingValues = [];
    if (spacingInput) {
      const spacingParts = spacingInput.split(',').map(s => s.trim());
      for (const part of spacingParts) {
        const num = parseInt(part);
        if (isNaN(num)) {
          alert(`間距數值 "${part}" 不是有效的數字`);
          return;
        }
        if (num < 0) {
          alert(`間距數值不能為負數: ${num}`);
          return;
        }
        spacingValues.push(num);
      }
    }
    
    if (spacingValues.length === 0) {
      alert('請至少輸入一個間距數值');
      return;
    }
    
    // 解析圓角數值
    let borderRadiusValues = [];
    if (borderRadiusInput) {
      const borderRadiusParts = borderRadiusInput.split(',').map(s => s.trim());
      for (const part of borderRadiusParts) {
        const num = parseInt(part);
        if (isNaN(num)) {
          alert(`圓角數值 "${part}" 不是有效的數字`);
          return;
        }
        if (num < 0) {
          alert(`圓角數值不能為負數: ${num}`);
          return;
        }
        borderRadiusValues.push(num);
      }
    }
    
    if (borderRadiusValues.length === 0) {
      alert('請至少輸入一個圓角數值');
      return;
    }
    
    // 排序並去重
    spacingValues = [...new Set(spacingValues)].sort((a, b) => a - b);
    borderRadiusValues = [...new Set(borderRadiusValues)].sort((a, b) => a - b);
    
    // 檢查字體規範重複
    const fontSizeSet = new Set();
    for (const spec of fontSpecs) {
      if (fontSizeSet.has(spec.size)) {
        throw new Error(`字體大小 ${spec.size}px 重複，每個字級只能設定一次`);
      }
      fontSizeSet.add(spec.size);
    }
    
    // 排序字體規範
    fontSpecs.sort((a, b) => a.size - b.size);
    
    const result = await chrome.storage.sync.get(['specRules']);
    const rules = result.specRules || getDefaultRules();
    
    rules.fontSize = fontSpecs;
    rules.spacing = spacingValues;
    rules.borderRadius = borderRadiusValues;
    
    // 移除舊格式
    if (rules.padding) delete rules.padding;
    if (rules.margin) delete rules.margin;
    
    
    await chrome.storage.sync.set({ specRules: rules });
    showNotification('設定已儲存！');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('儲存設定時發生錯誤: ' + error.message);
  }
}

async function resetToDefault() {
  if (confirm('確定要重設為預設值嗎？')) {
    const defaultRules = getDefaultRules();
    await chrome.storage.sync.set({ specRules: defaultRules });
    await loadSettings();
    showNotification('已重設為預設值');
  }
}

function setupButtonListeners() {
  
  // 儲存設定按鈕
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  } else {
    console.error('Save button not found');
  }
  
  // 重設按鈕
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetToDefault);
  } else {
    console.error('Reset button not found');
  }
  
  // 新增字體規範按鈕
  const addFontSpecBtn = document.getElementById('addFontSpecBtn');
  if (addFontSpecBtn) {
    addFontSpecBtn.addEventListener('click', addFontSpec);
  } else {
    console.error('Add font spec button not found');
  }
  
  // 新增顏色按鈕
  const addColorBtn = document.getElementById('addColorBtn');
  if (addColorBtn) {
    addColorBtn.addEventListener('click', addColor);
  } else {
    console.error('Add color button not found');
  }
  
  // 匯出設定按鈕
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSettings);
  } else {
    console.error('Export button not found');
  }
  
  // 匯入設定按鈕
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importSettings);
  } else {
    console.error('Import button or file input not found');
  }
}

function setupFontSpecListListener() {
  const fontSpecList = document.getElementById('fontSpecList');
  if (fontSpecList && !fontSpecList.hasAttribute('data-listener-added')) {
    fontSpecList.addEventListener('click', (e) => {
      if (e.target.classList.contains('font-spec-remove')) {
        const index = parseInt(e.target.getAttribute('data-index'));
        removeFontSpec(index);
      }
    });
    
    fontSpecList.addEventListener('input', (e) => {
      if (e.target.classList.contains('font-spec-input')) {
        updateFontSpec(e.target);
      }
    });
    
    fontSpecList.setAttribute('data-listener-added', 'true');
  }
}

let currentFontSpecs = [];

async function addFontSpec() {
  try {
    const result = await chrome.storage.sync.get(['specRules']);
    const rules = result.specRules || getDefaultRules();
    
    currentFontSpecs = Array.isArray(rules.fontSize) ? [...rules.fontSize] : getDefaultRules().fontSize;
    currentFontSpecs.push({ size: 16, lineHeight: 24 });
    
    renderFontSpecList(currentFontSpecs);
    showNotification('已新增字體規範');
  } catch (error) {
    console.error('Error adding font spec:', error);
    alert('新增字體規範時發生錯誤: ' + error.message);
  }
}

async function removeFontSpec(index) {
  try {
    const result = await chrome.storage.sync.get(['specRules']);
    const rules = result.specRules || getDefaultRules();
    
    currentFontSpecs = Array.isArray(rules.fontSize) ? [...rules.fontSize] : getDefaultRules().fontSize;
    
    if (currentFontSpecs.length <= 1) {
      alert('至少需要保留一個字體規範');
      return;
    }
    
    currentFontSpecs.splice(index, 1);
    renderFontSpecList(currentFontSpecs);
    showNotification('已移除字體規範');
  } catch (error) {
    console.error('Error removing font spec:', error);
    alert('移除字體規範時發生錯誤: ' + error.message);
  }
}

function updateFontSpec(input) {
  const index = parseInt(input.getAttribute('data-index'));
  const field = input.getAttribute('data-field');
  const value = parseInt(input.value);
  
  if (isNaN(value) || value <= 0) return;
  
  if (!currentFontSpecs[index]) return;
  
  currentFontSpecs[index][field] = value;
}

async function exportSettings() {
  try {
    const result = await chrome.storage.sync.get(['specRules']);
    const rules = result.specRules || getDefaultRules();
    
    const exportData = {
      version: chrome.runtime.getManifest().version,
      exportDate: new Date().toISOString(),
      settings: rules
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `specchecker-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('設定已匯出');
  } catch (error) {
    console.error('Error exporting settings:', error);
    alert('匯出設定時發生錯誤: ' + error.message);
  }
}

async function importSettings(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;
    
    // 檔案大小限制 (1MB)
    if (file.size > 1024 * 1024) {
      throw new Error('檔案大小超過 1MB 限制');
    }
    
    // 檔案類型檢查
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      throw new Error('請選擇 JSON 格式的設定檔案');
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonText = e.target.result;
        
        // 檢查內容長度
        if (!jsonText || jsonText.length === 0) {
          throw new Error('檔案內容為空');
        }
        
        if (jsonText.length > 100000) {
          throw new Error('檔案內容過大');
        }
        
        // 安全的 JSON 解析
        let importData;
        try {
          importData = JSON.parse(jsonText);
        } catch (parseError) {
          throw new Error('JSON 格式錯誤: ' + parseError.message);
        }
        
        // 基本類型驗證
        if (typeof importData !== 'object' || importData === null) {
          throw new Error('無效的設定檔案格式：根對象必須是物件');
        }
        
        // 驗證檔案格式
        if (!importData.hasOwnProperty('settings') || typeof importData.settings !== 'object') {
          throw new Error('無效的設定檔案格式：缺少 settings 物件');
        }
        
        const settings = importData.settings;
        
        // 嚴格驗證每個屬性
        if (!settings.hasOwnProperty('fontSize') || !Array.isArray(settings.fontSize)) {
          throw new Error('字體規範格式錯誤：fontSize 必須是陣列');
        }
        
        // 驗證字體規範內容
        if (settings.fontSize.length === 0 || settings.fontSize.length > 50) {
          throw new Error('字體規範數量異常');
        }
        
        for (let i = 0; i < settings.fontSize.length; i++) {
          const spec = settings.fontSize[i];
          if (typeof spec !== 'object' || spec === null) {
            throw new Error(`字體規範項目 ${i + 1} 格式錯誤`);
          }
          if (typeof spec.size !== 'number' || spec.size < 1 || spec.size > 200) {
            throw new Error(`字體規範項目 ${i + 1} 的字體大小無效`);
          }
          if (typeof spec.lineHeight !== 'number' || spec.lineHeight < 1 || spec.lineHeight > 500) {
            throw new Error(`字體規範項目 ${i + 1} 的行高無效`);
          }
        }
        
        if (!settings.hasOwnProperty('spacing') || !Array.isArray(settings.spacing)) {
          throw new Error('間距規範格式錯誤：spacing 必須是陣列');
        }
        
        // 驗證間距規範
        if (settings.spacing.length === 0 || settings.spacing.length > 100) {
          throw new Error('間距規範數量異常');
        }
        
        for (let i = 0; i < settings.spacing.length; i++) {
          if (typeof settings.spacing[i] !== 'number' || settings.spacing[i] < 0 || settings.spacing[i] > 1000) {
            throw new Error(`間距規範項目 ${i + 1} 的值無效`);
          }
        }
        
        if (!settings.hasOwnProperty('borderRadius') || !Array.isArray(settings.borderRadius)) {
          throw new Error('圓角規範格式錯誤：borderRadius 必須是陣列');
        }
        
        // 驗證圓角規範
        if (settings.borderRadius.length === 0 || settings.borderRadius.length > 50) {
          throw new Error('圓角規範數量異常');
        }
        
        for (let i = 0; i < settings.borderRadius.length; i++) {
          if (typeof settings.borderRadius[i] !== 'number' || settings.borderRadius[i] < 0 || settings.borderRadius[i] > 200) {
            throw new Error(`圓角規範項目 ${i + 1} 的值無效`);
          }
        }
        
        if (!settings.hasOwnProperty('colors') || !Array.isArray(settings.colors)) {
          throw new Error('色彩規範格式錯誤：colors 必須是陣列');
        }
        
        // 驗證色彩規範
        if (settings.colors.length === 0 || settings.colors.length > 100) {
          throw new Error('色彩規範數量異常');
        }
        
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        for (let i = 0; i < settings.colors.length; i++) {
          if (typeof settings.colors[i] !== 'string' || !colorRegex.test(settings.colors[i])) {
            throw new Error(`色彩規範項目 ${i + 1} 的格式無效，必須是 #RRGGBB 格式`);
          }
        }
        
        // 清理和驗證版本資訊（如果存在）
        let versionInfo = '';
        if (importData.version && typeof importData.version === 'string') {
          versionInfo = importData.version.slice(0, 20); // 限制版本字串長度
        }
        
        // 儲存設定
        await chrome.storage.sync.set({ specRules: settings });
        
        // 重新載入設定頁面
        await loadSettings();
        
        showNotification(`設定已匯入${versionInfo ? ` (版本: ${versionInfo})` : ''}`);
      } catch (error) {
        alert('匯入設定時發生錯誤: ' + error.message);
      }
    };
    
    reader.onerror = () => {
      alert('讀取檔案時發生錯誤');
    };
    
    reader.readAsText(file);
    
    // 清除檔案選擇
    event.target.value = '';
  } catch (error) {
    alert('匯入設定時發生錯誤: ' + error.message);
  }
}

function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}