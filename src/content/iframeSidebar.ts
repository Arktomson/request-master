import { chromeLocalStorage } from "@/utils";

class IframeSidebar {
  private iframe: HTMLIFrameElement | null = null;
  private isVisible = false;
  private sidebarWidth = 800; // 默认侧边栏宽度调整为800px
  private zIndex = 999999; // 确保在页面最前面
  private isDragging = false;
  private initialX = 0;
  private initialWidth = 0;
  private minWidth = 400; // 最小宽度
  private maxWidth = 1200; // 最大宽度，提高到1200px
  private maxWidthPercent = 0.75; // 最大宽度不超过屏幕宽度的65%

  constructor() {
    this.setupListeners();
  }

  public async init() {
    const sideBarLastVisible = await chromeLocalStorage.get(
      "sideBarLastVisible"
    );
    if (sideBarLastVisible) {
      this.toggle(true);
    }
  }

  private async createSidebar() {
    console.log("创建侧边栏");
    // 检查是否已经初始化过
    if (document.getElementById("request-cache-sidebar-container")) {
      return;
    }

    // 尝试从存储中加载之前保存的宽度
    try {
      const savedWidth = await chromeLocalStorage.get("sidebarWidth");
      if (savedWidth && typeof savedWidth === "number") {
        this.sidebarWidth = savedWidth;
      }
    } catch (error) {
      console.error("加载侧边栏宽度失败:", error);
    }

    // 应用屏幕宽度百分比限制
    const screenWidth = window.innerWidth;
    const maxWidthByPercent = screenWidth * this.maxWidthPercent;
    const effectiveMaxWidth = Math.min(this.maxWidth, maxWidthByPercent);

    // 确保侧边栏宽度在允许范围内
    this.sidebarWidth = Math.max(
      this.minWidth,
      Math.min(effectiveMaxWidth, this.sidebarWidth)
    );

    // 创建iframe容器
    const container = document.createElement("div");
    container.id = "request-cache-sidebar-container";
    Object.assign(container.style, {
      position: "fixed",
      top: "0",
      right: "0",
      width: `${this.sidebarWidth}px`,
      height: "100vh",
      zIndex: this.zIndex.toString(),
      transition: "right 0.3s ease",
      boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.15)",
      background: "#ffffff",
    });

    // 创建调整宽度的拖动条
    const resizeHandle = document.createElement("div");
    resizeHandle.id = "request-cache-sidebar-resize";
    Object.assign(resizeHandle.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "5px",
      height: "100%",
      cursor: "col-resize",
      backgroundColor: "transparent",
      zIndex: (this.zIndex + 1).toString(),
    });

    // 添加拖动事件
    resizeHandle.addEventListener("mousedown", this.handleResizeStart);

    // 创建iframe
    this.iframe = document.createElement("iframe");
    this.iframe.id = "request-cache-sidebar-iframe";
    Object.assign(this.iframe.style, {
      width: "100%",
      height: "100%",
      border: "none",
      background: "#ffffff",
    });

    // 设置iframe源 - 使用扩展的sidebar页面
    const chrome = window.chrome;
    this.iframe.src = chrome.runtime.getURL("src/sidebar/index.html");

    // 添加一个关闭按钮
    const closeBtn = document.createElement("div");
    closeBtn.id = "request-cache-sidebar-close";
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "0px",
      left: "-20px",
      width: "20px",
      height: "20px",
      background: "#333",
      color: "#fff",
      textAlign: "center",
      lineHeight: "20px",
      cursor: "pointer",
      borderRadius: "50% 0 0 50%",
    });
    closeBtn.textContent = "×";

    closeBtn.addEventListener("click", async () => {
      const sidebarIfCacheState = await chromeLocalStorage.get(
        "sidebarIfCacheState"
      );
      this.toggle(false, sidebarIfCacheState ? "hide" : "destroy");
    });

    // 添加元素到页面
    container.appendChild(this.iframe);
    container.appendChild(closeBtn);
    container.appendChild(resizeHandle);
    document.body.appendChild(container);
  }

  // 开始拖动调整大小
  private handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    this.isDragging = true;
    this.initialX = e.clientX;

    const container = document.getElementById(
      "request-cache-sidebar-container"
    );
    if (container) {
      this.initialWidth = container.offsetWidth;
    }

    // 添加全局事件处理
    document.addEventListener("mousemove", this.handleResizeMove);
    document.addEventListener("mouseup", this.handleResizeEnd);

    // 添加覆盖层防止iframe捕获鼠标事件
    const overlay = document.createElement("div");
    overlay.id = "request-cache-sidebar-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: (this.zIndex + 2).toString(),
      cursor: "col-resize",
    });
    document.body.appendChild(overlay);
  };

  // 处理拖动过程
  private handleResizeMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const container = document.getElementById(
      "request-cache-sidebar-container"
    );
    if (!container) return;

    // 计算宽度变化，向左拖动为负值(增加宽度)，向右拖动为正值(减小宽度)
    const offsetX = this.initialX - e.clientX;
    let newWidth = this.initialWidth + offsetX;

    // 基于屏幕宽度的限制
    const screenWidth = window.innerWidth;
    const maxWidthByPercent = screenWidth * this.maxWidthPercent;

    // 取绝对最大宽度和相对最大宽度中较小的一个
    const effectiveMaxWidth = Math.min(this.maxWidth, maxWidthByPercent);

    // 限制最小和最大宽度
    newWidth = Math.max(this.minWidth, Math.min(effectiveMaxWidth, newWidth));

    container.style.width = `${newWidth}px`;
    this.sidebarWidth = newWidth;
  };

  // 结束拖动
  private handleResizeEnd = () => {
    this.isDragging = false;

    // 移除全局事件监听
    document.removeEventListener("mousemove", this.handleResizeMove);
    document.removeEventListener("mouseup", this.handleResizeEnd);

    // 移除覆盖层
    const overlay = document.getElementById("request-cache-sidebar-overlay");
    if (overlay) {
      overlay.remove();
    }

    // 保存新的宽度设置
    chromeLocalStorage.set({ sidebarWidth: this.sidebarWidth });
  };

  private hideSidebar() {
    console.log("隐藏侧边栏");
    const container = document.getElementById(
      "request-cache-sidebar-container"
    );
    if (container) {
      container.style.right = `-${this.sidebarWidth}px`;
    }
  }

  private destroySidebar() {
    console.log("销毁侧边栏");
    const container = document.getElementById(
      "request-cache-sidebar-container"
    );
    if (container) {
      // 先添加过渡动画
      container.style.right = `-${this.sidebarWidth}px`;

      // 等待过渡动画完成后移除DOM元素
      setTimeout(() => {
        container.remove();
        this.iframe = null;

        // 移除窗口大小变化的监听器
        window.removeEventListener("resize", this.handleWindowResize);
      }, 300); // 与CSS过渡时间相匹配
    }
  }

  private showSidebar() {
    console.log("显示侧边栏");
    const container = document.getElementById(
      "request-cache-sidebar-container"
    );
    if (container) {
      container.style.right = "0";
    } else {
      this.createSidebar();
    }
  }

  private setupListeners() {
    // 监听来自后台或其他地方的消息
    chrome.runtime.onMessage.addListener(
      async (message, sender, sendResponse) => {
        if (message.type === "toggle_sidebar") {
          // 根据操作类型决定是隐藏还是销毁
          const sidebarIfCacheState = await chromeLocalStorage.get(
            "sidebarIfCacheState"
          );
          this.toggle(
            message.visible,
            sidebarIfCacheState ? "hide" : "destroy"
          );
          sendResponse({ success: true });
        }
        return true;
      }
    );

    // 监听窗口大小变化
    window.addEventListener("resize", this.handleWindowResize);
  }

  // 处理窗口大小变化
  private handleWindowResize = () => {
    if (!this.isVisible) return;

    const container = document.getElementById(
      "request-cache-sidebar-container"
    );
    if (!container) return;

    // 计算基于新窗口大小的最大宽度
    const screenWidth = window.innerWidth;
    const maxWidthByPercent = screenWidth * this.maxWidthPercent;
    const effectiveMaxWidth = Math.min(this.maxWidth, maxWidthByPercent);

    // 如果当前宽度超出新的最大宽度，则调整
    if (this.sidebarWidth > effectiveMaxWidth) {
      this.sidebarWidth = effectiveMaxWidth;
      container.style.width = `${this.sidebarWidth}px`;

      // 保存新的宽度设置
      chromeLocalStorage.set({ sidebarWidth: this.sidebarWidth });
    }
  };

  public toggle(visible?: boolean, action: "hide" | "destroy" = "destroy") {
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
      if (action === "hide") {
        this.hideSidebar();
      } else {
        this.destroySidebar();
      }
    }

    // 通知状态更改
    chrome.runtime.sendMessage({
      type: "sidebar_state_changed",
      data: {
        visible: this.isVisible,
      },
    });
  }
}

// 实例化侧边栏管理器
new IframeSidebar().init();

console.log("HTTP缓存-侧边栏管理器已初始化");
