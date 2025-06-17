import {
  chromeLocalStorage,
  chromeSessionStorage,
  messageToContent,
} from '@/utils';
import { Setting } from '@/types';
import dayjs from 'dayjs';
import { isNil } from 'lodash-es';

// // 获取当前活动tab的URL
// async function getCurrentTabUrl(): Promise<string | null> {
//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });
//     return tab?.url || null;
//   } catch (error) {
//     console.error('获取当前tab URL失败:', error);
//     return null;
//   }
// }

// 检查URL是否符合注入条件
function shouldInjectForUrl(url: string, allowedOrigins: any[]): boolean {
  const formatUrl = new URL(url);
  const originUrl = formatUrl.origin;
  console.log(originUrl, 'originUrl');
  return allowedOrigins.some((origin) => {
    if (origin.type === 'regex') {
      const regex = new RegExp(origin.domain);
      return regex.test(originUrl);
    } else if (origin.type === 'fully') {
      return originUrl === origin.domain;
    } else if (origin.type === 'include') {
      return originUrl.includes(origin.domain);
    }
  });
}

async function initConfig() {
  const [stored, _] = await Promise.all([
    chromeLocalStorage.getAll(),
    chrome.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
    }),
  ]);
  const defaultSettings: Setting = {
    disasterRecoveryProcessing: true,
    doYouWantToEnableHijacking: true,
    allowToInjectOrigin: [
      { type: 'regex', domain: '(.*localhost.*|.*127.0.0.1.*)' },
      { type: 'regex', domain: '.*zcygov.*' },
    ],
    sidebarIfCacheState: false,
    sideBarLastVisible: false,
    mockList: [],
    mockEnabled: false,
    monitorEnabled: false,
    sidebarWidth: 900,
  };
  for (const [key, val] of Object.entries(defaultSettings)) {
    if (isNil(stored[key])) {
      await chromeLocalStorage.set({ [key]: val });
    }
  }
}
const SCRIPT_ID = 'ajax-hook';
async function isRegistered() {
  const list = await chrome.scripting.getRegisteredContentScripts({
    ids: [SCRIPT_ID],
  });
  return list.length > 0;
}
async function injectCfgToPage({
  tabId,
  frameId,
  url,
}: {
  tabId: number;
  frameId: number;
  url: string;
}) {
  console.log('准备注入配置', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
  const config = await chromeLocalStorage.getAll();
  const shouldInjectForThisUrl = shouldInjectForUrl(
    url,
    config.allowToInjectOrigin || []
  );
  console.log(shouldInjectForThisUrl, 'shouldInjectForThisUrl');
  config.urlMatch = shouldInjectForThisUrl;
  console.log(config, 'config');
  chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: 'MAIN',
    func: (c) => {
      console.log('执行配置', new Date().toISOString());
      (window as any).__HOOK_CFG = c;
    },
    args: [config],
    injectImmediately: true,
  });
}

async function ensureScripts() {
  const [cfg, already] = await Promise.all([
    chromeLocalStorage.getAll(),
    isRegistered(),
  ]);
  const hijackSwitch = cfg.monitorEnabled || cfg.disasterRecoveryProcessing;
  if (hijackSwitch && !already) {
    await chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        js: ['ajaxHook.js'],
        matches: ['<all_urls>'],
        runAt: 'document_start',
        world: 'MAIN',
        allFrames: false,
        persistAcrossSessions: true,
      },
    ]);
  } else if (!hijackSwitch && already) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
}
function wireRuntimeMessaging() {
  chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
      try {
        if (message.type === 'update_badge') {
          const { count, oneRequestData } = message.data;
          await Promise.all([
            chrome.action.setBadgeText({
              text: String(count),
              tabId: sender.tab?.id,
            }),
            chrome.action.setBadgeBackgroundColor({
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
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (e) {
        console.error('Background message error', e);
        sendResponse({ success: false, error: String(e) });
      }
    }
  );
  chrome.commands.onCommand.addListener(async (cmd) => {
    if (cmd === 'open_sidebar') {
      messageToContent({ type: 'toggle_sidebar' });
    }
  });
}
function wireStorageWatcher() {
  chromeLocalStorage.onChange(() => {
    ensureScripts();
  }, ['monitorEnabled', 'disasterRecoveryProcessing']);
}
function wireNavigationInjection() {
  chrome.webNavigation.onCommitted.addListener(
    ({ tabId, frameId, url }) => {
      console.log('有页面加载', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), url);
      try {
        injectCfgToPage({ tabId, frameId, url });
      } catch (_) {
        console.error('注入配置失败:', _);
      }
    },
    {
      url: [{ schemes: ['http', 'https'] }],
    }
  );
}

chrome.runtime.onInstalled.addListener(async () => {
  await initConfig();
  await ensureScripts();
});
chrome.runtime.onStartup.addListener(async () => {
  await ensureScripts();
});
wireRuntimeMessaging();
wireStorageWatcher();
wireNavigationInjection();
