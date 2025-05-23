/**
 * Mock请求拦截器
 * 用于拦截页面上的XMLHttpRequest和fetch请求并根据配置返回模拟数据
 */

import { chromeLocalStorage } from '@/utils';

// 定义Mock的数据结构
interface MockItem {
  url: string;
  method: string;
  enabled: boolean;
  delay: number;
  response: string;
}

// 扩展XMLHttpRequest接口，添加自定义属性
interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _mockMethod?: string;
  _mockUrl?: string;
}

// 原始的XHR open方法
const originalXhrOpen = XMLHttpRequest.prototype.open;
// 原始的XHR send方法
const originalXhrSend = XMLHttpRequest.prototype.send;
// 原始的fetch方法
const originalFetch = window.fetch;

// 检查URL是否匹配
function isUrlMatch(pattern: string, url: string): boolean {
  // 转换为正则表达式安全的字符串
  const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  
  // 替换:param为任意值匹配
  const regexPattern = escapedPattern
    .replace(/(:\\w+)/g, '([^/]+)') // 转换 :param 为 ([^/]+)
    .replace(/\*/g, '.*');          // 转换 * 为 .*
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}

// 查找匹配的Mock配置
async function findMatchingMock(url: string, method: string): Promise<MockItem | null> {
  // 检查Mock功能是否开启
  const mockEnabled = await chromeLocalStorage.get('mockEnabled');
  if (!mockEnabled) {
    return null;
  }
  
  // 获取所有Mock配置
  const mockList: MockItem[] = await chromeLocalStorage.get('mockList') || [];
  
  // 查找匹配项
  const matchedMock = mockList.find(mock => 
    mock.enabled && 
    mock.method.toUpperCase() === method.toUpperCase() && 
    isUrlMatch(mock.url, url)
  );
  
  return matchedMock || null;
}

// 从请求对象中获取URL
function getUrlFromRequest(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  } else if (input instanceof URL) {
    return input.href;
  } else {
    return input.url;
  }
}

// 拦截XMLHttpRequest
function interceptXhr() {
  XMLHttpRequest.prototype.open = function(
    this: ExtendedXMLHttpRequest,
    method: string, 
    url: string | URL, 
    async?: boolean, 
    username?: string | null, 
    password?: string | null
  ) {
    // 保存请求信息到this对象上
    this._mockMethod = method;
    this._mockUrl = url.toString();
    
    // 调用原始方法
    return originalXhrOpen.call(this, method, url, async === undefined ? true : async, username, password);
  };
  
  XMLHttpRequest.prototype.send = function(this: ExtendedXMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this as ExtendedXMLHttpRequest;
    const method = xhr._mockMethod || 'GET';
    const url = xhr._mockUrl || '';
    
    // 查找匹配的Mock
    findMatchingMock(url, method).then(mock => {
      if (mock) {
        // 找到匹配的Mock，模拟响应
        setTimeout(() => {
          try {
            // 模拟响应过程
            const responseData = JSON.parse(mock.response);
            
            // 设置响应状态
            Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
            Object.defineProperty(xhr, 'status', { value: 200, configurable: true });
            Object.defineProperty(xhr, 'statusText', { value: 'OK', configurable: true });
            
            // 设置响应内容
            Object.defineProperty(xhr, 'response', { value: responseData, configurable: true });
            Object.defineProperty(xhr, 'responseText', { 
              value: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
              configurable: true
            });
            
            // 触发事件
            xhr.dispatchEvent(new Event('readystatechange'));
            xhr.dispatchEvent(new Event('load'));
            
            // 日志
            console.log(`[Mock] 已拦截XHR请求: ${method} ${url}`);
          } catch (e) {
            console.error('[Mock] 模拟XHR响应失败:', e);
            // 错误时调用原始方法
            originalXhrSend.call(xhr, body);
          }
        }, mock.delay);
      } else {
        // 没有找到匹配的Mock，调用原始方法
        originalXhrSend.call(xhr, body);
      }
    }).catch(error => {
      console.error('[Mock] 查找匹配项失败:', error);
      originalXhrSend.call(xhr, body);
    });
  };
}

// 拦截fetch
function interceptFetch() {
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // 获取请求URL和方法
    const url = getUrlFromRequest(input);
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    
    // 查找匹配的Mock
    return findMatchingMock(url, method).then(mock => {
      if (mock) {
        // 找到匹配的Mock，模拟响应
        return new Promise(resolve => {
          setTimeout(() => {
            try {
              const responseData = JSON.parse(mock.response);
              const responseInit: ResponseInit = {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/json',
                  'X-Mocked': 'true'
                })
              };
              
              const responseBody = JSON.stringify(responseData);
              const response = new Response(responseBody, responseInit);
              
              // 日志
              console.log(`[Mock] 已拦截Fetch请求: ${method} ${url}`);
              resolve(response);
            } catch (e) {
              // 解析响应数据失败，返回错误
              console.error(`[Mock] 解析响应数据失败: ${e}`);
              resolve(new Response(JSON.stringify({ error: 'Invalid mock data' }), { 
                status: 500 
              }));
            }
          }, mock.delay);
        });
      } else {
        // 没有找到匹配的Mock，调用原始方法
        return originalFetch(input, init);
      }
    }).catch(error => {
      console.error('[Mock] 查找匹配项失败:', error);
      return originalFetch(input, init);
    });
  };
}

// 初始化拦截器
export function initMockInterceptor() {
  console.log('[Mock] 初始化Mock拦截器');
  
  try {
    // 注入拦截器
    interceptXhr();
    interceptFetch();
    
    console.log('[Mock] 拦截器已启用');
  } catch (e) {
    console.error('[Mock] 初始化拦截器失败:', e);
  }
} 