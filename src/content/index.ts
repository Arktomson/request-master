import { chromeSessionStorage, customEventSend } from '@/utils';
import dayjs from 'dayjs';

// 立即执行函数，用于防止重复执行
console.log('content123456789012', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
(function () {
  // 优化：缓存存储数据，避免重复调用
  let pendingBatchProcessData: any = [];
  let sideBarReady = false;

  // function whetherToInject(storageData: any) {
  //   const curOrigin = window.location.origin;
  //   const { allowToInjectOrigin, disasterRecoveryProcessing, monitorEnabled } =
  //     storageData;

  //   return (
  //     (allowToInjectOrigin.some(
  //       ({
  //         type,
  //         domain,
  //       }: {
  //         type: 'regex' | 'fully' | 'include';
  //         domain: string;
  //       }) => {
  //         if (type === 'fully') {
  //           return domain === curOrigin;
  //         } else if (type === 'include') {
  //           return curOrigin.includes(domain);
  //         } else {
  //           return new RegExp(domain).test(curOrigin);
  //         }
  //       }
  //     ) &&
  //       disasterRecoveryProcessing) ||
  //     monitorEnabled
  //   );
  // }

  async function injectScriptToPage() {
    try {
      // chrome.storage.local.get(null, (res) => {
      //   console.log('开始发送数据')
      //   const isPass = whetherToInject(res);
      //   if (!isPass) {
      //     return;
      //   }
      //   customEventSend('content_to_ajaxHook', {
      //     type: 'init',
      //     message: res,
      //   });

      // });
      handleEvent();
    } catch (error) {
      console.error('注入脚本加载失败:', error);
    }
  }

  async function handleEvent() {
    let hitCount = 0;

    chromeSessionStorage.set({ curCacheData: [] });
    console.log('准备监听', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
    window.addEventListener('ajaxHook_to_content', async (event: any) => {
      const { type, message } = event.detail || {};

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
          pendingBatchProcessData.push(message);
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
            } catch (error) {
              console.error('更新缓存数据失败:', error);
            }
          }
        } else if (message.type === 'sidebar_ready') {
          sideBarReady = true;
          chrome.runtime.sendMessage(
            {
              type: 'batch_request_data',
              data: pendingBatchProcessData,
            },
            (response) => {
              pendingBatchProcessData = [];
            }
          );
        } else if (message.type.endsWith('_change')) {
          // 动态处理各种配置变更
          const messageData = message.type === 'mockList_change' ? (message.data || []) : message.data;
          
          customEventSend('content_to_ajaxHook', {
            type: message.type,
            message: messageData,
          });
        } else if (message.type === 'copy_json') {
          navigator.clipboard.writeText(message.data);
        }
        sendResponse({ success: true });
      }
    );
  }

  // 优化：直接启动，无需额外的main函数包装
  injectScriptToPage();
})(); // 关闭立即执行函数


