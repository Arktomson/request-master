import { chromeLocalStorage, chromeSessionStorage } from "@/utils";
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
        data: {
          count: hitCount,
          oneRequestData: message,
        }
      });
    } else if(type === "currentRequest"){
      chrome.runtime.sendMessage({
        type: "update_current_request",
        data: {
          ...message,
        }
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

// 使用示例，例如向侧边栏推送新请求数据
function pushRequestToSidebar(requestData: any) {
  chrome.runtime.sendMessage({
    type: "to_sidebar",
    data: requestData
  });
}

// 使用存储API与侧边栏通信
async function updateSidebarData(key: string, data: any) {
  // 存储数据
  await chromeSessionStorage.set({ [key]: data });
  
  // 通知侧边栏数据已更新
  chrome.runtime.sendMessage({
    type: "storage_updated",
    key: key
  });
}

// 监听来自侧边栏的数据更新通知
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "from_sidebar" && message.data?.action === "mock_updated") {
    // 重新加载Mock配置
    reloadMockConfig();
  }
  return true;
});

// 重新加载Mock配置的示例函数
async function reloadMockConfig() {
  const mockEnabled = await chromeLocalStorage.get('mockEnabled');
  const mockList = await chromeLocalStorage.get('mockList');
  
  console.log("[Mock] 配置已更新:", { mockEnabled, mockCount: mockList?.length || 0 });
  
  // 这里可以实现重新初始化Mock拦截器的逻辑
  if (mockEnabled) {
    initMockInterceptor();
  }
}

// 示例：如何在捕获新的HTTP请求后更新侧边栏的数据
async function updateRequestMonitor(request: any, response: any) {
  // 创建请求记录对象
  const requestRecord = {
    url: request.url,
    method: request.method,
    time: Date.now(),
    requestData: request.data,
    response: response,
    headers: request.headers
  };
  
  // 1. 通过消息直接推送到侧边栏
  pushRequestToSidebar(requestRecord);
  
  // 2. 更新session storage并通知侧边栏
  try {
    const curCacheData = await chromeSessionStorage.get('curCacheData') || [];
    const updatedCache = Array.isArray(curCacheData) ? [...curCacheData, requestRecord] : [requestRecord];
    await updateSidebarData('curCacheData', updatedCache);
  } catch (error: unknown) {
    console.error('更新缓存数据失败:', error);
  }
}

async function main() {
  await injectScriptToPage();
  
  // 初始化Mock拦截器
  const mockEnabled = await chromeLocalStorage.get('mockEnabled');
  if (mockEnabled) {
    // 只有在Mock功能启用时才初始化拦截器
    initMockInterceptor();
  }
  
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
  
  // 监听侧边栏状态
  // chromeLocalStorage.onChange((changes: any) => {
  //   if (changes.sideBarLastVisible) {
  //     console.log("[侧边栏] 侧边栏可见性变更:", changes.sideBarLastVisible.newValue);
  //     if (changes.sideBarLastVisible.newValue) {
  //       // 当侧边栏显示时，获取当前缓存的请求数据
  //       (async () => {
  //         try {
  //           const curCacheData = await chromeSessionStorage.get('curCacheData');
  //           if (curCacheData && Array.isArray(curCacheData)) {
  //             updateSidebarData('curCacheData', curCacheData);
  //           }
  //         } catch (error) {
  //           console.error('获取缓存数据失败:', error);
  //         }
  //       })();
  //     }
  //   }
  // }, "sideBarLastVisible");
}

main();
