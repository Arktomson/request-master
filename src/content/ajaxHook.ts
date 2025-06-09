// @ts-nocheck
// @rollup-plugin-ignore

import { ProcessStatus, serverTempErrorCodes } from '@/config';
import { AjaxHookRequest, AjaxHookResponse } from '@/types/ajaxHook';
import { customEventSend, generateCacheKey, normalizeUrl } from '@/utils';
import { ajaxInterface } from './ajaxInterface';
import { Setting } from '@/types';
import { cacheManager } from './cacheManager';

// const ajaxHooker = ajaxInterface();
function checkStatus(
  request: AjaxHookRequest,
  respone: AjaxHookResponse
): {
  status: ProcessStatus;
  cacheKey: string;
} {
  let status = ProcessStatus.CACHE;
  const isError = serverTempErrorCodes.includes(respone.status);
  const cacheKey = generateCacheKey(
    normalizeUrl(respone.finalUrl),
    request.data,
    request.method
  );
  const isHasCacheData = cacheManager.has(cacheKey);
  if (isError && !isHasCacheData) {
    status = ProcessStatus.ERROR_NO_CACHE;
  } else if (isError && isHasCacheData) {
    status = ProcessStatus.RECOVERY;
  } else if (!isError) {
    status = ProcessStatus.CACHE;
  }
  return {
    status,
    cacheKey,
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
let mockList = [];
let mockEnabled = false;
let disasterRecoveryProcessing = false;
// 添加消息监听器，允许content script控制
window.addEventListener('content_to_ajaxHook', (event) => {
  const { detail: { type, message } = {} } = event || {};

  if (type === 'init') {
    const ajaxHooker = ajaxInterface();

    const {
      disasterRecoveryProcessing: disasterRecoveryProcessingInit,
      monitorEnabled,
      mockList: mockListInit = [],
      mockEnabled: mockEnabledInit,
    } = message;

    disasterRecoveryProcessing = disasterRecoveryProcessingInit;
    mockEnabled = mockEnabledInit;
    mockList = mockListInit;

    console.debug('mockList', mockList);
    console.debug(Date.now(), 'ajaxHook_to_content');
    ajaxHooker.hook((request: AjaxHookRequest) => {
      console.debug('request ajaxHook', request, request.type);
      request.response = (resp: AjaxHookResponse) => {
        if (!filterSituation(resp)) {
          return resp;
        }
        console.debug('resp ajaxHook', resp);

        return ajaxHooker.modifyJsonResponse(
          request,
          resp as AjaxHookResponse,
          (json: Record<string, any>) => {
            const { status, cacheKey } = checkStatus(request, resp);
            if (monitorEnabled) {
              let isMock = false;
              let mockData = json;
              if (mockEnabled) {
                if (mockList.length > 0) {
                  const mock = mockList.find(
                    (item: any) => item.cacheKey === cacheKey
                  );
                  if (mock) {
                    json = mock.response;
                    mockData = mock.response;
                    resp.status = 200;
                    resp.statusText = 'OK';
                    isMock = true;
                    console.debug('已使用mock数据', json);
                  }
                }
              }
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
                  console.debug('命中缓存', cacheKey, request, resp);
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
  } else if (type === 'mockList_change') {
    const { mockList: mockListChange = [] } = message;
    mockList = mockListChange;
    console.debug('mockList_change', mockList);
  }
});
