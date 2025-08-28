import {
  chromeLocalStorage,
  chromeSessionStorage,
  messageToContent,
} from '@/utils';
import { Setting } from '@/types';
import dayjs from 'dayjs';
import { isNil } from 'lodash-es';

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
    queryPanelVisible: false,
    headersPanelVisible: false,
    bodyPanelVisible: false,
    mockResponse: true,
    mockRequestBody: false,
    isPathMatch: false,
    sidebarPosition: 'right',
    sidebarHeight: 600,
    // 布局记忆化相关变量
    monitorSectionWidth: 400,  // Monitor区域宽度
    mockSectionWidth: 300,     // Mock区域宽度
    jsonViewerWidth: 400,      // JsonViewer区域宽度
    horizontalSplitRatio: 0.6, // 水平分割比例（Monitor:Mock）
    verticalSplitRatio: 0.7,   // 垂直分割比例（左侧:右侧）
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
  console.log(config, 'config');
  const shouldInjectForThisUrl = shouldInjectForUrl(
    url,
    config.allowToInjectOrigin || []
  );
  config.urlMatch = shouldInjectForThisUrl;
  console.log(config, 'config');
  chrome.scripting
    .executeScript({
      target: { tabId, allFrames: false },
      world: 'MAIN',
      func: (c) => {
        console.log('正在执行配置注入脚本', new Date().toISOString());
        (window as any).__HOOK_CFG = c;
      },
      args: [config],
      injectImmediately: true,
    })
    .then((res) => {
      console.log(res, 'res');
      console.log('执行配置成功', new Date().toISOString());
    })
    .catch((e) => {
      console.error('执行配置失败', e);
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
        js: ['src/content/ajaxHook.js'],
        matches: ['http://*/*', 'https://*/*'],
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
        } else if (message.type === 'sidebar_state_changed') {
        }
      } catch (e) {
        console.error('Background message error', e);
      } finally {
        sendResponse({ success: true });
      }
    }
  );
  chrome.commands.onCommand.addListener(async (cmd) => {
    if (cmd === 'open_sidebar') {
      messageToContent({ type: 'toggle_sidebar' });
    }
  });
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'open_mock_panel') {
      try {
        messageToContent({ type: 'toggle_sidebar' });
      } catch (error) {
        console.error('Failed to open sidebar:', error);
      }
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
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://')) || !tabId) {
        return;
      }
      console.log(
        '有页面加载 onCommitted',
        dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
        url
      );
      try {
        injectCfgToPage({ tabId, frameId, url });
      } catch (_) {
        console.error('注入配置失败:', _);
        console.log(tabId, frameId, url, 'tabId, frameId, url');
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

  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'open_mock_panel',
    title: '打开mock面板',
    contexts: ['action'],
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureScripts();
});
wireRuntimeMessaging();
wireStorageWatcher();
wireNavigationInjection();


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'reload') {
    await chrome.runtime.reload();
    sendResponse({ success: true });
  }
});
console.debug('background执行');