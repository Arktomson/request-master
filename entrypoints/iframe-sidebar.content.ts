import { chromeLocalStorage } from '../utils';
import dayjs from 'dayjs';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  allFrames: false,

  main() {
    class IframeSidebar {
      private iframe: HTMLIFrameElement | null = null;
      private isVisible = false;
      private sidebarWidth = 800;
      private sidebarHeight = 400;
      private position: 'right' | 'bottom' = 'right';
      private zIndex = 999999;
      private isDragging = false;
      private initialX = 0;
      private initialY = 0;
      private initialWidth = 0;
      private initialHeight = 0;
      private minWidth = 400;
      private maxWidth = 1200;
      private minHeight = 300;
      private maxHeight = 900;
      private maxWidthPercent = 1;
      private maxHeightPercent = 1;

      constructor() {}

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
            paddingRight: '20px',
          };
        }
      }

      private getResizeHandleStyle() {
        const baseStyle = {
          position: 'absolute',
          backgroundColor: 'transparent',
          zIndex: (this.zIndex + 1).toString(),
        };

        if (this.position === 'right') {
          return { ...baseStyle, top: '0', left: '0', width: '5px', height: '100%', cursor: 'col-resize' };
        } else {
          return { ...baseStyle, top: '0', left: '0', width: '100%', height: '5px', cursor: 'row-resize' };
        }
      }

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
          return { ...baseStyle, top: '0px', left: '-20px', borderRadius: '50% 0 0 50%' };
        } else {
          return { ...baseStyle, top: '-20px', left: '0px', borderRadius: '50% 50% 0 0', zIndex: (this.zIndex + 2).toString(), boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.2)' };
        }
      }

      public async init() {
        const { sideBarLastVisible, sidebarPosition, sidebarHeight } = await chromeLocalStorage.get([
          'sideBarLastVisible', 'monitorEnabled', 'sidebarPosition', 'sidebarHeight'
        ]);

        if (sidebarPosition) this.position = sidebarPosition;
        if (sidebarHeight) this.sidebarHeight = sidebarHeight;
        if (sideBarLastVisible) this.toggle(true);
        this.setupListeners();
      }

      private async createSidebar() {
        if (document.getElementById('request-master-sidebar-container')) return;

        try {
          const savedWidth = await chromeLocalStorage.get('sidebarWidth');
          if (savedWidth && typeof savedWidth === 'number') this.sidebarWidth = savedWidth;
        } catch (error) {
          console.error('加载侧边栏宽度失败:', error);
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const effectiveMaxWidth = Math.min(this.maxWidth, screenWidth * this.maxWidthPercent);
        const effectiveMaxHeight = Math.min(this.maxHeight, screenHeight * this.maxHeightPercent);

        this.sidebarWidth = Math.max(this.minWidth, Math.min(effectiveMaxWidth, this.sidebarWidth));
        this.sidebarHeight = Math.max(this.minHeight, Math.min(effectiveMaxHeight, this.sidebarHeight));

        const container = document.createElement('div');
        container.id = 'request-master-sidebar-container';
        Object.assign(container.style, this.getContainerStyle());

        const resizeHandle = document.createElement('div');
        resizeHandle.id = 'request-master-sidebar-resize';
        Object.assign(resizeHandle.style, this.getResizeHandleStyle());
        resizeHandle.addEventListener('mousedown', this.handleResizeStart);

        this.iframe = document.createElement('iframe');
        this.iframe.id = 'request-master-sidebar-iframe';
        Object.assign(this.iframe.style, { width: '100%', height: '100%', border: 'none', background: '#ffffff' });
        this.iframe.src = browser.runtime.getURL('/sider.html');

        const closeBtn = document.createElement('div');
        closeBtn.id = 'request-master-sidebar-close';
        Object.assign(closeBtn.style, this.getCloseBtnStyle());
        closeBtn.textContent = '×';

        closeBtn.addEventListener('click', async () => {
          const sidebarIfCacheState = await chromeLocalStorage.get('sidebarIfCacheState');
          this.toggle(false, sidebarIfCacheState ? 'hide' : 'destroy');
        });

        container.appendChild(this.iframe);
        container.appendChild(closeBtn);
        container.appendChild(resizeHandle);
        document.body.appendChild(container);
      }

      private adjustPageLayout(show: boolean) {
        let targetElement: HTMLElement | null = null;
        const selectors = ['main', '#root', '#app', '.app', 'body > div:first-child', 'body > div:first-of-type'];

        for (const selector of selectors) {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && element.offsetHeight > 0) { targetElement = element; break; }
        }

        if (!targetElement) {
          const children = Array.from(document.body.children) as HTMLElement[];
          targetElement = children.find((child) => {
            const style = getComputedStyle(child);
            return style.display !== 'none' && style.visibility !== 'hidden' && child.offsetHeight > 0 && child.id !== 'request-master-sidebar-container';
          }) || null;
        }

        if (!targetElement) targetElement = document.body;

        if (show) {
          if (this.position === 'right') {
            targetElement.style.marginRight = `${this.sidebarWidth}px`;
            targetElement.style.transition = 'margin-right 0.3s ease';
            targetElement.style.marginBottom = '';
          } else {
            targetElement.style.marginBottom = `${this.sidebarHeight}px`;
            targetElement.style.transition = 'margin-bottom 0.3s ease';
            targetElement.style.marginRight = '';
          }
        } else {
          if (this.position === 'right') {
            targetElement.style.marginRight = '0';
            targetElement.style.transition = 'margin-right 0.3s ease';
          } else {
            targetElement.style.marginBottom = '0';
            targetElement.style.transition = 'margin-bottom 0.3s ease';
          }
        }
      }

      private handleResizeStart = (e: MouseEvent) => {
        e.preventDefault();
        this.isDragging = true;
        this.initialX = e.clientX;
        this.initialY = e.clientY;

        const container = document.getElementById('request-master-sidebar-container');
        if (container) {
          this.initialWidth = container.offsetWidth;
          this.initialHeight = container.offsetHeight;
        }

        document.addEventListener('mousemove', this.handleResizeMove);
        document.addEventListener('mouseup', this.handleResizeEnd);

        const overlay = document.createElement('div');
        overlay.id = 'request-master-sidebar-overlay';
        Object.assign(overlay.style, {
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          zIndex: (this.zIndex + 2).toString(),
          cursor: this.position === 'right' ? 'col-resize' : 'row-resize',
        });
        document.body.appendChild(overlay);
      };

      private handleResizeMove = (e: MouseEvent) => {
        if (!this.isDragging) return;
        const container = document.getElementById('request-master-sidebar-container');
        if (!container) return;

        if (this.position === 'right') {
          const deltaX = this.initialX - e.clientX;
          let newWidth = this.initialWidth + deltaX;
          const effectiveMaxWidth = Math.min(this.maxWidth, window.innerWidth * this.maxWidthPercent);
          newWidth = Math.max(this.minWidth, Math.min(effectiveMaxWidth, newWidth));
          container.style.width = `${newWidth}px`;
          this.sidebarWidth = newWidth;
        } else {
          const deltaY = this.initialY - e.clientY;
          let newHeight = this.initialHeight + deltaY;
          const effectiveMaxHeight = Math.min(this.maxHeight, window.innerHeight * this.maxHeightPercent);
          newHeight = Math.max(this.minHeight, Math.min(effectiveMaxHeight, newHeight));
          container.style.height = `${newHeight}px`;
          this.sidebarHeight = newHeight;
        }
        this.adjustPageLayout(true);
      };

      private handleResizeEnd = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleResizeMove);
        document.removeEventListener('mouseup', this.handleResizeEnd);

        const overlay = document.getElementById('request-master-sidebar-overlay');
        if (overlay) overlay.remove();

        if (this.position === 'right') {
          chromeLocalStorage.set({ sidebarWidth: this.sidebarWidth });
        } else {
          chromeLocalStorage.set({ sidebarHeight: this.sidebarHeight });
        }
      };

      private hideSidebar() {
        const container = document.getElementById('request-master-sidebar-container');
        if (container) {
          if (this.position === 'right') container.style.right = `-${this.sidebarWidth}px`;
          else container.style.bottom = `-${this.sidebarHeight}px`;
          this.adjustPageLayout(false);
        }
      }

      private destroySidebar() {
        const container = document.getElementById('request-master-sidebar-container');
        if (container) {
          this.adjustPageLayout(false);
          if (this.position === 'right') container.style.right = `-${this.sidebarWidth}px`;
          else container.style.bottom = `-${this.sidebarHeight}px`;

          setTimeout(() => {
            container.remove();
            this.iframe = null;
            const selectors = ['main', '#root', '#app', '.app', 'body > div:first-child', 'body > div:first-of-type'];
            for (const selector of selectors) {
              const element = document.querySelector(selector) as HTMLElement;
              if (element) { element.style.marginRight = ''; element.style.marginBottom = ''; element.style.transition = ''; }
            }
            document.body.style.marginRight = '';
            document.body.style.marginBottom = '';
            document.body.style.transition = '';
            window.removeEventListener('resize', this.handleWindowResize);
          }, 300);
        }
      }

      private showSidebar() {
        const container = document.getElementById('request-master-sidebar-container');
        if (container) {
          if (this.position === 'right') container.style.right = '0';
          else container.style.bottom = '0';
          this.adjustPageLayout(true);
        } else {
          this.createSidebar();
          this.adjustPageLayout(true);
        }
      }

      private setupListeners() {
        chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
          return new Promise(async (resolve): Promise<any> => {
            if (message.type === 'toggle_sidebar') {
              const sidebarIfCacheState = await chromeLocalStorage.get('sidebarIfCacheState');
              this.toggle(message.visible, sidebarIfCacheState ? 'hide' : 'destroy');
            } else if (message.type === 'toggle_sidebar_position') {
              this.togglePosition(message.data.position);
            }
            resolve({ success: true });
          });
        });
        window.addEventListener('resize', this.handleWindowResize);
      }

      private handleWindowResize = () => {
        if (!this.isVisible) return;
        const container = document.getElementById('request-master-sidebar-container');
        if (!container) return;

        if (this.position === 'right') {
          const effectiveMaxWidth = Math.min(this.maxWidth, window.innerWidth * this.maxWidthPercent);
          if (this.sidebarWidth > effectiveMaxWidth) {
            this.sidebarWidth = effectiveMaxWidth;
            container.style.width = `${this.sidebarWidth}px`;
            chromeLocalStorage.set({ sidebarWidth: this.sidebarWidth });
          }
        } else {
          const effectiveMaxHeight = Math.min(this.maxHeight, window.innerHeight * this.maxHeightPercent);
          if (this.sidebarHeight > effectiveMaxHeight) {
            this.sidebarHeight = effectiveMaxHeight;
            container.style.height = `${this.sidebarHeight}px`;
            chromeLocalStorage.set({ sidebarHeight: this.sidebarHeight });
          }
        }
      };

      public toggle(visible?: boolean, action: 'hide' | 'destroy' = 'destroy') {
        if (visible !== undefined) this.isVisible = visible;
        else this.isVisible = !this.isVisible;
        chromeLocalStorage.set({ sideBarLastVisible: this.isVisible });

        if (this.isVisible) this.showSidebar();
        else if (action === 'hide') this.hideSidebar();
        else this.destroySidebar();

        chrome.runtime.sendMessage({ type: 'sidebar_state_changed', data: { visible: this.isVisible } });
      }

      public togglePosition(position: 'right' | 'bottom') {
        const wasVisible = this.isVisible;
        this.position = position;
        chromeLocalStorage.set({ sidebarPosition: this.position });
        if (wasVisible) { this.destroySidebarSync(); this.showSidebar(); }
      }

      private destroySidebarSync() {
        const container = document.getElementById('request-master-sidebar-container');
        if (container) {
          this.adjustPageLayout(false);
          container.remove();
          this.iframe = null;
          const selectors = ['main', '#root', '#app', '.app', 'body > div:first-child', 'body > div:first-of-type'];
          for (const selector of selectors) {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) { element.style.marginRight = ''; element.style.marginBottom = ''; element.style.transition = ''; }
          }
          document.body.style.marginRight = '';
          document.body.style.marginBottom = '';
          document.body.style.transition = '';
        }
      }
    }

    console.log('iframeSidebar执行', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
    const iframeSidebar = new IframeSidebar();
    iframeSidebar.init();
  },
});
