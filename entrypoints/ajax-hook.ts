// @ts-nocheck

import { ProcessStatus, serverTempErrorCodes } from '../config';
import { AjaxHookRequest, AjaxHookResponse } from '../types/ajaxHook';
import { customEventSend, generateCacheKey, normalizeUrl, urlApart } from '../utils';
import { ajaxInterface } from '../content/ajaxInterface';
import { cacheManager } from '../content/cacheManager';
import dayjs from 'dayjs';

export default defineUnlistedScript(() => {
  console.log('进入ajaxHook', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));

  function getCacheKey(request: AjaxHookRequest) {
    const url = request.url?.startsWith('http') ? request.url : window.location.origin + request.url;
    return generateCacheKey(normalizeUrl(url), request.data, request.method);
  }

  function checkStatus(request: AjaxHookRequest, respone: AjaxHookResponse, cacheKey: string) {
    let status = ProcessStatus.CACHE;
    const isError = serverTempErrorCodes.includes(respone.status);
    const isHasCacheData = cacheManager.has(cacheKey);
    if (isError && !isHasCacheData) status = ProcessStatus.ERROR_NO_CACHE;
    else if (isError && isHasCacheData) status = ProcessStatus.RECOVERY;
    else if (!isError) status = ProcessStatus.CACHE;
    return { status };
  }

  function filterSituation(resp) {
    if (!resp) return false;
    const { responseHeaders } = resp;
    if (!/json|(\+json)|(\/json)/i.test(responseHeaders['content-type'])) return false;

    const responseData = resp.responseText || resp.response;
    if (responseData) {
      const trimmedData = responseData.toString().trim();
      const isJsonObject = trimmedData.startsWith('{') && trimmedData.endsWith('}');
      const isJsonArray = trimmedData.startsWith('[') && trimmedData.endsWith(']');
      if (!isJsonObject && !isJsonArray) return false;
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
    let mockResponse = true;
    let mockRequestBody = false;

    console.log('启动ajaxHook', dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'));

    if (monitorEnabled || (urlMatch && disasterRecoveryProcessing)) {
      const ajaxHooker = ajaxInterface();
      ajaxHooker.hook(async (request: AjaxHookRequest) => {
        while (!window.__HOOK_CFG) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        if (!alreadyConfigInit) {
          const cfg = window.__HOOK_CFG;
          monitorEnabled = cfg.monitorEnabled;
          disasterRecoveryProcessing = cfg.disasterRecoveryProcessing;
          mockList = cfg.mockList || [];
          mockEnabled = cfg.mockEnabled;
          urlMatch = cfg.urlMatch;
          isPathMatch = cfg.isPathMatch;
          mockResponse = cfg.mockResponse;
          mockRequestBody = cfg.mockRequestBody;
          alreadyConfigInit = true;
        }

        const cacheKey = getCacheKey(request);
        if (mockEnabled) {
          const isFindMock = mockList.find((item: any) => {
            if (isPathMatch) {
              const apartCurUrl = urlApart(request.url?.startsWith('http') ? request.url : window.location.origin + request.url);
              return `${item.origin}${item.purePath}` === `${apartCurUrl.origin}${apartCurUrl.purePath}` && item.method === request.method;
            }
            return item.cacheKey === cacheKey;
          });
          if (isFindMock) {
            if (mockResponse) request.data = isFindMock.params;
            if (mockRequestBody) request.data = isFindMock.params;
          }
        }

        request.response = async (resp: AjaxHookResponse) => {
          if (!filterSituation(resp)) return;
          ajaxHooker.modifyJsonResponse(request, resp, (json: Record<string, any>) => {
            const { status } = checkStatus(request, resp, cacheKey);
            if (monitorEnabled) {
              let isMock = false;
              let mockData = json;
              if (mockEnabled) {
                const isFindMock = mockList.find((item: any) => {
                  if (isPathMatch) {
                    const apartCurUrl = urlApart(request.url?.startsWith('http') ? request.url : window.location.origin + request.url);
                    return `${item.origin}${item.purePath}` === `${apartCurUrl.origin}${apartCurUrl.purePath}` && item.method === request.method;
                  }
                  return item.cacheKey === cacheKey;
                });
                if (isFindMock && mockResponse) {
                  json = isFindMock.response;
                  mockData = isFindMock.response;
                  resp.status = 200;
                  resp.statusText = 'OK';
                  isMock = true;
                }
              }
              customEventSend('ajaxHook_to_content', {
                type: 'currentRequest',
                message: { url: resp.finalUrl, method: request.method, params: request.data, response: mockData, cacheKey, headers: request.headers, time: new Date().getTime(), isMock },
              });
              if (isMock) return json;
            }

            if (disasterRecoveryProcessing) {
              switch (status) {
                case ProcessStatus.RECOVERY:
                  resp.status = 200;
                  resp.statusText = 'OK';
                  const cachedData = cacheManager.get(cacheKey);
                  json = cachedData ? cachedData.cacheResponse : json;
                  customEventSend('ajaxHook_to_content', { type: 'cache_hit', message: { url: resp.finalUrl, method: request.method, params: request.data, response: json, cacheKey } });
                  break;
                case ProcessStatus.CACHE:
                  cacheManager.set(cacheKey, { cacheResponse: json, cacheReqParams: request.data });
                  break;
              }
            }
            return json;
          });
        };
      });

      window.addEventListener('content_to_ajaxHook', (event) => {
        const { detail: { type, message } = {} } = event || {};
        if (type?.endsWith('_change')) {
          const variableName = type.replace('_change', '');
          eval(`${variableName} = message`);
        }
      });
    }
  }

  beginHook();
});
