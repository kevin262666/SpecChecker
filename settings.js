document.addEventListener('DOMContentLoaded', async () => {
  console.log('Settings page loaded');
  
  // 顯示版本號
  const versionElement = document.getElementById('version');
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifest.version}`;
  
  await loadSettings();
  setupEventListeners();
  setupButtonListeners();
  setupColorListListener();
  setupFontSpecListListener();
});

async function loadSettings() {
  const result = await chrome.storage.sync.get(['specRules']);
  const rules = result.specRules || getDefaultRules();
  
  // 處理新的字體格式，兼容舊格式
  let fontSpecs = rules.fontSize;
  if (!Array.isArray(fontSpecs)) {
    if (typeof fontSpecs === 'object' && fontSpecs.min && fontSpecs.max) {
      // 兼容舊的 min/max 格式
      fontSpecs = getDefaultRules().fontSize;
    } else if (Array.isArray(fontSpecs)) {
      // 兼容舊的數字數組格式
      fontSpecs = fontSpecs.map(size => ({ size, lineHeight: Math.round(size * 1.4) }));
    } else {
      fontSpecs = getDefaultRules().fontSize;
    }
  }
  
  renderFontSpecList(fontSpecs);
  
  // 處理新的間距格式，兼容舊格式
  let spacingValues = rules.spacing;
  if (!spacingValues && rules.padding) {
    // 兼容舊格式，從舊的 padding/margin 範圍生成預設值
    spacingValues = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
  }
  
  if (Array.isArray(spacingValues)) {
    document.getElementById('spacingValues').value = spacingValues.join(', ');
  }
  
  // 處理圓角格式
  let borderRadiusValues = rules.borderRadius;
  if (!borderRadiusValues) {
    // 如果沒有圓角規範，使用預設值
    borderRadiusValues = [0, 2, 4, 6, 8, 12, 16, 20, 24];
  }
  
  if (Array.isArray(borderRadiusValues)) {
    document.getElementById('borderRadiusValues').value = borderRadiusValues.join(', ');
  }
  
  renderColorList(rules.colors);
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
    colors: ['#0C0E1F', '#494A57', '#AEAFB4', '#0093C1', '#00A59B', '#F5693D', '#551E0D', '#FCF1ED']
  };
}

function renderFontSpecList(fontSpecs) {
  const fontSpecList = document.getElementById('fontSpecList');
  fontSpecList.innerHTML = '';
  
  fontSpecs.forEach((spec, index) => {
    const fontSpecItem = document.createElement('div');
    fontSpecItem.className = 'font-spec-item';
    fontSpecItem.innerHTML = `
      <div class="font-spec-label">字級</div>
      <input type="number" class="font-spec-input" data-field="size" data-index="${index}" 
             value="${spec.size}" min="1" placeholder="字體大小">
      <div class="font-spec-label">px</div>
      <div class="font-spec-label">行高</div>
      <input type="number" class="font-spec-input" data-field="lineHeight" data-index="${index}" 
             value="${spec.lineHeight}" min="1" placeholder="行高">
      <div class="font-spec-label">px</div>
      <button class="font-spec-remove" data-index="${index}" title="移除">×</button>
    `;
    fontSpecList.appendChild(fontSpecItem);
  });
}

function renderColorList(colors) {
  const colorList = document.getElementById('colorList');
  colorList.innerHTML = '';
  
  colors.forEach((color, index) => {
    const colorItem = document.createElement('div');
    colorItem.className = 'color-item';
    colorItem.innerHTML = `
      <div class="color-preview" style="background-color: ${color}"></div>
      <span>${color}</span>
      <button class="color-remove" data-index="${index}" title="移除">×</button>
    `;
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
    console.log('Color list click listener added');
  }
}

async function addColor() {
  try {
    console.log('Adding color...');
    
    const colorInput = document.getElementById('colorInput');
    const color = colorInput.value.trim();
    
    console.log('Color to add:', color);
    
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
    
    if (rules.colors.includes(color.toLowerCase())) {
      alert('此顏色已存在於清單中');
      return;
    }
    
    rules.colors.push(color.toLowerCase());
    await chrome.storage.sync.set({ specRules: rules });
    
    console.log('Color added successfully');
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
    console.log('Removing color at index:', index);
    
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

async function saveSettings() {
  try {
    console.log('Saving settings...');
    
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
    
    console.log('Font specs:', fontSpecs);
    
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
    
    console.log('Saving rules:', rules);
    
    await chrome.storage.sync.set({ specRules: rules });
    console.log('Settings saved successfully');
    showNotification('設定已儲存！');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('儲存設定時發生錯誤: ' + error.message);
  }
}

function resetToDefault() {
  if (confirm('確定要重設為預設值嗎？')) {
    const defaultRules = getDefaultRules();
    chrome.storage.sync.set({ specRules: defaultRules }, () => {
      loadSettings();
      showNotification('已重設為預設值');
    });
  }
}

function setupButtonListeners() {
  console.log('Setting up button listeners');
  
  // 儲存設定按鈕
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
    console.log('Save button listener added');
  } else {
    console.error('Save button not found');
  }
  
  // 重設按鈕
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetToDefault);
    console.log('Reset button listener added');
  } else {
    console.error('Reset button not found');
  }
  
  // 新增字體規範按鈕
  const addFontSpecBtn = document.getElementById('addFontSpecBtn');
  if (addFontSpecBtn) {
    addFontSpecBtn.addEventListener('click', addFontSpec);
    console.log('Add font spec button listener added');
  } else {
    console.error('Add font spec button not found');
  }
  
  // 新增顏色按鈕
  const addColorBtn = document.getElementById('addColorBtn');
  if (addColorBtn) {
    addColorBtn.addEventListener('click', addColor);
    console.log('Add color button listener added');
  } else {
    console.error('Add color button not found');
  }
  
  // 匯出設定按鈕
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSettings);
    console.log('Export button listener added');
  } else {
    console.error('Export button not found');
  }
  
  // 匯入設定按鈕
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importSettings);
    console.log('Import button listener added');
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
    console.log('Font spec list listeners added');
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
  console.log('Updated font spec:', currentFontSpecs[index]);
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
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        // 驗證檔案格式
        if (!importData.settings) {
          throw new Error('無效的設定檔案格式');
        }
        
        const settings = importData.settings;
        
        // 基本驗證
        if (!settings.fontSize || !Array.isArray(settings.fontSize)) {
          throw new Error('字體規範格式錯誤');
        }
        if (!settings.spacing || !Array.isArray(settings.spacing)) {
          throw new Error('間距規範格式錯誤');
        }
        if (!settings.borderRadius || !Array.isArray(settings.borderRadius)) {
          throw new Error('圓角規範格式錯誤');
        }
        if (!settings.colors || !Array.isArray(settings.colors)) {
          throw new Error('色彩規範格式錯誤');
        }
        
        // 儲存設定
        await chrome.storage.sync.set({ specRules: settings });
        
        // 重新載入設定頁面
        await loadSettings();
        
        showNotification(`設定已匯入${importData.version ? ` (版本: ${importData.version})` : ''}`);
      } catch (error) {
        console.error('Error parsing import file:', error);
        alert('匯入設定時發生錯誤: ' + error.message);
      }
    };
    
    reader.readAsText(file);
    
    // 清除檔案選擇
    event.target.value = '';
  } catch (error) {
    console.error('Error importing settings:', error);
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