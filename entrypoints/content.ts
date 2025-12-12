import { chromeSessionStorage, customEventSend } from '../utils';
import dayjs from 'dayjs';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  allFrames: false,

  main() {
    console.log('content123456789012', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));

    let pendingBatchProcessData: any = [];
    let sideBarReady = false;

    async function injectScriptToPage() {
      try {
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
              data: { ...message },
            });
          }
        }
      });

      chrome.runtime.onMessage.addListener(
        (message: any, _sender: any, sendResponse: any) => {
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
              () => {
                pendingBatchProcessData = [];
              }
            );
          } else if (message.type.endsWith('_change')) {
            const messageData =
              message.type === 'mockList_change'
                ? message.data || []
                : message.data;

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

    injectScriptToPage();
  },
});
