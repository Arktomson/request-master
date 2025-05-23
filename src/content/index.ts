import { chromeLocalStorage } from "@/utils";
import { initMockInterceptor } from "./mock-interceptor";

// 内容脚本，在匹配的页面上运行
console.log("HTTP缓存-ContentScript已加载");

// 注入脚本到页面

async function whetherToInject() {
  const curOrigin = window.location.origin;
  const { allowToInjectOrigin, disasterRecoveryProcessing } =
    await chromeLocalStorage.getAll();

  return (
    allowToInjectOrigin.some(
      ({
        type,
        domain,
      }: {
        type: "regex" | "fully" | "include";
        domain: string;
      }) => {
        if (type === "fully") {
          return domain === curOrigin;
        } else if (type === "include") {
          return curOrigin.includes(domain);
        } else {
          return new RegExp(domain).test(curOrigin);
        }
      }
    ) && disasterRecoveryProcessing
  );
}

// 添加保持Service Worker活跃的连接管理
function setupKeepAliveConnection() {
  let port: chrome.runtime.Port;

  function connect() {
    try {
      port = chrome.runtime.connect({ name: "keepAlive" });
      console.log("已建立与background的保活连接");
      
      port.onDisconnect.addListener(() => {
        console.log("连接已断开，正在重新连接...");
        // 连接断开后立即重新连接
        connect();
      });
    } catch (error) {
      console.error("连接建立失败:", error);
      // 出错时等待一小段时间后重试
      setTimeout(connect, 1000);
    }
  }
  
  // 初始建立连接
  connect();
}

async function injectScriptToPage() {
  const isPass = await whetherToInject();
  if (!isPass) {
    return;
  }
  try {
    // 获取注入脚本的URL
    const scriptUrl = chrome.runtime.getURL("ajaxHook.js");
    console.log("注入脚本URL:", scriptUrl);
    // 创建并注入脚本
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.type = "module";
    // 同步执行
    script.async = true;

    (document.head || document.documentElement).appendChild(script);
    // 脚本加载后发送配置
    script.addEventListener("load", async () => {
      const result = await chromeLocalStorage.getAll();

      // 获取当前域名下的缓存数据

      window.dispatchEvent(
        new CustomEvent("content_to_ajaxHook", {
          detail: {
            type: "init",
            message: result,
          },
        })
      );
      handleEvent();
    });
  } catch (error) {
    console.error("注入脚本加载失败:", error);
  }
}

async function handleEvent() {
  let hitCount = 0;
  chrome.runtime.sendMessage({
    type: "clear_cache",
  });
  window.addEventListener("ajaxHook_to_content", async (event: any) => {
    const { type, message } = event.detail;
    console.log("收到事件:", type, message);

    if (type === "cache_hit") {
      hitCount++;

      // 使用正确的API - chrome.action 而不是 chrome.browserAction
      chrome.runtime.sendMessage({
        type: "update_badge",
        count: hitCount,
        curCacheData: message,
      });
    }
  });
}

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  console.log("收到事件:", message);
  if(message.type === "update_request_cache_data"){
    const { cacheKey, cacheResponse, cacheReqParams } = message.data;
    const requestCacheData = localStorage.getItem("request_cache_data")
    if(requestCacheData){
      try {
        const requestCacheDataObj = JSON.parse(requestCacheData);
        requestCacheDataObj[cacheKey] = {
          cacheResponse: cacheResponse,
          cacheReqParams: cacheReqParams,
        };
        localStorage.setItem("request_cache_data", JSON.stringify(requestCacheDataObj));
        console.log("requestCacheDataObj after save", requestCacheDataObj);
        sendResponse({ success: true });
      } catch (error) {
        console.error("更新缓存数据失败:", error);
        sendResponse({ success: false, error: String(error) });
      }
    } else {
      sendResponse({ success: false, error: "没有找到缓存数据" });
    }
  }
  return true;
});

async function main() {
  await injectScriptToPage();
  // 启动保活连接
  // setupKeepAliveConnection();
  
  // 初始化Mock拦截器
  const mockEnabled = await chromeLocalStorage.get('mockEnabled');
  if (mockEnabled) {
    // 只有在Mock功能启用时才初始化拦截器
    initMockInterceptor();
  }
  
  // 监听Mock状态变化
  chromeLocalStorage.onChange((changes: any) => {
    if (changes.mockEnabled) {
      if (changes.mockEnabled.newValue === true) {
        initMockInterceptor();
        console.log("[Mock] Mock功能已启用");
      } else {
        console.log("[Mock] Mock功能已禁用，需刷新页面以停用拦截器");
      }
    }
  }, "mockEnabled");
}

main();
