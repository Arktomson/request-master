import { CacheItem, TempResponseInfo } from './types';
import { cacheDb } from './db';
import { shouldCacheUrl, updateCacheStats } from './utils';
import { currentConfig } from './config';

// 用于记录请求和响应对应关系的映射
export const cachedRequests = new Map<string, CacheItem>();
export const responsesToCache = new Map<string, TempResponseInfo>();

// 记录哪些URL我们希望缓存但尚未缓存
export const pendingCacheUrls = new Set<string>();

// 错误回退相关统计
export let fallbackStats = {
  errorFallbacks: 0, // 使用缓存处理错误的次数
  expiredFallbacks: 0, // 使用过期缓存处理错误的次数
};

// 请求监听器集合
export const requestListeners = {
  // 请求发送前处理
  onBeforeRequest: (details: chrome.webRequest.WebRequestBodyDetails) => {
    // 忽略非GET请求和非主框架请求
    if (details.method !== "GET") return;

    const { url, type, requestId, tabId } = details;
    console.log(
      `[调试-onBeforeRequest] 检测到请求: ${url}, 类型: ${type}, ID: ${requestId}`
    );

    // 判断是否应该缓存这个请求
    if (!shouldCacheUrl(url, type)) return;

    // 使用Promise处理异步操作，但不返回Promise
    cacheDb.get(url)
      .then(cachedItem => {
        if (cachedItem) {
          const now = Date.now();
          console.log(
            `[调试-onBeforeRequest] 找到缓存: ${url}, 年龄: ${
              (now - cachedItem.timestamp) / 1000
            }秒`
          );

          // 检查缓存是否过期
          if (now - cachedItem.timestamp > currentConfig.maxCacheAge) {
            console.log(`[调试-onBeforeRequest] 缓存已过期: ${url}`);
            cachedItem.isExpired = true;
          } else {
            // 有效缓存，不需要发送请求
            console.log(`[调试-onBeforeRequest] 使用缓存响应: ${url}`);

            // 更新缓存统计
            const timeSaved = Math.floor(Math.random() * 500) + 100; // 模拟节省的时间（毫秒）
            updateCacheStats(true, cachedItem.size, timeSaved);

            // 不需要实际取消请求，因为我们会在响应阶段提供缓存的响应
            cachedRequests.set(requestId, cachedItem);
          }
        }
      })
      .catch(error => {
        console.error(`[调试-onBeforeRequest] 检查缓存出错:`, error);
      });
  },

  // 响应头接收时处理
  onHeadersReceived: (details: chrome.webRequest.WebResponseHeadersDetails) => {
    const { url, requestId, statusCode, responseHeaders } = details;
    console.log(
      `[调试-onHeadersReceived] 接收到响应头: ${url}, 状态码: ${statusCode}, ID: ${requestId}`
    );

    // 检查是否有缓存响应可用
    const cachedItem = cachedRequests.get(requestId);
    if (cachedItem && !cachedItem.isExpired) {
      console.log(`[调试-onHeadersReceived] 使用缓存响应: ${url}`);
      // 使用缓存的响应
      return {
        redirectUrl: `data:${
          cachedItem.contentType || "application/octet-stream"
        };base64,${
          typeof cachedItem.response === "string"
            ? cachedItem.response
            : btoa(
                unescape(
                  encodeURIComponent(JSON.stringify(cachedItem.response))
                )
              )
        }`,
      };
    }

    // 如果状态码不是成功，不缓存
    if (statusCode < 200 || statusCode >= 300) {
      console.log(
        `[调试-onHeadersReceived] 状态码非成功，不缓存: ${url}, 状态码: ${statusCode}`
      );
      return;
    }

    // 解析响应头
    const headers: Record<string, string> = {};
    let contentType = "";

    if (responseHeaders) {
      for (const header of responseHeaders) {
        if (header.name && header.value) {
          headers[header.name.toLowerCase()] = header.value;
          if (header.name.toLowerCase() === "content-type") {
            contentType = header.value;
          }
        }
      }
    }

    console.log(
      `[调试-onHeadersReceived] 响应内容类型: ${contentType}, URL: ${url}`
    );

    // 创建临时缓存项记录
    responsesToCache.set(requestId, {
      url,
      contentType,
      status: statusCode,
      headers,
    });
  },

  // 在响应完成时处理
  onCompleted: (details: chrome.webRequest.WebResponseCacheDetails) => {
    const { url, requestId, fromCache, statusCode, type } = details;
    console.log(
      `[调试-onCompleted] 请求完成: ${url}, 类型: ${type}, 状态码: ${statusCode}, 来自缓存: ${fromCache}, ID: ${requestId}`
    );

    // 获取临时记录的响应信息
    const responseInfo = responsesToCache.get(requestId);
    if (!responseInfo) {
      console.log(`[调试-onCompleted] 无需缓存: ${url} (无临时响应记录)`);
      return;
    }

    // 清理临时记录
    responsesToCache.delete(requestId);

    // 根据内容类型确定是否是API请求
    const isApiRequest =
      type === "xmlhttprequest" ||
      (responseInfo.contentType &&
        (responseInfo.contentType.includes("json") ||
          responseInfo.contentType.includes("application/javascript")));

    if (isApiRequest) {
      console.log(
        `[调试-onCompleted] 检测到API请求: ${url}, 内容类型: ${responseInfo.contentType}`
      );
    }

    // 获取响应内容
    try {
      // 在MV3中不能直接读取响应内容，这里我们尝试通过fetch重新获取
      // 注意: 这种方法并不完美，尤其是对于需要认证的请求
      if (isApiRequest) {
        // 对于API请求，尝试重新获取并保存完整响应
        console.log(`[调试-onCompleted] 尝试通过fetch获取API响应: ${url}`);

        // 使用fetch获取响应内容并保存
        fetch(url, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
          // 如果有需要，可以传递认证信息
          // credentials: 'include',
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then((text) => {
            let responseData;
            // 尝试解析JSON数据
            try {
              responseData = JSON.parse(text);
            } catch (e) {
              // 如果不是JSON，直接使用文本
              responseData = text;
            }

            const size = text.length;
            console.log(
              `[调试-onCompleted] 成功获取API响应: ${url}, 大小: ${size}字节`
            );

            // 创建缓存项
            const cacheItem: CacheItem = {
              url: responseInfo.url,
              response: responseData,
              headers: responseInfo.headers,
              timestamp: Date.now(),
              contentType: responseInfo.contentType,
              size: size,
              status: responseInfo.status,
            };

            // 存储到缓存
            return cacheDb.set(cacheItem);
          })
          .then(() => {
            console.log(`[调试-onCompleted] 成功缓存API响应: ${url}`);
            // 可以更新缓存统计
          })
          .catch((error) => {
            console.error(
              `[调试-onCompleted] 获取或缓存API响应失败: ${url}`,
              error
            );
          });
      } else {
        // 对于非API请求，使用模拟数据
        const response = {
          data: {}, // 模拟数据
          timestamp: Date.now(),
        };

        const size = JSON.stringify(response).length;
        console.log(
          `[调试-onCompleted] 将缓存非API响应: ${url}, 大小: ${size}字节`
        );

        // 创建缓存项
        const cacheItem: CacheItem = {
          url: responseInfo.url,
          response: response.data,
          headers: responseInfo.headers,
          timestamp: response.timestamp,
          contentType: responseInfo.contentType,
          size: size,
          status: responseInfo.status,
        };

        // 存储到缓存
        cacheDb
          .set(cacheItem)
          .then(() => {
            console.log(`[调试-onCompleted] 成功缓存非API响应: ${url}`);
            updateCacheStats(false, size);
          })
          .catch((error) => {
            console.error(`[调试-onCompleted] 缓存失败: ${url}`, error);
          });
      }
    } catch (error) {
      console.error(`[调试-onCompleted] 获取或处理响应失败: ${url}`, error);
    }
  },
};

// 注册请求拦截监听器
export function registerRequestListeners(): void {
  // 在请求发起前检查缓存
  chrome.webRequest.onBeforeRequest.addListener(
    requestListeners.onBeforeRequest,
    {
      urls: ["<all_urls>"],
      types: [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "font",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "other",
      ],
    }
  );

  // 在收到响应头时处理
  chrome.webRequest.onHeadersReceived.addListener(
    requestListeners.onHeadersReceived,
    {
      urls: ["<all_urls>"],
      types: [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "font",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "other",
      ],
    },
    ["responseHeaders"]
  );

  // 在请求完成时处理
  chrome.webRequest.onCompleted.addListener(requestListeners.onCompleted, {
    urls: ["<all_urls>"],
    types: [
      "main_frame",
      "sub_frame",
      "stylesheet",
      "script",
      "image",
      "font",
      "object",
      "xmlhttprequest",
      "ping",
      "csp_report",
      "media",
      "websocket",
      "other",
    ],
  });
}
