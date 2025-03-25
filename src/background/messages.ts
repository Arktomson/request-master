import { cacheDb } from './db';
import { getCacheStats } from './utils';
import { currentConfig } from './config';

// 用于追踪并防止重复响应的哈希表
export const pendingRequests = new Map();
// 请求限流：每个requestId的最后处理时间
export const requestsLastProcessed = new Map();
// 限制请求频率的时间间隔（毫秒）
export const REQUEST_THROTTLE_INTERVAL = 1000;

// 注册消息监听器
export function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const sourceInfo = sender?.tab ? `来自标签ID: ${sender.tab.id}` : '来自扩展内部';
    // 为消息生成唯一标识
    const requestId = message._requestId || message._timestamp || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`收到消息 [${new Date().toISOString()}] [ID: ${requestId}]:`, message, sourceInfo);

    try {
      // 处理旧的消息格式转换 (从 type 到 action)
      if (message.type === "CLEAR_CACHE") {
        message.action = "clearCache";
      }
      
      // 检查是否是getAllCache请求，并实施限流
      if (message.action === "getAllCache") {
        // 检查该请求是否正在处理中
        if (pendingRequests.has(requestId)) {
          console.warn(`检测到重复的getAllCache请求 [ID: ${requestId}]，忽略此次请求`);
          sendResponse({ 
            success: false, 
            error: '请求已在处理中，请勿重复发送',
            pendingRequestId: requestId 
          });
          return true;
        }
        
        // 检查请求频率限制
        const now = Date.now();
        const lastProcessed = requestsLastProcessed.get('getAllCache') || 0;
        if (now - lastProcessed < REQUEST_THROTTLE_INTERVAL) {
          console.warn(`getAllCache请求频率过高，距离上次请求仅 ${now - lastProcessed}ms，已被限流`);
          sendResponse({
            success: false,
            error: '请求频率过高，请稍后再试',
            throttled: true,
            retryAfter: REQUEST_THROTTLE_INTERVAL - (now - lastProcessed)
          });
          return true;
        }
        
        // 更新最后处理时间
        requestsLastProcessed.set('getAllCache', now);
        // 标记请求为处理中
        pendingRequests.set(requestId, true);
        console.log(`开始处理getAllCache请求 [请求ID: ${requestId}]`);
        
        // 直接尝试从缓存数据库获取数据
        try {
          cacheDb
            .getAll()
            .then((data) => {
              console.log(`成功获取到缓存数据，共 ${data.length} 条记录 [请求ID: ${requestId}]`);
              // 请求处理完成，移除标记
              pendingRequests.delete(requestId);
              
              // 确保返回的是数组
              if (!Array.isArray(data)) {
                console.warn(`从数据库获取的数据不是数组，将转换为空数组 [请求ID: ${requestId}]`);
                sendResponse({ success: true, data: [], requestId });
              } else {
                sendResponse({ success: true, data, requestId });
              }
            })
            .catch((error) => {
              console.error(`获取所有缓存失败 [请求ID: ${requestId}]:`, error);
              // 请求处理完成，移除标记
              pendingRequests.delete(requestId);
              // 返回更详细的错误信息以便于调试
              sendResponse({ 
                success: false, 
                error: String(error),
                errorObj: {
                  message: error.message || '未知错误',
                  stack: error.stack || '无错误堆栈',
                  name: error.name || '错误'
                },
                requestId
              });
            });
        } catch (err) {
          // 捕获可能的同步错误
          console.error(`处理getAllCache请求时发生异常 [请求ID: ${requestId}]:`, err);
          // 请求处理完成，移除标记
          pendingRequests.delete(requestId);
          sendResponse({ 
            success: false, 
            error: String(err),
            errorDetails: 'getAllCache请求处理器中发生异常',
            requestId 
          });
        }
        return true;
      }
      
      // === 配置相关消息 ===
      // 处理获取配置请求
      if (message.type === "GET_CONFIG") {
        console.log('响应GET_CONFIG请求');
        sendResponse({ success: true, data: currentConfig });
        return true;
      }

      // 处理更新配置请求
      if (message.type === "UPDATE_CONFIG" && message.data) {
        console.log('更新缓存配置');
        Object.assign(currentConfig, message.data);
        chrome.storage.local.set({ cacheConfig: currentConfig });
        sendResponse({ success: true });
        return true;
      }

      // === 统计相关消息 ===
      // 处理获取缓存统计请求
      if (message.type === "GET_CACHE_STATS") {
        console.log('获取缓存统计信息');
        getCacheStats().then((stats) => {
          sendResponse({ success: true, data: stats });
        }).catch(err => {
          console.error('获取缓存统计失败:', err);
          sendResponse({ success: false, error: String(err) });
        });
        return true;
      }

      // === 缓存操作消息 ===
      // 处理清除缓存请求
      if (message.type === "CLEAR_CACHE" || message.action === "clearCache") {
        console.log("开始处理清除缓存请求");
        cacheDb
          .clear()
          .then(() => {
            console.log("缓存已成功清除");
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error("缓存清除失败:", error);
            sendResponse({ success: false, error: String(error) });
          });
        return true;
      }

      // 处理删除缓存请求
      if (message.action === "deleteCache" && message.url) {
        console.log("开始处理删除缓存请求:", message.url);
        cacheDb
          .delete(message.url)
          .then(() => {
            console.log("缓存已成功删除:", message.url);
            sendResponse({ success: true });
          })
          .catch((error) => {
            console.error("删除缓存失败:", error);
            sendResponse({ success: false, error: String(error) });
          });
        return true;
      }
      
      // 如果没有处理器匹配，返回未处理消息
      console.warn(`未知消息类型: ${message.type || message.action || '无类型'}`);
      sendResponse({ success: false, error: '未知消息类型' });
    } catch (globalError) {
      // 捕获所有可能的错误，确保消息处理器不会崩溃
      console.error('消息处理器发生异常:', globalError);
      // 如果是getAllCache请求，需要清理标记
      if (message.action === "getAllCache" && pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
      }
      sendResponse({ 
        success: false, 
        error: String(globalError), 
        critical: true,
        message: '消息处理器发生异常' 
      });
    }
    return true; // 始终保持通道打开，防止异步响应丢失
  });
}
