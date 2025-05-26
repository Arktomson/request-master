// @ts-nocheck
// @rollup-plugin-ignore

import { ProcessStatus, serverTempErrorCodes } from "@/config";
import { AjaxHookRequest, AjaxHookResponse } from "@/types/ajaxHook";
import { generateCacheKey, normalizeUrl } from "@/utils";
import { ajaxInterface } from "./ajaxInterface";

const ajaxHooker = ajaxInterface();
function checkStatus(
  request: AjaxHookRequest,
  respone: AjaxHookResponse,
  cacheData: Record<string, any>
): {
  status: ProcessStatus;
  statusText: string;
  response: string;
} {
  let status = ProcessStatus.CACHE;
  let isHasCacheData = false;
  const isError = serverTempErrorCodes.includes(respone.status);
  const cacheKey = generateCacheKey(
    normalizeUrl(respone.finalUrl),
    request.data,
    request.method
  );
  if (cacheData[cacheKey]) {
    isHasCacheData = true;
  }
  if (isError && !isHasCacheData) {
    status = ProcessStatus.ERROR_NO_CACHE;
  } else if (isError && isHasCacheData) {
    status = ProcessStatus.RECOVERY;
  } else if (!isError && isHasCacheData) {
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
  if (!/json|(\+json)|(\/json)/i.test(responseHeaders["content-type"])) {
    return false;
  }
  return true;
}

// 添加消息监听器，允许content script控制
window.addEventListener("content_to_ajaxHook", (event) => {
  const {
    detail: { type, message },
  } = event;

  if (type === "init") {
    const cacheData = JSON.parse(
      localStorage.getItem("request_cache_data") || "{}"
    );
    ajaxHooker.hook((request: AjaxHookRequest) => {
      console.log("request ajaxHook", request,request.type);
      request.response = (resp: AjaxHookResponse) => {
        console.log("resp ajaxHook", resp);
        if (!filterSituation(resp)) {
          return resp;
        }

        return ajaxHooker.modifyJsonResponse(
          request,
          resp as AjaxHookResponse,
          (json: Record<string, any>) => {
            const { status, cacheKey } = checkStatus(request, resp, cacheData);
            switch (status) {
              case ProcessStatus.RECOVERY:
                console.log("命中缓存", cacheKey,request,resp);
                resp.status = 200;
                resp.statusText = "OK";
                json = cacheData[cacheKey].cacheResponse;

                window.dispatchEvent(
                  new CustomEvent("ajaxHook_to_content", {
                    detail: {
                      type: "cache_hit",
                      message: {
                        url: resp.finalUrl,
                        method: request.method,
                        params: request.data,
                        response: json,
                        cacheKey: cacheKey,
                      },
                    },
                  })
                );
                break;
              case ProcessStatus.CACHE:
                cacheData[cacheKey] = {
                  cacheResponse: json,
                  cacheReqParams: request.data,
                };
                localStorage.setItem(
                  "request_cache_data",
                  JSON.stringify(cacheData)
                );
                break;
              case ProcessStatus.ERROR_NO_CACHE:
                break;
            }

            return json; // 返回修改后的json
          }
        );
      };
    });
  }
});
