// @ts-nocheck
/**
 * 简化的Ajax拦截器 - 专为Chrome扩展优化
 * 去掉了复杂的类结构、Proxy系统和兼容性代码
 * 保持API兼容性的同时大幅简化实现
 */

interface SimpleRequest {
  type: 'xhr' | 'fetch';
  url: string;
  method: string;
  headers: Record<string, string>;
  data: any;
  response?: (response: SimpleResponse) => any;
  abort?: boolean;
  async: boolean;
}

interface SimpleResponse {
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseText?: string;
  response?: string;
  json?: any;
  text?: string;
  finalUrl: string;
}

interface Filter {
  type?: string;
  url?: string | RegExp;
  method?: string;
  async?: boolean;
}

export const ajaxInterface = function() {
  const version = '2.0.0-simplified';
  
  // 简化的状态管理
  const state = {
    hooks: [],
    filters: [],
    isPatched: false,
    originalXHR: window.XMLHttpRequest,
    originalFetch: window.fetch,
  };

  // 工具函数
  function parseHeaders(obj: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (!obj) return headers;
    
    if (typeof obj === 'string') {
      for (const line of obj.trim().split(/[\r\n]+/)) {
        const [header, value] = line.split(/\s*:\s*/);
        if (header) {
          headers[header.toLowerCase()] = value;
        }
      }
    } else if (obj instanceof Headers) {
      for (const [key, val] of obj.entries()) {
        headers[key.toLowerCase()] = val;
      }
    } else if (typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj)) {
        headers[key.toLowerCase()] = val as string;
      }
    }
    
    return headers;
  }

  function shouldIntercept(request: SimpleRequest): boolean {
    if (!state.filters.length) return true;
    
    return state.filters.some(filter => {
      if (filter.type && filter.type !== request.type) return false;
      
      if (filter.url) {
        if (typeof filter.url === 'string') {
          if (!request.url.includes(filter.url)) return false;
        } else if (filter.url instanceof RegExp) {
          if (!filter.url.test(request.url)) return false;
        }
      }
      
      if (filter.method && filter.method.toUpperCase() !== request.method.toUpperCase()) return false;
      if ('async' in filter && filter.async !== request.async) return false;
      
      return true;
    });
  }

  function executeHooks(request: SimpleRequest): void {
    if (!shouldIntercept(request)) return;
    
    state.hooks.forEach(hook => {
      try {
        hook(request);
      } catch (error) {
        console.error('Hook execution error:', error);
      }
    });
  }

  async function executeResponseHook(request: SimpleRequest, response: SimpleResponse): Promise<void> {
    if (typeof request.response === 'function') {
      try {
        await request.response(response);
      } catch (error) {
        console.error('Response hook execution error:', error);
      }
    }
  }

  // XMLHttpRequest拦截 - 简化版本
  function patchXHR(): void {
    if (!state.originalXHR) return;
    
    window.XMLHttpRequest = function() {
      const xhr = new state.originalXHR();
      let request: SimpleRequest | null = null;
      
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      const originalSetRequestHeader = xhr.setRequestHeader;
      
      xhr.open = function(method: string, url: string, async: boolean = true, ...args: any[]) {
        request = {
          type: 'xhr',
          url: url.toString(),
          method: method.toUpperCase(),
          headers: {},
          data: null,
          response: null,
          abort: false,
          async: !!async
        };
        
        return originalOpen.call(this, method, url, async, ...args);
      };
      
      xhr.setRequestHeader = function(header: string, value: string) {
        if (request) {
          request.headers[header.toLowerCase()] = value;
        }
        return originalSetRequestHeader.call(this, header, value);
      };
      
      xhr.send = function(data?: any) {
        if (!request) return originalSend.call(this, data);
        
        request.data = data;
        executeHooks(request);
        
        // Mock响应处理
        if (request.abort && typeof request.response === 'function') {
          const mockResponse: SimpleResponse = {
            status: 200,
            statusText: 'OK',
            responseHeaders: {},
            finalUrl: request.url,
            responseText: '{}',
            response: '{}'
          };
          
          setTimeout(async () => {
            Object.defineProperty(xhr, 'status', { value: 200, configurable: true });
            Object.defineProperty(xhr, 'statusText', { value: 'OK', configurable: true });
            Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
            Object.defineProperty(xhr, 'responseURL', { value: request.url, configurable: true });
            
            await executeResponseHook(request, mockResponse);
            
            xhr.dispatchEvent(new Event('readystatechange'));
            xhr.dispatchEvent(new Event('load'));
            xhr.dispatchEvent(new Event('loadend'));
          }, 0);
          
          return;
        }
        
        // 响应拦截
        if (typeof request.response === 'function') {
          const originalOnReadyStateChange = xhr.onreadystatechange;
          
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              const response: SimpleResponse = {
                status: xhr.status,
                statusText: xhr.statusText,
                responseHeaders: parseHeaders(xhr.getAllResponseHeaders()),
                finalUrl: xhr.responseURL || request.url,
                responseText: xhr.responseText,
                response: xhr.response
              };
              
              executeResponseHook(request, response).then(() => {
                // 应用响应修改
                if (response.responseText !== undefined) {
                  Object.defineProperty(xhr, 'responseText', { 
                    value: response.responseText, 
                    configurable: true 
                  });
                }
                if (response.response !== undefined) {
                  Object.defineProperty(xhr, 'response', { 
                    value: response.response, 
                    configurable: true 
                  });
                }
                Object.defineProperty(xhr, 'status', { 
                  value: response.status, 
                  configurable: true 
                });
                Object.defineProperty(xhr, 'statusText', { 
                  value: response.statusText, 
                  configurable: true 
                });
                
                if (originalOnReadyStateChange) {
                  originalOnReadyStateChange.call(this);
                }
              });
            } else {
              if (originalOnReadyStateChange) {
                originalOnReadyStateChange.call(this);
              }
            }
          };
        }
        
        return originalSend.call(this, request.data);
      };
      
      return xhr;
    };
    
    // 复制静态属性
    Object.keys(state.originalXHR).forEach(key => {
      (window.XMLHttpRequest as any)[key] = (state.originalXHR as any)[key];
    });
    window.XMLHttpRequest.prototype = state.originalXHR.prototype;
  }

  // Fetch拦截 - 简化版本
  function patchFetch(): void {
    if (!state.originalFetch) return;
    
    window.fetch = async function(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
      let url: string;
      let requestInit = { ...init };
      
      // 处理Request对象
      if (input instanceof Request) {
        const reqClone = input.clone();
        url = reqClone.url;
        
        if (!requestInit.method) requestInit.method = reqClone.method;
        if (!requestInit.headers) {
          requestInit.headers = {};
          for (const [key, value] of reqClone.headers.entries()) {
            (requestInit.headers as any)[key] = value;
          }
        }
        if (!requestInit.body && reqClone.body) {
          requestInit.body = await reqClone.arrayBuffer();
        }
      } else {
        url = input.toString();
      }
      
      const request: SimpleRequest = {
        type: 'fetch',
        url: url,
        method: (requestInit.method || 'GET').toUpperCase(),
        headers: parseHeaders(requestInit.headers),
        data: requestInit.body,
        response: null,
        abort: false,
        async: true
      };
      
      executeHooks(request);
      
      // Mock响应处理
      if (request.abort && typeof request.response === 'function') {
        const mockResponse: SimpleResponse = {
          status: 200,
          statusText: 'OK', 
          responseHeaders: {},
          finalUrl: request.url
        };
        
        await executeResponseHook(request, mockResponse);
        
        let body = '{}';
        if (mockResponse.json !== undefined) {
          body = JSON.stringify(mockResponse.json);
        } else if (mockResponse.text !== undefined) {
          body = mockResponse.text;
        } else if (mockResponse.responseText !== undefined) {
          body = mockResponse.responseText;
        }
        
        const response = new Response(body, {
          status: mockResponse.status,
          statusText: mockResponse.statusText,
          headers: mockResponse.responseHeaders
        });
        
        Object.defineProperty(response, 'url', { value: request.url, configurable: true });
        return response;
      }
      
      requestInit.method = request.method;
      requestInit.headers = request.headers;
      requestInit.body = request.data;
      
      const response = await state.originalFetch.call(window, request.url, requestInit);
      
      // 响应拦截
      if (typeof request.response === 'function') {
        const responseObj: SimpleResponse = {
          status: response.status,
          statusText: response.statusText,
          responseHeaders: parseHeaders(response.headers),
          finalUrl: response.url
        };
        
        const responseClone = response.clone();
        
        // 代理json方法
        response.json = async function() {
          if (responseObj.json !== undefined) {
            return Promise.resolve(responseObj.json);
          }
          
          const jsonData = await responseClone.json();
          responseObj.json = jsonData;
          responseObj.responseText = JSON.stringify(jsonData);
          responseObj.text = JSON.stringify(jsonData);
          
          await executeResponseHook(request, responseObj);
          return responseObj.json !== undefined ? responseObj.json : jsonData;
        };
        
        // 代理text方法
        response.text = async function() {
          if (responseObj.text !== undefined) {
            return Promise.resolve(responseObj.text);
          }
          
          const textData = await responseClone.text();
          responseObj.text = textData;
          responseObj.responseText = textData;
          
          try {
            responseObj.json = JSON.parse(textData);
          } catch (e) {
            // 非JSON格式，忽略
          }
          
          await executeResponseHook(request, responseObj);
          return responseObj.text !== undefined ? responseObj.text : textData;
        };
      }
      
      return response;
    };
  }

  function modifyJsonResponse(req: SimpleRequest, res: SimpleResponse, modifier: (json: any) => any): SimpleResponse {
    try {
      let jsonData: any;
      
      if (req.type === 'fetch') {
        if (res.json !== undefined) {
          jsonData = res.json;
        } else if (res.text !== undefined) {
          jsonData = JSON.parse(res.text);
        }
      } else {
        if (res.responseText) {
          jsonData = JSON.parse(res.responseText);
        } else if (res.response) {
          jsonData = typeof res.response === 'string' ? JSON.parse(res.response) : res.response;
        }
      }
      
      const modifiedData = modifier(jsonData);
      
      if (req.type === 'fetch') {
        res.json = modifiedData;
        res.text = JSON.stringify(modifiedData);
        res.responseText = JSON.stringify(modifiedData);
      } else {
        res.responseText = JSON.stringify(modifiedData);
        res.response = JSON.stringify(modifiedData);
      }
      
    } catch (error) {
      console.error('修改JSON响应时出错:', error);
    }
    
    return res;
  }

  // 初始化
  if (!state.isPatched) {
    patchXHR();
    patchFetch();
    state.isPatched = true;
  }
  
  // API - 保持与原版完全兼容
  const api = {
    hook: (fn: (request: SimpleRequest) => void) => {
      state.hooks.push(fn);
    },
    
    filter: (filters: Filter[]) => {
      if (Array.isArray(filters)) {
        state.filters = filters;
      }
    },
    
    protect: () => {
      Object.defineProperty(window, 'XMLHttpRequest', {
        value: window.XMLHttpRequest,
        writable: false,
        configurable: false
      });
      Object.defineProperty(window, 'fetch', {
        value: window.fetch,
        writable: false,
        configurable: false
      });
    },
    
    unhook: () => {
      window.XMLHttpRequest = state.originalXHR;
      window.fetch = state.originalFetch;
      state.hooks = [];
      state.filters = [];
      state.isPatched = false;
    },
    
    modifyJsonResponse: modifyJsonResponse
  };

  // 自动发送请求事件 - 保持与原版兼容
  api.hook(function(request: SimpleRequest) {
    try {
      const requestData = {
        url: request.url,
        method: request.method,
        headers: request.headers,
        data: request.data,
        type: request.type,
      };
      window.dispatchEvent(
        new CustomEvent('ajaxHook_request', {
          detail: JSON.stringify(requestData),
        })
      );
    } catch (e) {
      console.error('发送请求事件失败:', e);
    }
  });

  // 全局访问点 - 保持与原版兼容
  window.__ajaxHookerExtension = api;
  
  return api;
};