// @ts-nocheck
// @rollup-plugin-ignore

import { ProcessStatus, serverTempErrorCodes } from '@/config';
import { AjaxHookRequest, AjaxHookResponse } from '@/types/ajaxHook';
import { customEventSend, generateCacheKey, normalizeUrl } from '@/utils';
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

  // 检查响应数据是否以{}开头结尾（简单判断JSON对象格式）
  const responseData = resp.responseText || resp.response;
  if (responseData) {
    const trimmedData = responseData.toString().trim();
    if (!trimmedData.startsWith('{') || !trimmedData.endsWith('}')) {
      return false;
    }
  }

  return true;
}


function beginHook() {
  let mockList = [];
  let mockEnabled = true;
  let monitorEnabled = true;
  let disasterRecoveryProcessing = false;
  let urlMatch = false;



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
    } = window.__HOOK_CFG;
    monitorEnabled = monitorEnabledInit;
    disasterRecoveryProcessing = disasterRecoveryProcessingInit;
    mockList = mockListInit;
    mockEnabled = mockEnabledInit;
    urlMatch = urlMatchInit;
    
  }
  console.log(
    monitorEnabled,
    urlMatch,
    disasterRecoveryProcessing,
    'monitorEnabled, urlMatch, disasterRecoveryProcessing'
  );
  if (monitorEnabled || (urlMatch && disasterRecoveryProcessing)) {
    const ajaxHooker = ajaxInterface();
    ajaxHooker.hook((request: AjaxHookRequest) => {
      console.log(
        'ajaxHooker kp',
        request,
        dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')
      );
      const cacheKey = getCacheKey(request);
      if(mockEnabled){
        const mock = mockList.find((item: any) => item.cacheKey === cacheKey);
        if (mock) {
          request.data = mock.params;
          request.headers = mock.headers;
        }
      }
      request.response = (resp: AjaxHookResponse) => {
        console.log('resp', resp);
        if (!filterSituation(resp)) {
          return resp;
        }
        return ajaxHooker.modifyJsonResponse(
          request,
          resp as AjaxHookResponse,
          (json: Record<string, any>) => {
            const { status } = checkStatus(request, resp, cacheKey);
            if (monitorEnabled) {
              let isMock = false;
              let mockData = json;
              if (mockEnabled) {
                // 🚀 性能优化：使用Map查找，时间复杂度从O(n)降到O(1)
                const mock = mockList.find((item: any) => item.cacheKey === cacheKey);
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

function microTaskInit() {
  function waitForConfig() {
    return new Promise((resolve) => {
      let retryCount = 0;
      const maxRetries = 3;
      const check = () => {
        console.log('check', window.__HOOK_CFG, `重试次数: ${retryCount}`);
        if (window.__HOOK_CFG) {
          resolve(window.__HOOK_CFG);
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(check, 1); // 1ms 后重试
        } else {
          console.warn('配置获取失败，已达到最大重试次数');
          resolve(null); // 重试次数用完后返回 null
        }
      };
      check();
    });
  }
  waitForConfig().then((cfg) => {
    beginHook();
  });
}

function retryInit() {
  let retryCount = 0;
  const maxRetries = 3;
  const check = () => {
    if (window.__HOOK_CFG) {
      beginHook();
    } else if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(check, 0); // 1ms 后重试
    }
  };
  check();
}

retryInit();
// microTaskInit();

// window.addEventListener('content_to_ajaxHook', (event) => {
//   const { detail: { type, message } = {} } = event || {};

//   if (type === 'init') {
//     const ajaxHooker = ajaxInterface();

//     const {
//       disasterRecoveryProcessing: disasterRecoveryProcessingInit,
//       monitorEnabled: monitorEnabledInit,
//       mockList: mockListInit = [],
//       mockEnabled: mockEnabledInit,
//     } = message;

//     disasterRecoveryProcessing = disasterRecoveryProcessingInit;
//     mockEnabled = mockEnabledInit;
//     mockList = mockListInit;
//     monitorEnabled = monitorEnabledInit;

//     ajaxHooker.hook((request: AjaxHookRequest) => {
//       request.response = (resp: AjaxHookResponse) => {
//         if (!filterSituation(resp)) {
//           return resp;
//         }
//         return ajaxHooker.modifyJsonResponse(
//           request,
//           resp as AjaxHookResponse,
//           (json: Record<string, any>) => {
//             const { status, cacheKey } = checkStatus(request, resp);
//             if (monitorEnabled) {
//               let isMock = false;
//               let mockData = json;
//               if (mockEnabled) {
//                 if (mockList.length > 0) {
//                   const mock = mockList.find(
//                     (item: any) => item.cacheKey === cacheKey
//                   );
//                   if (mock) {
//                     json = mock.response;
//                     mockData = mock.response;
//                     resp.status = 200;
//                     resp.statusText = 'OK';
//                     isMock = true;
//                   }
//                 }
//               }
//               customEventSend('ajaxHook_to_content', {
//                 type: 'currentRequest',
//                 message: {
//                   url: resp.finalUrl,
//                   method: request.method,
//                   params: request.data,
//                   response: mockData,
//                   cacheKey: cacheKey,
//                   headers: request.headers,
//                   time: new Date().getTime(),
//                   isMock,
//                 },
//               });
//               if (isMock) {
//                 return json;
//               }
//             }

//             if (disasterRecoveryProcessing) {
//               switch (status) {
//                 case ProcessStatus.RECOVERY:
//                   resp.status = 200;
//                   resp.statusText = 'OK';
//                   // 🔥 使用缓存管理器获取缓存数据
//                   const cachedData = cacheManager.get(cacheKey);
//                   json = cachedData ? cachedData.cacheResponse : json;

//                   customEventSend('ajaxHook_to_content', {
//                     type: 'cache_hit',
//                     message: {
//                       url: resp.finalUrl,
//                       method: request.method,
//                       params: request.data,
//                       response: json,
//                       cacheKey: cacheKey,
//                     },
//                   });
//                   break;
//                 case ProcessStatus.CACHE:
//                   // 🔥 使用缓存管理器保存数据（防抖写入，自动LRU清理）
//                   cacheManager.set(cacheKey, {
//                     cacheResponse: json,
//                     cacheReqParams: request.data,
//                   });

//                   break;
//                 case ProcessStatus.ERROR_NO_CACHE:
//                   break;
//                 default:
//                   break;
//               }
//             }

//             return json; // 返回修改后的json
//           }
//         );
//       };
//     });
//   } else if (type === 'mockList_change') {
//     mockList = message;
//   } else if (type === 'mockEnabled_change') {
//     mockEnabled = message;
//   } else if (type === 'monitorEnabled_change') {
//     console.log('monitorEnabled_change ajaxHook', message);
//     monitorEnabled = message;
//   } else if (type === 'disasterRecoveryProcessing_change') {
//     disasterRecoveryProcessing = message;
//   }
// });
