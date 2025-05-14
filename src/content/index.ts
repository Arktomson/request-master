import { Storage } from "@/utils";
// 内容脚本，在匹配的页面上运行
console.log("HTTP缓存-ContentScript已加载");

// 注入脚本到页面

async function whetherToInject() {
  const curOrigin = window.location.origin;
  const { allowToInjectOrigin, disasterRecoveryProcessing } =
    await Storage.getAll();

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
    script.type = "text/javascript";

    (document.head || document.documentElement).appendChild(script);
    // 脚本加载后发送配置
    script.addEventListener("load", async () => {
      console.log("注入脚本加载完成，发送配置");
      const result = await Storage.getAll();
      // 发送扩展状态
      window.postMessage(
        {
          from: "content",
          to: "ajaxHook",
          message: result,
        },
        "*"
      );
    });
  } catch (error) {
    console.error("注入脚本加载失败:", error);
  }
}

async function main() {
  await injectScriptToPage();
}

main();
