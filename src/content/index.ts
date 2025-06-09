import {
  chromeLocalStorage,
  chromeSessionStorage,
  customEventSend,
} from '@/utils';

// 立即执行函数，用于防止重复执行
(function () {
  // 防止在iframe中重复执行
  if (window.top !== window) {
    console.debug(`🚫 在iframe中，跳过执行 - URL: ${window.location.href}`);
    return;
  }

  // 防止重复执行的全局标记
  if ((window as any).__HTTP_CACHE_CONTENT_SCRIPT_LOADED__) {
    console.debug(
      `🚫 ContentScript已加载，跳过重复执行 - URL: ${window.location.href}`
    );
    return;
  }

  console.debug(`✅ ContentScript开始执行 - URL: ${window.location.href}`);
  (window as any).__HTTP_CACHE_CONTENT_SCRIPT_LOADED__ = true;

  // 内容脚本，在匹配的页面上运行
  console.debug('HTTP缓存-ContentScript已加载');

  // 优化：缓存存储数据，避免重复调用
  let cachedStorageData: any = null;
  let curRequestData: any = [];
  let sideBarReady = false;
  async function getStorageData() {
    if (!cachedStorageData) {
      cachedStorageData = await chromeLocalStorage.getAll();
    }
    return cachedStorageData;
  }

  function whetherToInject(storageData: any) {
    const curOrigin = window.location.origin;
    const { allowToInjectOrigin, disasterRecoveryProcessing, monitorEnabled } =
      storageData;

    return (
      (allowToInjectOrigin.some(
        ({
          type,
          domain,
        }: {
          type: 'regex' | 'fully' | 'include';
          domain: string;
        }) => {
          if (type === 'fully') {
            return domain === curOrigin;
          } else if (type === 'include') {
            return curOrigin.includes(domain);
          } else {
            return new RegExp(domain).test(curOrigin);
          }
        }
      ) &&
        disasterRecoveryProcessing) ||
      monitorEnabled
    );
  }

  async function injectScriptToPage() {
    try {
      // 优化：并行获取存储数据和准备脚本
      console.debug(Date.now(), 'injectScriptToPage');
      const [storageData] = await Promise.all([getStorageData()]);
      console.debug(Date.now(), 'injectScriptToPage_after_getStorageData');
      const isPass = whetherToInject(storageData);
      if (!isPass) {
        console.debug('🚫 未通过注入条件 - URL: ', window.location.href);
        return;
      }
      customEventSend('content_to_ajaxHook', {
        type: 'init',
        message: storageData,
      });
      handleEvent();
    } catch (error) {
      console.error('注入脚本加载失败:', error);
    }
  }

  async function handleEvent() {
    let hitCount = 0;

    chromeSessionStorage.set({ curCacheData: [] });
    window.addEventListener('ajaxHook_to_content', async (event: any) => {
      const { type, message } = event.detail;
      console.debug('收到事件:', type, message);

      if (type === 'cache_hit') {
        hitCount++;

        // 使用正确的API - chrome.action 而不是 chrome.browserAction
        chrome.runtime.sendMessage({
          type: 'update_badge',
          data: {
            count: hitCount,
            oneRequestData: message,
          },
        });
      } else if (type === 'currentRequest') {
        if (!sideBarReady) {
          console.debug('content_receive_currentRequest', message);
          curRequestData.push(message);
        } else {
          chrome.runtime.sendMessage({
            type: 'new_request_data',
            data: {
              ...message,
            },
          });
        }
      }
    });

    // 处理来自popup的消息
    chrome.runtime.onMessage.addListener(
      (message: any, sender: any, sendResponse: any) => {
        console.debug('Content收到事件:', message.type, message);
        if (message.type === 'update_request_cache_data') {
          const { cacheKey, cacheResponse, cacheReqParams } = message.data;
          const requestCacheData = localStorage.getItem('request_cache_data');
          if (requestCacheData) {
            try {
              const requestCacheDataObj = JSON.parse(requestCacheData);
              requestCacheDataObj[cacheKey] = {
                cacheResponse: cacheResponse,
                cacheReqParams: cacheReqParams,
              };
              localStorage.setItem(
                'request_cache_data',
                JSON.stringify(requestCacheDataObj)
              );
              console.debug(
                'requestCacheDataObj after save',
                requestCacheDataObj
              );
            } catch (error) {
              console.error('更新缓存数据失败:', error);
            }
          }
        } else if (message.type === 'sidebar_ready') {
          sideBarReady = true;
          chrome.runtime.sendMessage(
            {
              type: 'batch_request_data',
              data: curRequestData,
            },
            (response) => {
              console.debug('batch_request_data response:', response);
              curRequestData = [];
            }
          );
          console.debug('content_receive_sidebar_ready', curRequestData);
        } else if (message.type === 'mockList_change') {
          // 将最新的 mockList 转发给 ajaxHook 脚本
          customEventSend('content_to_ajaxHook', {
            type: 'mockList_change',
            message: { mockList: message.data || [] },
          });
        } else if (message.type === 'copy_json') {
          console.debug('copy_json', message.data);
          navigator.clipboard.writeText(message.data);
          sendResponse({ success: true });
        }
        // 不返回 true，表示同步处理
      }
    );
  }

  // 优化：直接启动，无需额外的main函数包装
  injectScriptToPage();
})(); // 关闭立即执行函数
