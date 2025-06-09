import {
  chromeLocalStorage,
  chromeSessionStorage,
  messageToContent,
} from '@/utils';
import { Setting } from '@/types';

async function initConfig() {
  // 配置为空，进行初始化
  const [result, _] = await Promise.all([
    chromeLocalStorage.getAll(),
    chrome.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS', // 让“不受信”场景（content script）也能用
    }),
  ]);
  const defaultSettings: Setting = {
    // 灾难恢复处理
    disasterRecoveryProcessing: true,
    // 是否启用劫持
    doYouWantToEnableHijacking: true,
    allowToInjectOrigin: [
      {
        type: 'regex',
        domain: '(.*localhost.*|.*127.0.0.1.*)',
      },
      {
        type: 'regex',
        domain: '.*zcygov.*',
      },
    ],

    sidebarIfCacheState: false,
    sideBarLastVisible: false,
    mockList: [],
    mockEnabled: false,
    monitorEnabled: false,
    sidebarWidth: 900,
    // 其他默认配置项...
  };
  Object.keys(defaultSettings).forEach(async (key) => {
    if (result[key] === undefined || result[key] === null) {
      chromeLocalStorage.set({ [key]: defaultSettings[key] });
    }
  });
  console.debug('配置已初始化:', defaultSettings);
}
async function initEvent() {
  chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      console.debug('Background收到消息:', message.type, message);

      try {
        if (message.type === 'update_badge') {
          const { count, oneRequestData } = message.data;
          await Promise.all([
            chrome.action.setBadgeText({
              text: count.toString(),
              tabId: sender.tab?.id,
            }),
            await chrome.action.setBadgeBackgroundColor({
              color: 'purple',
              tabId: sender.tab?.id,
            }),
          ]);
          const curCacheData =
            (await chromeSessionStorage.get('curCacheData')) || [];
          curCacheData.push(oneRequestData);
          await chromeSessionStorage.set({ curCacheData });
          sendResponse({ success: true });
        } else if (message.type === 'sidebar_state_changed') {
          console.debug('侧边栏状态更改:', message.data?.visible);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Background处理消息出错:', error);
        sendResponse({ success: false, error: String(error) });
      }

      return true; // 表示异步响应
    }
  );

  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open_sidebar') {
      console.debug('open_sidebar');
      // 切换iframe侧边栏
      messageToContent(
        {
          type: 'toggle_sidebar',
        },
        (response) => {
          console.debug('toggle_sidebar', response);
        }
      );
    }
  });
}

async function main() {
  await initEvent();
}

main();

// // 添加保持Service Worker活跃的连接监听器
// chrome.runtime.onConnect.addListener((port) => {
//   console.debug("建立连接:", port.name);

//   if (port.name === "keepAlive") {
//     // @ts-ignore 添加timer属性到port对象
//     port.timer = setTimeout(() => {
//       console.debug("主动断开连接，等待重连...");
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
  console.debug('扩展已安装并初始化');
});

console.debug('HTTP缓存-Background-Script已加载');
