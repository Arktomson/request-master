import { Storage } from "@/utils";

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
    ],
    // 其他默认配置项...
  };
  Object.keys(defaultSettings).forEach(async (key) => {
    const result = await Storage.get(key);
    if (!result) {
      Storage.set({ [key]: defaultSettings[key] });
    }
  });
  console.log("配置已初始化:", defaultSettings);
}

chrome.runtime.onInstalled.addListener(async () => {
  await initConfig();
});
console.log("HTTP缓存-Background-Script已加载");
