import { chromeLocalStorage } from '@/utils';
import dayjs from 'dayjs';

class IframeSidebar {
  private iframe: HTMLIFrameElement | null = null;
  private isVisible = false;
  private sidebarWidth = 800; // 默认侧边栏宽度调整为800px
  private sidebarHeight = 400; // 默认侧边栏高度
  private position: 'right' | 'bottom' = 'right'; // 侧边栏位置
  private zIndex = 999999; // 确保在页面最前面
  private isDragging = false;
  private initialX = 0;
  private initialY = 0;
  private initialWidth = 0;
  private initialHeight = 0;
  private minWidth = 400; // 最小宽度
  private maxWidth = 1200; // 最大宽度，提高到1200px
  private minHeight = 300; // 最小高度
  private maxHeight = 900; // 最大高度
  private maxWidthPercent = 1; // 最大宽度不超过屏幕宽度的65%
  private maxHeightPercent = 1; // 最大高度不超过屏幕高度的60%

  constructor() {}

  // 根据位置获取容器样式
  private getContainerStyle() {
    const baseStyle = {
      position: 'fixed',
      zIndex: this.zIndex.toString(),
      background: '#ffffff',
    };

    if (this.position === 'right') {
      return {
        ...baseStyle,
        top: '0',
        right: '0',
        width: `${this.sidebarWidth}px`,
        height: '100vh',
        transition: 'right 0.3s ease',
        boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.15)',
      };
    } else {
      return {
        ...baseStyle,
        bottom: '0',
        left: '0',
        width: '100vw',
        height: `${this.sidebarHeight}px`,
        transition: 'bottom 0.3s ease',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.15)',
        paddingRight: '20px', // 为滚动条留出空间
      };
    }
  }

  // 根据位置获取拖动条样式
  private getResizeHandleStyle() {
    const baseStyle = {
      position: 'absolute',
      backgroundColor: 'transparent',
      zIndex: (this.zIndex + 1).toString(),
    };

    if (this.position === 'right') {
      return {
        ...baseStyle,
        top: '0',
        left: '0',
        width: '5px',
        height: '100%',
        cursor: 'col-resize',
      };
    } else {
      return {
        ...baseStyle,
        top: '0',
        left: '0',
        width: '100%',
        height: '5px',
        cursor: 'row-resize',
      };
    }
  }

  // 根据位置获取关闭按钮样式
  private getCloseBtnStyle() {
    const baseStyle = {
      position: 'absolute',
      width: '20px',
      height: '20px',
      background: '#333',
      color: '#fff',
      textAlign: 'center',
      lineHeight: '20px',
      cursor: 'pointer',
    };

    if (this.position === 'right') {
      return {
        ...baseStyle,
        top: '0px',
        left: '-20px',
        borderRadius: '50% 0 0 50%',
      };
    } else {
      return {
        ...baseStyle,
        top: '-20px',
        right: '30px',
        borderRadius: '50% 50% 0 0',
        zIndex: (this.zIndex + 2).toString(),
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.2)',
      };
    }
  }

  public async init() {
    const { sideBarLastVisible, sidebarPosition, sidebarHeight } = await chromeLocalStorage.get(
      ['sideBarLastVisible', 'monitorEnabled', 'sidebarPosition', 'sidebarHeight']
    );

    if (sidebarPosition) {
      this.position = sidebarPosition;
    }
    if (sidebarHeight) {
      this.sidebarHeight = sidebarHeight;
    }

    if (sideBarLastVisible) {
      this.toggle(true);
    }
    this.setupListeners();
  }

  private async createSidebar() {
    // 检查是否已经初始化过
    if (document.getElementById('request-master-sidebar-container')) {
      return;
    }

    // 尝试从存储中加载之前保存的宽度和高度
    try {
      const savedWidth = await chromeLocalStorage.get('sidebarWidth');
      if (savedWidth && typeof savedWidth === 'number') {
        this.sidebarWidth = savedWidth;
      }
    } catch (error) {
      console.error('加载侧边栏宽度失败:', error);
    }

    // 应用屏幕尺寸百分比限制
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const maxWidthByPercent = screenWidth * this.maxWidthPercent;
    const maxHeightByPercent = screenHeight * this.maxHeightPercent;
    const effectiveMaxWidth = Math.min(this.maxWidth, maxWidthByPercent);
    const effectiveMaxHeight = Math.min(this.maxHeight, maxHeightByPercent);

    // 确保侧边栏尺寸在允许范围内
    this.sidebarWidth = Math.max(
      this.minWidth,
      Math.min(effectiveMaxWidth, this.sidebarWidth)
    );
    this.sidebarHeight = Math.max(
      this.minHeight,
      Math.min(effectiveMaxHeight, this.sidebarHeight)
    );

    // 创建iframe容器
    const container = document.createElement('div');
    container.id = 'request-master-sidebar-container';
    
    // 根据位置设置不同的样式
    const containerStyle = this.getContainerStyle();
    Object.assign(container.style, containerStyle);

    // 创建调整尺寸的拖动条
    const resizeHandle = document.createElement('div');
    resizeHandle.id = 'request-master-sidebar-resize';
    
    // 根据位置设置不同的拖动条样式
    const resizeHandleStyle = this.getResizeHandleStyle();
    Object.assign(resizeHandle.style, resizeHandleStyle);

    // 添加拖动事件
    resizeHandle.addEventListener('mousedown', this.handleResizeStart);

    // 创建iframe
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'request-master-sidebar-iframe';
    Object.assign(this.iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      background: '#ffffff',
    });

    // 设置iframe源 - 使用扩展的sidebar页面
    const chrome = window.chrome;
    this.iframe.src = chrome.runtime.getURL('src/mockPanel/index.html');

    // 添加一个关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.id = 'request-master-sidebar-close';
    
    // 根据位置设置不同的关闭按钮样式
    const closeBtnStyle = this.getCloseBtnStyle();
    Object.assign(closeBtn.style, closeBtnStyle);
    closeBtn.textContent = '×';

    closeBtn.addEventListener('click', async () => {
      const sidebarIfCacheState = await chromeLocalStorage.get(
        'sidebarIfCacheState'
      );
      this.toggle(false, sidebarIfCacheState ? 'hide' : 'destroy');
    });

    // 添加元素到页面
    container.appendChild(this.iframe);
    container.appendChild(closeBtn);
    container.appendChild(resizeHandle);
    document.body.appendChild(container);
  }

  // 调整页面布局为侧边栏让出空间（智能查找主要内容容器）
  private adjustPageLayout(show: boolean) {
    // 查找页面主要内容容器，优先级顺序：
    // 1. 常见的主要内容容器选择器
    // 2. body的第一个可见块级元素
    // 3. 直接使用body
    let targetElement: HTMLElement | null = null;
    
    // 尝试常见的主要内容容器选择器
    const selectors = [
      'main',
      '#root',
      '#app', 
      '.app',
      'body > div:first-child',
      'body > div:first-of-type'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetHeight > 0) {
        targetElement = element;
        break;
      }
    }
    
    // 如果没找到，使用body的第一个可见块级元素
    if (!targetElement) {
      const children = Array.from(document.body.children) as HTMLElement[];
      targetElement = children.find(child => {
        const style = getComputedStyle(child);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' &&
               child.offsetHeight > 0 &&
               child.id !== 'request-master-sidebar-container';
      }) || null;
    }
    
    // 最后回退到body
    if (!targetElement) {
      targetElement = document.body;
    }
    
    console.log('找到目标元素:', targetElement.tagName, targetElement.id || targetElement.className);
    
    if (show) {
      // 根据位置为侧边栏让出空间
      if (this.position === 'right') {
        targetElement.style.marginRight = `${this.sidebarWidth}px`;
        targetElement.style.transition = 'margin-right 0.3s ease';
        // 清除可能的底部边距
        targetElement.style.marginBottom = '';
      } else {
        targetElement.style.marginBottom = `${this.sidebarHeight}px`;
        targetElement.style.transition = 'margin-bottom 0.3s ease';
        // 清除可能的右边距
        targetElement.style.marginRight = '';
      }
    } else {
      // 隐藏时恢复
      if (this.position === 'right') {
        targetElement.style.marginRight = '0';
        targetElement.style.transition = 'margin-right 0.3s ease';
      } else {
        targetElement.style.marginBottom = '0';
        targetElement.style.transition = 'margin-bottom 0.3s ease';
      }
    }
  }

  // 开始拖动调整大小
  private handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    this.isDragging = true;
    this.initialX = e.clientX;
    this.initialY = e.clientY;

    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (container) {
      this.initialWidth = container.offsetWidth;
      this.initialHeight = container.offsetHeight;
    }

    // 添加全局事件处理
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);

    // 添加覆盖层防止iframe捕获鼠标事件
    const overlay = document.createElement('div');
    overlay.id = 'request-master-sidebar-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: (this.zIndex + 2).toString(),
      cursor: this.position === 'right' ? 'col-resize' : 'row-resize',
    });
    document.body.appendChild(overlay);
  };

  // 处理拖动过程
  private handleResizeMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (!container) return;

    if (this.position === 'right') {
      // 右侧位置：计算新宽度
      const deltaX = this.initialX - e.clientX;
      let newWidth = this.initialWidth + deltaX;

      // 基于屏幕宽度的限制
      const screenWidth = window.innerWidth;
      const maxWidthByPercent = screenWidth * this.maxWidthPercent;
      const effectiveMaxWidth = Math.min(this.maxWidth, maxWidthByPercent);

      // 限制最小和最大宽度
      newWidth = Math.max(this.minWidth, Math.min(effectiveMaxWidth, newWidth));

      // 更新容器宽度
      container.style.width = `${newWidth}px`;
      this.sidebarWidth = newWidth;
    } else {
      // 底部位置：计算新高度
      const deltaY = this.initialY - e.clientY;
      let newHeight = this.initialHeight + deltaY;

      // 基于屏幕高度的限制
      const screenHeight = window.innerHeight;
      const maxHeightByPercent = screenHeight * this.maxHeightPercent;
      const effectiveMaxHeight = Math.min(this.maxHeight, maxHeightByPercent);

      // 限制最小和最大高度
      newHeight = Math.max(this.minHeight, Math.min(effectiveMaxHeight, newHeight));

      // 更新容器高度
      container.style.height = `${newHeight}px`;
      this.sidebarHeight = newHeight;
    }
    
    // 实时调整页面布局
    this.adjustPageLayout(true);
  };

  // 结束拖动
  private handleResizeEnd = () => {
    this.isDragging = false;

    // 移除全局事件监听
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);

    // 移除覆盖层
    const overlay = document.getElementById('request-master-sidebar-overlay');
    if (overlay) {
      overlay.remove();
    }

    // 保存新的尺寸设置
    if (this.position === 'right') {
      chromeLocalStorage.set({ sidebarWidth: this.sidebarWidth });
    } else {
      chromeLocalStorage.set({ sidebarHeight: this.sidebarHeight });
    }
  };

  private hideSidebar() {
    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (container) {
      if (this.position === 'right') {
        container.style.right = `-${this.sidebarWidth}px`;
      } else {
        container.style.bottom = `-${this.sidebarHeight}px`;
      }
      // 隐藏时恢复页面布局
      this.adjustPageLayout(false);
    }
  }

  private destroySidebar() {
    console.log('销毁侧边栏')
    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (container) {
      // 先恢复页面布局
      this.adjustPageLayout(false);
      // 添加过渡动画
      if (this.position === 'right') {
        container.style.right = `-${this.sidebarWidth}px`;
      } else {
        container.style.bottom = `-${this.sidebarHeight}px`;
      }

      // 等待过渡动画完成后移除DOM元素
      setTimeout(() => {
        container.remove();
        this.iframe = null;
        // 清理可能的页面布局调整
        const selectors = [
          'main',
          '#root',
          '#app', 
          '.app',
          'body > div:first-child',
          'body > div:first-of-type'
        ];
        
        // 清理所有可能的目标元素
        for (const selector of selectors) {
          const element = document.querySelector(selector) as HTMLElement;
          if (element) {
            element.style.marginRight = '';
            element.style.marginBottom = '';
            element.style.transition = '';
          }
        }
        
        // 也清理body本身
        document.body.style.marginRight = '';
        document.body.style.marginBottom = '';
        document.body.style.transition = '';

        // 移除窗口大小变化的监听器
        window.removeEventListener('resize', this.handleWindowResize);
      }, 300); // 与CSS过渡时间相匹配
    }
  }

  private showSidebar() {
    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (container) {
      if (this.position === 'right') {
        container.style.right = '0';
      } else {
        container.style.bottom = '0';
      }
      // 显示时调整页面布局，为侧边栏让出空间
      this.adjustPageLayout(true);
    } else {
      this.createSidebar();
      // 创建后立即调整页面布局
      this.adjustPageLayout(true);
    }
  }

  private setupListeners() {
    // 监听来自后台或其他地方的消息
    chrome.runtime.onMessage.addListener(
      (message, sender, sendResponse) => {
        return new Promise(async (resolve): Promise<any> => {
          if (message.type === 'toggle_sidebar') {
            // 根据操作类型决定是隐藏还是销毁
            const sidebarIfCacheState = await chromeLocalStorage.get(
              'sidebarIfCacheState'
            );
            this.toggle(
              message.visible,
              sidebarIfCacheState ? 'hide' : 'destroy'
            );
          } else if (message.type === 'toggle_sidebar_position') {
            console.log('toggle_sidebar_position', message.data.position)
            this.togglePosition(message.data.position);
          }
          resolve({ success: true });
        });
      }
    );

    // 监听窗口大小变化
    window.addEventListener('resize', this.handleWindowResize);
  }

  // 处理窗口大小变化
  private handleWindowResize = () => {
    if (!this.isVisible) return;

    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (!container) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (this.position === 'right') {
      // 计算基于新窗口大小的最大宽度
      const maxWidthByPercent = screenWidth * this.maxWidthPercent;
      const effectiveMaxWidth = Math.min(this.maxWidth, maxWidthByPercent);

      // 如果当前宽度超出新的最大宽度，则调整
      if (this.sidebarWidth > effectiveMaxWidth) {
        this.sidebarWidth = effectiveMaxWidth;
        container.style.width = `${this.sidebarWidth}px`;

        // 保存新的宽度设置
        chromeLocalStorage.set({ sidebarWidth: this.sidebarWidth });
      }
    } else {
      // 计算基于新窗口大小的最大高度
      const maxHeightByPercent = screenHeight * this.maxHeightPercent;
      const effectiveMaxHeight = Math.min(this.maxHeight, maxHeightByPercent);

      // 如果当前高度超出新的最大高度，则调整
      if (this.sidebarHeight > effectiveMaxHeight) {
        this.sidebarHeight = effectiveMaxHeight;
        container.style.height = `${this.sidebarHeight}px`;

        // 保存新的高度设置
        chromeLocalStorage.set({ sidebarHeight: this.sidebarHeight });
      }
    }
  };

  public toggle(visible?: boolean, action: 'hide' | 'destroy' = 'destroy') {
    // 如果传入了具体状态，就使用它，否则切换当前状态
    if (visible !== undefined) {
      this.isVisible = visible;
    } else {
      this.isVisible = !this.isVisible;
    }
    chromeLocalStorage.set({ sideBarLastVisible: this.isVisible });

    if (this.isVisible) {
      this.showSidebar();
    } else {
      // 根据指定的action决定是隐藏还是销毁
      if (action === 'hide') {
        this.hideSidebar();
      } else {
        this.destroySidebar();
      }
    }

    // 通知状态更改
    chrome.runtime.sendMessage({
      type: 'sidebar_state_changed',
      data: {
        visible: this.isVisible,
      },
    });
  }

  // 切换侧边栏位置
  public togglePosition(position: 'right' | 'bottom') {
    const wasVisible = this.isVisible;
    
    // 切换位置
    this.position = position;
    
    // 保存新位置
    chromeLocalStorage.set({ sidebarPosition: this.position });
    
    // 如果当前可见，需要重新创建侧边栏
    if (wasVisible) {
      // 先销毁现有的侧边栏
      this.destroySidebarSync();
      // 立即创建新的侧边栏
      this.showSidebar();
    }
  }

  // 同步销毁侧边栏（不等待动画）
  private destroySidebarSync() {
    console.log('同步销毁侧边栏');
    const container = document.getElementById(
      'request-master-sidebar-container'
    );
    if (container) {
      // 先恢复页面布局
      this.adjustPageLayout(false);
      
      // 立即移除DOM元素，不等待动画
      container.remove();
      this.iframe = null;
      
      // 清理可能的页面布局调整
      const selectors = [
        'main',
        '#root',
        '#app', 
        '.app',
        'body > div:first-child',
        'body > div:first-of-type'
      ];
      
      // 清理所有可能的目标元素
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          element.style.marginRight = '';
          element.style.marginBottom = '';
          element.style.transition = '';
        }
      }
      
      // 也清理body本身
      document.body.style.marginRight = '';
      document.body.style.marginBottom = '';
      document.body.style.transition = '';
    }
  }
}
console.log('iframeSidebar执行', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));

// 实例化侧边栏管理器
export const iframeSidebar = new IframeSidebar();
iframeSidebar.init();


