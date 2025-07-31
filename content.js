class SpecChecker {
  constructor() {
    this.isEnabled = false;
    this.isTooltipMode = false;
    this.tooltip = null;
    this.highlightedElement = null;
    this.spacingOverlay = null;
    this.specRules = {};
    this.scanResults = null;
    this.lastScreenshotTime = 0;
    this.screenshotCooldown = 2000; // 2秒冷卻時間
    
    this.init();
  }

  async init() {
    const result = await chrome.storage.sync.get(['isEnabled', 'specRules']);
    this.isEnabled = result.isEnabled || false;
    this.specRules = result.specRules || this.getDefaultRules();
    
    
    if (this.isEnabled) {
      this.enable();
    }
    
    this.setupMessageListener();
    this.createTooltip();
    this.createSpacingOverlay();
    
    // 監聽設定變更
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.specRules) {
        this.specRules = changes.specRules.newValue;
      }
    });
  }

  getDefaultRules() {
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

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'enable':
          this.enable();
          break;
        case 'disable':
          this.disable();
          break;
        case 'scan':
          this.scanPage().then(sendResponse);
          return true;
        case 'showReport':
          this.showReport();
          break;
      }
    });
  }

  enable() {
    this.isEnabled = true;
    this.isTooltipMode = true;
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    this.showNotification('SpecChecker 已啟用 - 滑鼠懸停檢視樣式，點擊截圖，按 ESC 退出');
  }

  disable() {
    this.isEnabled = false;
    this.isTooltipMode = false;
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    this.hideTooltip();
    this.hideSpacingOverlay();
    this.removeHighlight();
    this.showNotification('SpecChecker 已停用');
  }

  handleMouseOver(event) {
    if (!this.isTooltipMode) return;
    
    event.stopPropagation();
    this.highlightElement(event.target);
    this.showSpacingOverlay(event.target);
    this.showTooltip(event.target, event.clientX, event.clientY);
  }

  handleMouseOut(event) {
    if (!this.isTooltipMode) return;
    
    if (!event.relatedTarget || !this.tooltip.contains(event.relatedTarget)) {
      this.hideTooltip();
      this.hideSpacingOverlay();
      this.removeHighlight();
    }
  }

  handleClick(event) {
    if (!this.isTooltipMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // 防抖動檢查
    const now = Date.now();
    if (now - this.lastScreenshotTime < this.screenshotCooldown) {
      const remainingTime = Math.ceil((this.screenshotCooldown - (now - this.lastScreenshotTime)) / 1000);
      this.showNotification(`請等待 ${remainingTime} 秒後再截圖`);
      return;
    }
    
    this.lastScreenshotTime = now;
    this.takeScreenshot();
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.disable();
    }
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'specchecker-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      z-index: 999999;
      background: #1f2937;
      color: white;
      padding: 12px;
      border-radius: 8px;
      font-family: Monaco, 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      pointer-events: none;
      display: none;
      max-width: 300px;
      border: 1px solid #374151;
    `;
    document.body.appendChild(this.tooltip);
  }

  createSpacingOverlay() {
    this.spacingOverlay = document.createElement('div');
    this.spacingOverlay.id = 'specchecker-spacing-overlay';
    this.spacingOverlay.style.cssText = `
      position: absolute;
      z-index: 999998 !important;
      pointer-events: none !important;
      display: none;
      top: 0;
      left: 0;
    `;
    document.body.appendChild(this.spacingOverlay);
  }

  showSpacingOverlay(element) {
    const styles = this.getElementStyles(element);
    const rect = element.getBoundingClientRect();
    
    
    this.spacingOverlay.innerHTML = '';
    this.spacingOverlay.style.display = 'block';
    
    this.createPaddingOverlay(rect, styles.padding);
    this.createMarginOverlay(rect, styles.margin);
    this.createGapOverlay(element, styles);
    
    // 如果沒有間距，顯示一個小提示
    const hasPadding = Object.values(styles.padding).some(v => v > 0);
    const hasMargin = Object.values(styles.margin).some(v => v > 0);
    const hasGap = Object.values(styles.gap).some(v => v > 0);
    
    if (!hasPadding && !hasMargin && !hasGap) {
      const notice = document.createElement('div');
      notice.style.cssText = `
        position: absolute;
        left: ${rect.left + window.scrollX}px;
        top: ${rect.top + window.scrollY - 20}px;
        background: rgba(0, 0, 0, 0.8) !important;
        color: white !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 11px !important;
        z-index: 999999 !important;
        pointer-events: none !important;
      `;
      notice.textContent = '此元素無間距';
      this.spacingOverlay.appendChild(notice);
    }
  }

  createPaddingOverlay(rect, padding) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    if (padding.top > 0) {
      const paddingTop = document.createElement('div');
      paddingTop.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX}px;
        top: ${rect.top + scrollY}px;
        width: ${rect.width}px;
        height: ${padding.top}px;
        background: rgba(147, 197, 253, 0.7) !important;
        border: 2px solid #3b82f6 !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(paddingTop);
    }
    
    if (padding.bottom > 0) {
      const paddingBottom = document.createElement('div');
      paddingBottom.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX}px;
        top: ${rect.bottom + scrollY - padding.bottom}px;
        width: ${rect.width}px;
        height: ${padding.bottom}px;
        background: rgba(147, 197, 253, 0.7) !important;
        border: 2px solid #3b82f6 !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(paddingBottom);
    }
    
    if (padding.left > 0) {
      const paddingLeft = document.createElement('div');
      paddingLeft.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX}px;
        top: ${rect.top + scrollY + padding.top}px;
        width: ${padding.left}px;
        height: ${rect.height - padding.top - padding.bottom}px;
        background: rgba(147, 197, 253, 0.7) !important;
        border: 2px solid #3b82f6 !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(paddingLeft);
    }
    
    if (padding.right > 0) {
      const paddingRight = document.createElement('div');
      paddingRight.style.cssText = `
        position: absolute;
        left: ${rect.right + scrollX - padding.right}px;
        top: ${rect.top + scrollY + padding.top}px;
        width: ${padding.right}px;
        height: ${rect.height - padding.top - padding.bottom}px;
        background: rgba(147, 197, 253, 0.7) !important;
        border: 2px solid #3b82f6 !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(paddingRight);
    }
  }

  createMarginOverlay(rect, margin) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    if (margin.top > 0) {
      const marginTop = document.createElement('div');
      marginTop.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX}px;
        top: ${rect.top + scrollY - margin.top}px;
        width: ${rect.width}px;
        height: ${margin.top}px;
        background: rgba(251, 191, 36, 0.7) !important;
        border: 2px solid #f59e0b !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(marginTop);
    }
    
    if (margin.bottom > 0) {
      const marginBottom = document.createElement('div');
      marginBottom.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX}px;
        top: ${rect.bottom + scrollY}px;
        width: ${rect.width}px;
        height: ${margin.bottom}px;
        background: rgba(251, 191, 36, 0.7) !important;
        border: 2px solid #f59e0b !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(marginBottom);
    }
    
    if (margin.left > 0) {
      const marginLeft = document.createElement('div');
      marginLeft.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX - margin.left}px;
        top: ${rect.top + scrollY - margin.top}px;
        width: ${margin.left}px;
        height: ${rect.height + margin.top + margin.bottom}px;
        background: rgba(251, 191, 36, 0.7) !important;
        border: 2px solid #f59e0b !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(marginLeft);
    }
    
    if (margin.right > 0) {
      const marginRight = document.createElement('div');
      marginRight.style.cssText = `
        position: absolute;
        left: ${rect.right + scrollX}px;
        top: ${rect.top + scrollY - margin.top}px;
        width: ${margin.right}px;
        height: ${rect.height + margin.top + margin.bottom}px;
        background: rgba(251, 191, 36, 0.7) !important;
        border: 2px solid #f59e0b !important;
        box-sizing: border-box;
      `;
      this.spacingOverlay.appendChild(marginRight);
    }
  }

  createGapOverlay(element, styles) {
    const hasGap = styles.gap.gap > 0 || styles.gap.row > 0 || styles.gap.column > 0;
    if (!hasGap) return;
    
    const isFlexbox = styles.display === 'flex' || styles.display === 'inline-flex';
    const isGrid = styles.display === 'grid' || styles.display === 'inline-grid';
    
    if (!isFlexbox && !isGrid) return;
    
    const children = Array.from(element.children).filter(child => {
      const childStyle = window.getComputedStyle(child);
      return childStyle.display !== 'none' && child.offsetParent !== null;
    });
    
    if (children.length < 2) return;
    
    
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // 統一使用通用的間隙檢測算法
    this.createUniversalGapOverlay(children, styles, scrollX, scrollY);
  }
  
  createUniversalGapOverlay(children, styles, scrollX, scrollY) {
    const gaps = {
      row: styles.gap.row || styles.gap.gap || 0,
      column: styles.gap.column || styles.gap.gap || 0
    };
    
    
    // 獲取所有子元素的位置信息
    const childData = children.map(child => ({
      element: child,
      rect: child.getBoundingClientRect()
    }));
    
    // 按位置排序：先按 top，再按 left
    childData.sort((a, b) => {
      const topDiff = a.rect.top - b.rect.top;
      if (Math.abs(topDiff) < 5) {
        return a.rect.left - b.rect.left;
      }
      return topDiff;
    });
    
    
    // 檢測所有可能的間隙
    const detectedGaps = [];
    
    for (let i = 0; i < childData.length; i++) {
      for (let j = i + 1; j < childData.length; j++) {
        const rect1 = childData[i].rect;
        const rect2 = childData[j].rect;
        
        // 檢測水平間隙（兩個元素在同一行）
        const sameRow = Math.abs(rect1.top - rect2.top) < 10;
        if (sameRow && rect2.left > rect1.right) {
          const gapWidth = rect2.left - rect1.right;
          // 只要有間隙就顯示，不限制最大值
          if (gapWidth > 1) {
            detectedGaps.push({
              type: 'horizontal',
              left: rect1.right,
              top: Math.min(rect1.top, rect2.top),
              width: gapWidth,
              height: Math.max(rect1.height, rect2.height),
              gap: gapWidth
            });
          }
        }
        
        // 檢測垂直間隙（兩個元素在同一列或重疊列）
        const sameColumn = Math.abs(rect1.left - rect2.left) < 10 || 
                          (rect1.left < rect2.right && rect2.left < rect1.right);
        if (sameColumn && rect2.top > rect1.bottom) {
          const gapHeight = rect2.top - rect1.bottom;
          // 只要有間隙就顯示，不限制最大值
          if (gapHeight > 1) {
            detectedGaps.push({
              type: 'vertical',
              left: Math.min(rect1.left, rect2.left),
              top: rect1.bottom,
              width: Math.max(rect1.width, rect2.width),
              height: gapHeight,
              gap: gapHeight
            });
          }
        }
      }
    }
    
    // 去除重複的間隙
    const uniqueGaps = [];
    detectedGaps.forEach(gap => {
      const exists = uniqueGaps.find(existing => 
        Math.abs(existing.left - gap.left) < 2 && 
        Math.abs(existing.top - gap.top) < 2 &&
        existing.type === gap.type
      );
      if (!exists) {
        uniqueGaps.push(gap);
      }
    });
    
    
    // 如果沒有檢測到間隙，使用簡化的備用方法
    if (uniqueGaps.length === 0 && (gaps.row > 0 || gaps.column > 0)) {
      this.createFallbackGaps(childData, gaps, scrollX, scrollY);
      return;
    }
    
    // 創建間隙元素
    uniqueGaps.forEach((gap, index) => {
      if (gap.width > 0 && gap.height > 0) {
        const gapElement = document.createElement('div');
        gapElement.style.cssText = `
          position: absolute;
          left: ${gap.left + scrollX}px;
          top: ${gap.top + scrollY}px;
          width: ${gap.width}px;
          height: ${gap.height}px;
          background: rgba(16, 185, 129, 0.6) !important;
          border: 2px solid #10b981 !important;
          box-sizing: border-box;
        `;
        
        // 添加類型標籤以便除錯
        gapElement.setAttribute('data-gap-type', gap.type);
        gapElement.setAttribute('data-gap-size', gap.gap);
        
        this.spacingOverlay.appendChild(gapElement);
      }
    });
  }

  createFallbackGaps(childData, gaps, scrollX, scrollY) {
    
    // 簡單的相鄰元素檢測
    for (let i = 0; i < childData.length - 1; i++) {
      const current = childData[i].rect;
      const next = childData[i + 1].rect;
      
      // 水平相鄰
      if (Math.abs(current.top - next.top) < 15 && next.left > current.right) {
        const gapWidth = next.left - current.right;
        if (gapWidth > 2) {
          const gapElement = document.createElement('div');
          gapElement.style.cssText = `
            position: absolute;
            left: ${current.right + scrollX}px;
            top: ${current.top + scrollY}px;
            width: ${gapWidth}px;
            height: ${current.height}px;
            background: rgba(16, 185, 129, 0.6) !important;
            border: 2px solid #10b981 !important;
            box-sizing: border-box;
          `;
          this.spacingOverlay.appendChild(gapElement);
        }
      }
      
      // 垂直相鄰
      if (Math.abs(current.left - next.left) < 15 && next.top > current.bottom) {
        const gapHeight = next.top - current.bottom;
        if (gapHeight > 2) {
          const gapElement = document.createElement('div');
          gapElement.style.cssText = `
            position: absolute;
            left: ${current.left + scrollX}px;
            top: ${current.bottom + scrollY}px;
            width: ${current.width}px;
            height: ${gapHeight}px;
            background: rgba(16, 185, 129, 0.6) !important;
            border: 2px solid #10b981 !important;
            box-sizing: border-box;
          `;
          this.spacingOverlay.appendChild(gapElement);
        }
      }
    }
  }

  hideSpacingOverlay() {
    if (this.spacingOverlay) {
      this.spacingOverlay.style.display = 'none';
      this.spacingOverlay.innerHTML = '';
    }
  }

  showTooltip(element, x, y) {
    const styles = this.getElementStyles(element);
    const violations = this.checkViolations(styles);
    
    // Create a temporary div to safely encode the element name and class
    const headerDiv = document.createElement('div');
    headerDiv.textContent = `${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ').join('.') : ''}`;

    let content = `<div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">${headerDiv.innerHTML}</div>`;
    
    content += this.formatStyleInfo(styles);
    
    if (violations.length > 0) {
      content += `<div style="color: #f87171; margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
        <strong>⚠️ 規範問題:</strong><br>
        ${violations.map(v => `• ${v}`).join('<br>')}
      </div>`;
    }
    
    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    
    const rect = this.tooltip.getBoundingClientRect();
    const finalX = Math.min(x + 10, window.innerWidth - rect.width - 10);
    const finalY = Math.min(y + 10, window.innerHeight - rect.height - 10);
    
    this.tooltip.style.left = finalX + 'px';
    this.tooltip.style.top = finalY + 'px';
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  getElementStyles(element) {
    const computed = window.getComputedStyle(element);
    
    return {
      fontSize: parseFloat(computed.fontSize),
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      color: this.rgbToHex(computed.color),
      backgroundColor: this.rgbToHex(computed.backgroundColor),
      borderColor: this.rgbToHex(computed.borderColor),
      padding: {
        top: parseFloat(computed.paddingTop),
        right: parseFloat(computed.paddingRight),
        bottom: parseFloat(computed.paddingBottom),
        left: parseFloat(computed.paddingLeft)
      },
      margin: {
        top: parseFloat(computed.marginTop),
        right: parseFloat(computed.marginRight),
        bottom: parseFloat(computed.marginBottom),
        left: parseFloat(computed.marginLeft)
      },
      gap: {
        row: parseFloat(computed.rowGap) || 0,
        column: parseFloat(computed.columnGap) || 0,
        gap: parseFloat(computed.gap) || 0
      },
      display: computed.display,
      flexDirection: computed.flexDirection,
      gridTemplateColumns: computed.gridTemplateColumns,
      gridTemplateRows: computed.gridTemplateRows,
      border: computed.border,
      borderRadius: this.parseBorderRadius(computed.borderRadius),
      width: parseFloat(computed.width),
      height: parseFloat(computed.height)
    };
  }

  parseBorderRadius(borderRadiusStr) {
    if (!borderRadiusStr || borderRadiusStr === '0px') return 0;
    
    // 解析 border-radius，可能是單一值或多個值
    const values = borderRadiusStr.split(' ').map(v => parseFloat(v)).filter(v => !isNaN(v));
    
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    
    // 如果有多個值，返回最大值進行檢查
    return Math.max(...values);
  }

  parseLineHeight(lineHeightStr, fontSize) {
    if (!lineHeightStr || lineHeightStr === 'normal') {
      // 'normal' 通常是字體大小的 1.2 倍
      return Math.round(fontSize * 1.2);
    }
    
    if (lineHeightStr.endsWith('px')) {
      return parseFloat(lineHeightStr);
    }
    
    // 如果是數字（無單位），表示倍數
    const multiplier = parseFloat(lineHeightStr);
    if (!isNaN(multiplier)) {
      return Math.round(fontSize * multiplier);
    }
    
    // 其他情況返回字體大小作為預設值
    return fontSize;
  }

  formatStyleInfo(styles) {
    const hasGap = styles.gap.gap > 0 || styles.gap.row > 0 || styles.gap.column > 0;
    const gapInfo = hasGap ? `<div><span style="color: #9ca3af;">間隙:</span> <span style="color: #10b981;">■</span> ${styles.gap.gap > 0 ? styles.gap.gap + 'px' : `${styles.gap.row}px / ${styles.gap.column}px`}</div>` : '';
    
    return `
      <div><span style="color: #9ca3af;">字體:</span> ${styles.fontSize}px / ${styles.fontWeight} / ${styles.lineHeight}</div>
      <div><span style="color: #9ca3af;">顏色:</span> ${styles.color}</div>
      <div><span style="color: #9ca3af;">背景:</span> ${styles.backgroundColor}</div>
      <div><span style="color: #9ca3af;">邊框:</span> ${styles.borderColor}</div>
      <div><span style="color: #9ca3af;">內距:</span> <span style="color: #3b82f6;">■</span> ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px</div>
      <div><span style="color: #9ca3af;">外距:</span> <span style="color: #f59e0b;">■</span> ${styles.margin.top}px ${styles.margin.right}px ${styles.margin.bottom}px ${styles.margin.left}px</div>
      ${gapInfo}
      <div><span style="color: #9ca3af;">尺寸:</span> ${styles.width}px × ${styles.height}px</div>
      ${styles.borderRadius > 0 ? `<div><span style="color: #9ca3af;">圓角:</span> ${styles.borderRadius}px</div>` : ''}
    `;
  }

  checkViolations(styles) {
    const violations = [];
    
    // 檢查字體大小和行高
    if (this.specRules.fontSize && Array.isArray(this.specRules.fontSize)) {
      // 檢查新格式（包含 size 和 lineHeight 的物件）
      if (this.specRules.fontSize.length > 0 && typeof this.specRules.fontSize[0] === 'object' && this.specRules.fontSize[0].size) {
        
        // 檢查字體大小是否為整數
        if (styles.fontSize !== Math.floor(styles.fontSize)) {
          violations.push(`字體大小 ${styles.fontSize}px 不是整數，不符合規範`);
        } else {
          const fontSpec = this.specRules.fontSize.find(spec => spec.size === styles.fontSize);
          
          if (!fontSpec) {
            const allowedSizes = this.specRules.fontSize.map(spec => spec.size);
            violations.push(`字體大小 ${styles.fontSize}px 不在標準數值清單中 [${allowedSizes.join(', ')}]`);
          } else {
            // 檢查行高
            const actualLineHeight = this.parseLineHeight(styles.lineHeight, styles.fontSize);
            if (actualLineHeight !== fontSpec.lineHeight) {
              violations.push(`字體大小 ${styles.fontSize}px 的行高應為 ${fontSpec.lineHeight}px，實際為 ${actualLineHeight}px`);
            }
          }
        }
      } else {
        // 兼容舊的數字數組格式
        if (styles.fontSize !== Math.floor(styles.fontSize)) {
          violations.push(`字體大小 ${styles.fontSize}px 不是整數，不符合規範`);
        } else if (!this.specRules.fontSize.includes(styles.fontSize)) {
          violations.push(`字體大小 ${styles.fontSize}px 不在標準數值清單中 [${this.specRules.fontSize.join(', ')}]`);
        }
      }
    } else if (this.specRules.fontSize && typeof this.specRules.fontSize === 'object' && this.specRules.fontSize.min && this.specRules.fontSize.max) {
      // 兼容舊的 min/max 格式
      if (styles.fontSize !== Math.floor(styles.fontSize)) {
        violations.push(`字體大小 ${styles.fontSize}px 不是整數，不符合規範`);
      } else if (styles.fontSize < this.specRules.fontSize.min || styles.fontSize > this.specRules.fontSize.max) {
        violations.push(`字體大小 ${styles.fontSize}px 超出範圍 ${this.specRules.fontSize.min}-${this.specRules.fontSize.max}px`);
      }
    }
    
    // 檢查間距規範（內距、外距、gap）
    if (this.specRules.spacing && Array.isArray(this.specRules.spacing)) {
      const allowedSpacing = this.specRules.spacing;
      
      // 檢查內距
      Object.entries(styles.padding).forEach(([side, value]) => {
        if (value > 0 && !allowedSpacing.includes(value)) {
          violations.push(`內距 ${side} ${value}px 不在標準數值清單中 [${allowedSpacing.join(', ')}]`);
        }
      });
      
      // 檢查外距
      Object.entries(styles.margin).forEach(([side, value]) => {
        if (value > 0 && !allowedSpacing.includes(value)) {
          violations.push(`外距 ${side} ${value}px 不在標準數值清單中 [${allowedSpacing.join(', ')}]`);
        }
      });
      
      // 檢查 gap
      if (styles.gap) {
        if (styles.gap.gap > 0 && !allowedSpacing.includes(styles.gap.gap)) {
          violations.push(`Gap ${styles.gap.gap}px 不在標準數值清單中 [${allowedSpacing.join(', ')}]`);
        }
        if (styles.gap.row > 0 && !allowedSpacing.includes(styles.gap.row)) {
          violations.push(`Row gap ${styles.gap.row}px 不在標準數值清單中 [${allowedSpacing.join(', ')}]`);
        }
        if (styles.gap.column > 0 && !allowedSpacing.includes(styles.gap.column)) {
          violations.push(`Column gap ${styles.gap.column}px 不在標準數值清單中 [${allowedSpacing.join(', ')}]`);
        }
      }
    } else {
      // 兼容舊格式
      if (this.specRules.padding) {
        const maxPadding = Math.max(...Object.values(styles.padding));
        const minPadding = Math.min(...Object.values(styles.padding));
        if (maxPadding > this.specRules.padding.max) {
          violations.push(`內距 ${maxPadding}px 超出最大值 ${this.specRules.padding.max}px`);
        }
        if (minPadding < this.specRules.padding.min && minPadding > 0) {
          violations.push(`內距 ${minPadding}px 低於最小值 ${this.specRules.padding.min}px`);
        }
      }
      
      if (this.specRules.margin) {
        const maxMargin = Math.max(...Object.values(styles.margin));
        const minMargin = Math.min(...Object.values(styles.margin));
        if (maxMargin > this.specRules.margin.max) {
          violations.push(`外距 ${maxMargin}px 超出最大值 ${this.specRules.margin.max}px`);
        }
        if (minMargin < this.specRules.margin.min && minMargin > 0) {
          violations.push(`外距 ${minMargin}px 低於最小值 ${this.specRules.margin.min}px`);
        }
      }
    }
    
    // 檢查圓角規範
    if (this.specRules.borderRadius && Array.isArray(this.specRules.borderRadius)) {
      const allowedBorderRadius = this.specRules.borderRadius;
      if (styles.borderRadius > 0 && !allowedBorderRadius.includes(styles.borderRadius)) {
        violations.push(`圓角 ${styles.borderRadius}px 不在標準數值清單中 [${allowedBorderRadius.join(', ')}]`);
      }
    }
    
    // 檢查顏色規範
    if (this.specRules.colors && this.specRules.colors.length > 0) {
      const textColor = styles.color.toLowerCase();
      const bgColor = styles.backgroundColor.toLowerCase();
      const borderColor = styles.borderColor.toLowerCase();
      
      if (textColor !== 'transparent' && !this.specRules.colors.includes(textColor)) {
        violations.push(`文字顏色 ${textColor} 不在標準色彩清單中`);
      }
      
      if (bgColor !== 'transparent' && !this.specRules.colors.includes(bgColor)) {
        violations.push(`背景顏色 ${bgColor} 不在標準色彩清單中`);
      }
      
      if (borderColor !== 'transparent' && borderColor !== '#000000' && !this.specRules.colors.includes(borderColor)) {
        violations.push(`邊框顏色 ${borderColor} 不在標準色彩清單中`);
      }
    }
    
    return violations;
  }

  highlightElement(element) {
    this.removeHighlight();
    this.highlightedElement = element;
    element.style.outline = '2px solid #4f46e5';
    element.style.outlineOffset = '1px';
  }

  removeHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = '';
      this.highlightedElement.style.outlineOffset = '';
      this.highlightedElement = null;
    }
  }

  async scanPage() {
    const elements = document.querySelectorAll('*:not(script):not(style):not(meta):not(link):not(#specchecker-tooltip):not(#specchecker-spacing-overlay)');
    const issues = [];
    let checkedElements = 0;
    
    elements.forEach(element => {
      if (element.offsetParent !== null) {
        checkedElements++;
        const styles = this.getElementStyles(element);
        const violations = this.checkViolations(styles);
        
        if (violations.length > 0) {
          issues.push({
            element: this.getElementSelector(element),
            violations: violations,
            styles: styles
          });
        }
      }
    });
    
    this.scanResults = { checkedElements, issues };
    return this.scanResults;
  }

  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `${element.tagName.toLowerCase()}.${element.className.split(' ').join('.')}`;
    return element.tagName.toLowerCase();
  }

  showReport() {
    if (!this.scanResults) {
      this.showNotification('請先執行掃描');
      return;
    }
    
    // 使用 Blob 和 URL 替代不安全的 document.write
    const reportHTML = this.generateReportHTML();
    const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const reportWindow = window.open(url, '_blank', 'width=800,height=600');
    
    // 清理 URL 物件以釋放記憶體
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  generateReportHTML() {
    // HTML 轉義函數
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const checkedElements = parseInt(this.scanResults.checkedElements) || 0;
    const issuesCount = Array.isArray(this.scanResults.issues) ? this.scanResults.issues.length : 0;
    
    const issuesHTML = Array.isArray(this.scanResults.issues) 
      ? this.scanResults.issues.map(issue => {
          const elementText = escapeHtml(issue.element || '');
          const violationsHTML = Array.isArray(issue.violations)
            ? issue.violations.map(v => `<div class="violation">• ${escapeHtml(v)}</div>`).join('')
            : '';
          return `
            <div class="issue">
              <div class="issue-header">${elementText}</div>
              ${violationsHTML}
            </div>
          `;
        }).join('')
      : '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SpecChecker 檢查報告</title>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .summary { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
          .issue { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
          .issue-header { font-weight: 600; color: #dc2626; margin-bottom: 8px; }
          .violation { color: #7c2d12; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SpecChecker 檢查報告</h1>
          <p>檢查時間: ${escapeHtml(new Date().toLocaleString('zh-TW'))}</p>
        </div>
        
        <div class="summary">
          <h2>檢查摘要</h2>
          <p>已檢查元素: ${checkedElements} 個</p>
          <p>發現問題: ${issuesCount} 個</p>
        </div>
        
        <div class="issues">
          <h2>問題詳情</h2>
          ${issuesHTML}
        </div>
      </body>
      </html>
    `;
  }

  rgbToHex(rgb) {
    if (rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return 'transparent';
    
    const result = rgb.match(/\d+/g);
    if (!result) return rgb;
    
    return "#" + result.slice(0, 3).map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000000;
      background: #1f2937;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }


  async takeScreenshot() {
    try {
      this.showNotification('正在截圖...');
      
      // 使用 Chrome 擴充功能的截圖 API
      chrome.runtime.sendMessage({
        action: 'captureVisibleTab'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          this.showNotification('截圖失敗：' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.dataUrl) {
          // 使用下載 API 讓用戶選擇保存位置
          chrome.runtime.sendMessage({
            action: 'downloadScreenshot',
            dataUrl: response.dataUrl
          }, (downloadResponse) => {
            if (chrome.runtime.lastError) {
              console.error('Download error:', chrome.runtime.lastError);
              this.showNotification('下載失敗：' + chrome.runtime.lastError.message);
            } else if (downloadResponse && downloadResponse.success) {
              this.showNotification('截圖已下載！請選擇保存位置');
            } else if (downloadResponse && downloadResponse.error) {
              console.error('Download error:', downloadResponse.error);
              this.showNotification('下載失敗：' + downloadResponse.error);
            } else {
              this.showNotification('下載失敗：未知錯誤');
            }
          });
        } else if (response && response.error) {
          console.error('Background error:', response.error);
          this.showNotification('截圖失敗：' + response.error);
        } else {
          console.error('無效回應:', response);
          this.showNotification('截圖失敗：無法獲取圖像');
        }
      });
      
    } catch (error) {
      console.error('截圖失敗:', error);
      this.showNotification('截圖失敗: ' + error.message);
    }
  }
}

window.specCheckerActive = false;

window.addEventListener('load', () => {
  new SpecChecker();
  window.specCheckerActive = true;
});