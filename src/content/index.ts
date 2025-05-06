import { Storage } from "@/utils";

// 内容脚本，在匹配的页面上运行
console.log("HTTP缓存扩展内容脚本已加载");

// 注入脚本到页面
async function injectScriptToPage() {
  try {
    // 获取注入脚本的URL
    const scriptUrl = chrome.runtime.getURL("inject.js");
    console.log("注入脚本URL:", scriptUrl);
    // 创建并注入脚本
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.type = "text/javascript";
    (document.head || document.documentElement).appendChild(script);
    // 脚本加载后发送配置
    script.addEventListener("load", async () => {
      console.log("注入脚本加载完成，发送配置");
      const result = await Storage.get("settings");
      console.log(result)
      // 发送扩展状态
      window.postMessage({
        type: "requestCache",
        to: "inject",
        message: result
      }, "*");
    });
 
  } catch (error) {
    console.error("注入脚本加载失败:", error);
  }
}

injectScriptToPage();

// 扩展状态管理
// chrome.storage.onChanged.addListener((changes, area) => {
//   if (area === "local") {
//     // 监听配置变化并传递给页面脚本
//     if (changes.isActive) {
//       window.postMessage(
//         {
//           type: "requestCache",
//           to: "pageScript",
//           key: "isActive",
//           value: changes.isActive.newValue,
//         },
//         "*"
//       );
//       console.log("扩展状态已更新:", changes.isActive.newValue);
//     }

//     if (changes.rules) {
//       window.postMessage(
//         {
//           type: "requestCache",
//           to: "pageScript",
//           key: "rules",
//           value: changes.rules.newValue,
//         },
//         "*"
//       );
//       console.log("拦截规则已更新");
//     }
//   }
// });
