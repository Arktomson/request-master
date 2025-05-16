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
  chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      console.log("收到消息:", message);
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
    }
  );
}
chrome.runtime.onInstalled.addListener(async () => {
  await initConfig();
  await initEvent();
});
console.log("HTTP缓存-Background-Script已加载");
