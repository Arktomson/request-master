import { chromeLocalStorage, chromeSessionStorage } from "@/utils";

interface Setting {
  disasterRecoveryProcessing: boolean;
  disasterRecoveryIsProcessUrl: string[];
  doYouWantToEnableHijacking: boolean;
  allowToInjectOrigin: {
    type: "regex" | "fully" | "include";
    domain: string;
  }[];
  [key: string]: any; // 添加索引签名
}
async function initConfig() {
  // 配置为空，进行初始化
  const defaultSettings: Setting = {
    // 灾难恢复处理
    disasterRecoveryProcessing: true,
    disasterRecoveryIsProcessUrl: [],
    // 是否启用劫持
    doYouWantToEnableHijacking: true,
    allowToInjectOrigin: [
      {
        type: "regex",
        domain: "https://zfcg.czt.zj.gov.cn",
      },
      {
        type: "regex",
        domain: "https://www.qq.com",
      },
      {
        type: "include",
        domain: "https://www.qq.com",
      },
      {
        type: "fully",
        domain: "https://zfcg.czt.zj.gov.cn",
      },
      {
        type: "regex",
        domain: "(.*localhost.*|.*127.0.0.1.*)",
      },
      {
        type: "regex",
        domain: ".*zcy.*",
      },
    ],
    // 其他默认配置项...
  };
  Object.keys(defaultSettings).forEach(async (key) => {
    const result = await chromeLocalStorage.get(key);
    if (!result) {
      chromeLocalStorage.set({ [key]: defaultSettings[key] });
    }
  });
  console.log("配置已初始化:", defaultSettings);
}
async function initEvent() {
  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === "update_badge") {
      chrome.action.setBadgeText({
        text: message.count.toString(),
        tabId: sender.tab?.id,
      });
      chrome.action.setBadgeBackgroundColor({
        color: "purple",
        tabId: sender.tab?.id,
      });
      const curCacheData =
        (await chromeSessionStorage.get("curCacheData")) || [];
      console.log("curCacheData", curCacheData);
      curCacheData.push(message.curCacheData);
      chromeSessionStorage.set({ curCacheData });
    } else if (message.type === "clear_cache") {
      chromeSessionStorage.set({ curCacheData: [] });
    }
  });
}


async function main() {
  await initEvent();
}

main()
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_sidebar") {
    // 打开或切换侧边栏
    chrome.sidePanel.open();
  }
});

// // 添加保持Service Worker活跃的连接监听器
// chrome.runtime.onConnect.addListener((port) => {
//   console.log("建立连接:", port.name);
  
//   if (port.name === "keepAlive") {
//     // @ts-ignore 添加timer属性到port对象
//     port.timer = setTimeout(() => {
//       console.log("主动断开连接，等待重连...");
//       port.disconnect();
//       // @ts-ignore 清除计时器
//       if (port.timer) {
//         // @ts-ignore
//         clearTimeout(port.timer);
//       }
//     }, 25000); // 25秒后断开，留5秒的安全时间
//   }
// });

chrome.runtime.onInstalled.addListener(async () => {
  await initConfig();
  console.log("扩展已安装并初始化");
});

console.log("HTTP缓存-Background-Script已加载");
