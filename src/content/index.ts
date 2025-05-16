import { chromeLocalStorage, chromeSessionStorage } from "@/utils";
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

async function main() {
  await injectScriptToPage();
}

main();
