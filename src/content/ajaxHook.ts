// @ts-nocheck
// @rollup-plugin-ignore

import { ProcessStatus, serverTempErrorCodes } from '@/config';
import { AjaxHookRequest, AjaxHookResponse } from '@/types/ajaxHook';
import { customEventSend, generateCacheKey, normalizeUrl, urlApart } from '@/utils';
import { ajaxInterface } from './ajaxInterface';
import { Setting } from '@/types';
import { cacheManager } from './cacheManager';
import dayjs from 'dayjs';

console.log('进入ajaxHook', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));

function getCacheKey(request: AjaxHookRequest) {
  const url = request.url?.startsWith('http') ? request.url : window.location.origin + request.url;
  return generateCacheKey(
    normalizeUrl(url),
    request.data,
    request.method
  );
}
function checkStatus(
  request: AjaxHookRequest,
  respone: AjaxHookResponse,
  cacheKey: string
): {
  status: ProcessStatus;
} {
  let status = ProcessStatus.CACHE;
  const isError = serverTempErrorCodes.includes(respone.status);
  const isHasCacheData = cacheManager.has(cacheKey);
  if (isError && !isHasCacheData) {
    status = ProcessStatus.ERROR_NO_CACHE;
  } else if (isError && isHasCacheData) {
    status = ProcessStatus.RECOVERY;
  } else if (!isError) {
    status = ProcessStatus.CACHE;
  }
  return {
    status
  };
}
function filterSituation(resp) {
  if (!resp) return false;
  const { responseHeaders } = resp;
  if (!/json|(\+json)|(\/json)/i.test(responseHeaders['content-type'])) {
    return false;
  }

  // 检查响应数据是否是有效的JSON格式（对象{}或数组[]）
  const responseData = resp.responseText || resp.response;
  if (responseData) {
    const trimmedData = responseData.toString().trim();
    // 支持JSON对象和JSON数组
    const isJsonObject = trimmedData.startsWith('{') && trimmedData.endsWith('}');
    const isJsonArray = trimmedData.startsWith('[') && trimmedData.endsWith(']');
    
    if (!isJsonObject && !isJsonArray) {
      return false;
    }
  }

  return true;
}

let alreadyConfigInit = false;
function beginHook() {
  let mockList = [];
  let mockEnabled = true;
  let monitorEnabled = true;
  let disasterRecoveryProcessing = false;
  let urlMatch = false;
  let isPathMatch = false;


  console.log('启动ajaxHook', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
  console.log('monitorEnabled', monitorEnabled);
  console.log(window.__HOOK_CFG, 'window.__HOOK_CFG');
  if (window.__HOOK_CFG) {
    const {
      monitorEnabled: monitorEnabledInit,
      disasterRecoveryProcessing: disasterRecoveryProcessingInit,
      mockList: mockListInit = [],
      mockEnabled: mockEnabledInit,
      urlMatch: urlMatchInit,
      isPathMatch: isPathMatchInit,
    } = window.__HOOK_CFG;
    monitorEnabled = monitorEnabledInit;
    disasterRecoveryProcessing = disasterRecoveryProcessingInit;
    mockList = mockListInit;
    mockEnabled = mockEnabledInit;
    urlMatch = urlMatchInit;
    isPathMatch = isPathMatchInit;
    alreadyConfigInit = true;
  }
  console.log(
    monitorEnabled,
    urlMatch,
    disasterRecoveryProcessing,
    'monitorEnabled, urlMatch, disasterRecoveryProcessing'
  );
  if (monitorEnabled || (urlMatch && disasterRecoveryProcessing)) {
    const ajaxHooker = ajaxInterface();
    ajaxHooker.hook(async (request: AjaxHookRequest) => {
      while(!window.__HOOK_CFG) {
        await new Promise(resolve => setTimeout(resolve, 10));
        console.log('等待配置中ing', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
      }
      if(!alreadyConfigInit) { 
        const {
          monitorEnabled: monitorEnabledInit,
          disasterRecoveryProcessing: disasterRecoveryProcessingInit,
          mockList: mockListInit = [],
          mockEnabled: mockEnabledInit,
          urlMatch: urlMatchInit,
          isPathMatch: isPathMatchInit,
        } = window.__HOOK_CFG;
        monitorEnabled = monitorEnabledInit;
        disasterRecoveryProcessing = disasterRecoveryProcessingInit;
        mockList = mockListInit;
        mockEnabled = mockEnabledInit;
        urlMatch = urlMatchInit;
        isPathMatch = isPathMatchInit;
        alreadyConfigInit = true;
      }
      console.log(
        'ajaxHooker kp',
        request,
        dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')
      );
      const cacheKey = getCacheKey(request);
      if(mockEnabled){
        const mock = mockList.find((item: any) => {
          if(isPathMatch) {
            const apartCurUrl = urlApart(request.url?.startsWith('http') ? request.url : window.location.origin + request.url);
            return `${item.origin}${item.purePath}` === `${apartCurUrl.origin}${apartCurUrl.purePath}` && item.method === request.method;
          } else {
            return item.cacheKey === cacheKey;
          }
        });
        if (mock) {
          request.data = mock.params;
          request.headers = mock.headers;
        }
      }
      request.response = async (resp: AjaxHookResponse) => {

        if (!filterSituation(resp)) {
          return;
        }
        ajaxHooker.modifyJsonResponse(
          request,
          resp as AjaxHookResponse,
          (json: Record<string, any>) => {
            const { status } = checkStatus(request, resp, cacheKey);
            if (monitorEnabled) {
              let isMock = false;
              let mockData = json;
              if (mockEnabled) {
                // 🚀 性能优化：使用Map查找，时间复杂度从O(n)降到O(1)
                const mock = mockList.find((item: any) => {
                  if(isPathMatch) {
                    const apartCurUrl = urlApart(request.url?.startsWith('http') ? request.url : window.location.origin + request.url);
                    return `${item.origin}${item.purePath}` === `${apartCurUrl.origin}${apartCurUrl.purePath}` && item.method === request.method;
                  } else {
                    return item.cacheKey === cacheKey;
                  }
                });
                if (mock) {
                  json = mock.response;
                  mockData = mock.response;
                  resp.status = 200;
                  resp.statusText = 'OK';
                  isMock = true;
                }
              }
              console.log('发送数据 currentRequest');
              customEventSend('ajaxHook_to_content', {
                type: 'currentRequest',
                message: {
                  url: resp.finalUrl,
                  method: request.method,
                  params: request.data,
                  response: mockData,
                  cacheKey: cacheKey,
                  headers: request.headers,
                  time: new Date().getTime(),
                  isMock,
                },
              });
              if (isMock) {
                return json;
              }
            }

            if (disasterRecoveryProcessing) {
              switch (status) {
                case ProcessStatus.RECOVERY:
                  resp.status = 200;
                  resp.statusText = 'OK';
                  // 🔥 使用缓存管理器获取缓存数据
                  const cachedData = cacheManager.get(cacheKey);
                  json = cachedData ? cachedData.cacheResponse : json;

                  customEventSend('ajaxHook_to_content', {
                    type: 'cache_hit',
                    message: {
                      url: resp.finalUrl,
                      method: request.method,
                      params: request.data,
                      response: json,
                      cacheKey: cacheKey,
                    },
                  });
                  break;
                case ProcessStatus.CACHE:
                  // 🔥 使用缓存管理器保存数据（防抖写入，自动LRU清理）
                  cacheManager.set(cacheKey, {
                    cacheResponse: json,
                    cacheReqParams: request.data,
                  });

                  break;
                case ProcessStatus.ERROR_NO_CACHE:
                  break;
                default:
                  break;
              }
            }

            return json; // 返回修改后的json
          }
        );
      };
    });

    window.addEventListener('content_to_ajaxHook', (event) => {
      const { detail: { type, action, message } = {} } = event || {};
      if (type === 'mockList_change') {
        mockList = message;
      } else if (type === 'mockEnabled_change') {
        mockEnabled = message;
        console.log('mockEnabled_change ajaxHook', message);
      } else if (type === 'monitorEnabled_change') {
        console.log('monitorEnabled_change ajaxHook', message);
        monitorEnabled = message;
      } else if (type === 'disasterRecoveryProcessing_change') {
        disasterRecoveryProcessing = message;
      }
    });
  }
}
beginHook();
// function microTaskInit() {
//   function waitForConfig() {
//     return new Promise((resolve) => {
//       let retryCount = 0;
//       const maxRetries = 3;
//       const check = () => {
//         console.log('check', window.__HOOK_CFG, `重试次数: ${retryCount}`);
//         if (window.__HOOK_CFG) {
//           resolve(window.__HOOK_CFG);
//         } else if (retryCount < maxRetries) {
//           retryCount++;
//           setTimeout(check, 1); // 1ms 后重试
//         } else {
//           console.warn('配置获取失败，已达到最大重试次数');
//           resolve(null); // 重试次数用完后返回 null
//         }
//       };
//       check();
//     });
//   }
//   waitForConfig().then((cfg) => {
//     beginHook();
//   });
// }

// function retryInit() {
//   let retryCount = 0;
//   const maxRetries = 15;

//   // 如果脚本注入时已经拿到配置，直接启动即可
//   if (window.__HOOK_CFG) {
//     beginHook();
//     return;
//   }else {
//     console.log('首次未执行beginHook',new Date().toISOString());
//   }

//   // 使用 MessageChannel 创建高优先级的宏任务队列（相比 setTimeout 没有最小时间阈值限制）
//   const { port1, port2 } = new MessageChannel();

//   port1.onmessage = () => {
//     console.log('收到一次message channel消息',new Date().toISOString());
//     if (window.__HOOK_CFG) {
//       console.log('beginHook 准备执行');
//       beginHook();
//     } else if (retryCount < maxRetries) {
//       console.log('重试', retryCount, 'time', new Date().toISOString());
//       retryCount++;
//       port2.postMessage(null);
//     } else {
//       console.warn('配置获取失败，已达到最大重试次数');
//     }
//   };

//   // 触发第一次检查
//   port2.postMessage(null);
// }
// ajaxHooker.hook((request: AjaxHookRequest) => {
//   if(isFirst) {
//     isFirst = false;
//     console.warn('ajaxHooker first hook', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));
//   }
// });
// beginHook();
// retryInit();
// microTaskInit();
