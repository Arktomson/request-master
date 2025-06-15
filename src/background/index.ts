import {
  chromeLocalStorage,
  chromeSessionStorage,
  messageToContent,
} from '@/utils';
import { Setting } from '@/types';
import dayjs from 'dayjs';
import { isNil } from 'lodash-es';
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
function shouldInject(cfg: Setting) {
  return Boolean(cfg.monitorEnabled);
}
async function injectCfgToPage(tabId: number, frameId = 0) {
  console.log('准备注入配置', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
  const cfg = await chromeLocalStorage.getAll();
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: 'MAIN',
    func: (c) => {
      console.log('执行配置', new Date().toISOString());
      (window as any).__HOOK_CFG = c;
    },
    args: [cfg],
    injectImmediately: true,
  });
}
async function ensureScripts() {
  const cfg = await chromeLocalStorage.getAll();
  const wanted = shouldInject(cfg as Setting);
  const already = await isRegistered();
  console.log(wanted, already, 'wanted,already');
  if (wanted && !already) {
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
  } else if (!wanted && already) {
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
  chromeLocalStorage.onChange(
    async (changes, area) => {
      if (
        ['monitorEnabled', 'doYouWantToEnableHijacking'].some(
          (k) => k in changes
        )
      ) {
        await ensureScripts();
      }
    },
    ['monitorEnabled', 'doYouWantToEnableHijacking']
  );
}
function wireNavigationInjection() {
  chrome.webNavigation.onCommitted.addListener(async ({ tabId, frameId }) => {
    console.log('有页面加载',dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
    try {
      await injectCfgToPage(tabId, frameId);
    } catch (_) {}
  });
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
