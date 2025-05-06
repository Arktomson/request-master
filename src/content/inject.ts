// 注入到页面的脚本

// 创建请求缓存拦截器对象
const request_cache_interceptor = {
  // 配置状态
  settings: {
    isActive: false, // 默认关闭状态
    rules: [], // 拦截规则
  },

  // 初始化拦截器
  init() {
    this.setupMessageListener();
    this.patchXHR();
    this.patchFetch();

    // 通知内容脚本已准备就绪
    window.postMessage(
      {
        type: "requestCache",
        to: "contentScript",
        action: "ready",
      },
      "*"
    );
  },

  // 设置消息监听
  setupMessageListener() {
    const self = this;

    window.addEventListener("message", function (event) {
      const data = event.data;

      // 判断消息是否为我们的拦截器配置
      if (data && data.type === "requestCache" && data.to === "pageScript") {
        // 更新激活状态
        if (data.key === "isActive") {
          self.settings.isActive = data.value;
        }

        // 更新拦截规则
        if (data.key === "rules") {
          self.settings.rules = data.value || [];
        }
      }
    });
  },

  // 保存原始XHR
  originalXHR: window.XMLHttpRequest,
  
  // 设置XHR拦截 - 采用类继承方式
  patchXHR() {
    if ((window.XMLHttpRequest as any).__intercepted__) {
      console.log("XHR已经被拦截，不再重复操作");
      return;
    }

    const OriginalXHR = this.originalXHR;
    const self = this;

    // 创建自定义XHR类，继承原生XHR
    class InterceptedXHR extends OriginalXHR {
      private _url: string;
      private _method: string;
      private _requestHeaders: Record<string, string> = {};
      private _requestBody: any;
      private _matchedRule: any;

      constructor() {
        super();
        
        // 添加readystatechange监听器用于修改响应
        this.addEventListener('readystatechange', () => {
          if (this.readyState === 4) {
            this._modifyResponse();
          }
        });
        
        // 添加错误和中止监听
        this.addEventListener('error', () => {
          console.log('XHR请求错误:', this._url);
        });
        
        this.addEventListener('abort', () => {
          console.log('XHR请求被中止:', this._url);
        });
      }

      // 拦截open方法
      open(method: string, url: string, async: boolean = true, username?: string, password?: string): void {
        this._method = method;
        this._url = url;
        
        // 匹配规则 (假设ajax_interceptor_qoweifjqon.getMatchedInterface存在)
        if (self.settings.isActive && typeof ajax_interceptor_qoweifjqon?.getMatchedInterface === 'function') {
          try {
            this._matchedRule = ajax_interceptor_qoweifjqon.getMatchedInterface({
              thisRequestUrl: ajax_interceptor_qoweifjqon.getCompleteUrl(url),
              thisMethod: method
            });
          } catch(e) {
            console.error('匹配规则时出错:', e);
          }
        }
        
        // 调用原始open
        super.open(method, url, async, username, password);
      }

      // 拦截setRequestHeader方法
      setRequestHeader(header: string, value: string): void {
        this._requestHeaders[header] = value;
        
        // 如果没有匹配规则或非专家模式，直接设置header
        if (!this._matchedRule || 
            !this._matchedRule.isExpert || 
            !this._matchedRule.overrideHeadersFunc) {
          super.setRequestHeader(header, value);
        }
      }

      // 拦截send方法
      send(body?: Document | XMLHttpRequestBodyInit | null): void {
        this._requestBody = body;
        
        // 如果有匹配规则且是专家模式
        if (this._matchedRule && this._matchedRule.isExpert) {
          // 处理headers
          if (this._matchedRule.overrideHeadersFunc) {
            try {
              const newHeaders = ajax_interceptor_qoweifjqon.executeStringFunction(
                this._matchedRule.overrideHeadersFunc, 
                this._requestHeaders,
                'headers'
              );
              
              // 设置处理后的headers
              if (newHeaders && typeof newHeaders === 'object') {
                Object.keys(newHeaders).forEach(key => {
                  super.setRequestHeader(key, newHeaders[key]);
                });
              }
            } catch(e) {
              console.error('处理请求头时出错:', e);
            }
          }
          
          // 处理非GET请求的body
          if (this._matchedRule.overridePayloadFunc && this._method.toUpperCase() !== 'GET') {
            try {
              body = ajax_interceptor_qoweifjqon.executeStringFunction(
                this._matchedRule.overridePayloadFunc,
                body,
                'payload'
              );
            } catch(e) {
              console.error('处理请求体时出错:', e);
            }
          }
        }
        
        // 调用原始send
        super.send(body);
      }

      // 用于修改响应的私有方法
      private _modifyResponse(): void {
        if (!this._matchedRule) return;
        
        // 只在匹配且有覆盖内容或函数时处理
        if (this._matchedRule.overrideTxt || this._matchedRule.overrideResponseFunc) {
          const { overrideTxt, overrideResponseFunc, match, isExpert = false } = this._matchedRule;
          
          let overrideResponse: any;
          let overrideStatus: number | undefined;
          let overrideStatusText: string | undefined;
          
          try {
            if (overrideTxt && !isExpert) {
              // 普通模式直接替换
              overrideResponse = overrideTxt;
              
              // 强制200状态码
              if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_always200On && this.status !== 200) {
                overrideStatus = 200;
                overrideStatusText = 'OK';
              }
            } else if (overrideResponseFunc && isExpert) {
              // 专业模式，通过函数替换
              const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(this._url);
              
              const funcArgs = {
                method: this._method,
                payload: {
                  queryParams,
                  requestPayload: this._requestBody
                },
                orgResponse: this.response,
                orgStatus: this.status,
                orgStatusText: this.statusText
              };
              
              const res = ajax_interceptor_qoweifjqon.executeStringFunction(
                overrideResponseFunc, 
                funcArgs, 
                'response'
              );
              
              // 处理函数返回值
              if (typeof res === 'object' && res !== null) {
                const {
                  response: newResponse = undefined,
                  status: newStatus = undefined,
                  statusText: newStatusText = undefined
                } = res;
                
                overrideResponse = newResponse;
                overrideStatus = newStatus;
                overrideStatusText = newStatusText;
              } else {
                console.error(`[请求缓存] 执行函数错误: 请检查response函数的返回值格式`);
              }
            }
            
            // 修改响应
            if (overrideResponse !== undefined) {
              Object.defineProperty(this, 'responseText', { 
                configurable: true,
                value: typeof overrideResponse === 'string' ? overrideResponse : JSON.stringify(overrideResponse)
              });
              Object.defineProperty(this, 'response', { 
                configurable: true,
                value: overrideResponse 
              });
            }
            
            // 修改状态码
            if (overrideStatus !== undefined) {
              Object.defineProperty(this, 'status', { 
                configurable: true,
                value: overrideStatus 
              });
            }
            
            // 修改状态文本
            if (overrideStatusText !== undefined) {
              Object.defineProperty(this, 'statusText', { 
                configurable: true,
                value: overrideStatusText 
              });
            }
            
            // 触发事件通知
            window.dispatchEvent(new CustomEvent("pageScript", {
              detail: {
                url: this.responseURL || this._url,
                match
              }
            }));
          } catch(e) {
            console.error('修改响应时出错:', e);
          }
        }
      }
    }

    // 标记已拦截
    (window.XMLHttpRequest as any).__intercepted__ = true;
    
    // 替换全局XMLHttpRequest
    window.XMLHttpRequest = InterceptedXHR as any;
    
    console.log("成功拦截XMLHttpRequest");
  },

  // 恢复原始XHR
  unpatchXHR() {
    if ((window.XMLHttpRequest as any).__intercepted__) {
      window.XMLHttpRequest = this.originalXHR;
      console.log("已恢复原始XMLHttpRequest");
    }
  },

  // 保存原始fetch
  originalFetch: window.fetch,
  
  // 设置Fetch拦截
  patchFetch() {
    if ((window.fetch as any).__intercepted__) {
      console.log("fetch已经被拦截，不再重复操作");
      return;
    }

    const originalFetch = this.originalFetch;
    const self = this;

    // 替换全局fetch函数
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      // 如果拦截器未激活，直接使用原始fetch
      if (!self.settings.isActive) {
        return originalFetch.call(this, input, init);
      }

      // 提取请求信息
      let url: string;
      let method = (init?.method || 'GET').toUpperCase();
      let headers = init?.headers || {};
      let body = init?.body;
      
      // 处理不同类型的input参数
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method || method;
        
        // 合并Request对象的headers和init的headers
        const requestHeaders = {};
        if (input.headers) {
          input.headers.forEach((value, key) => {
            requestHeaders[key] = value;
          });
        }
        headers = { ...requestHeaders, ...(init?.headers ? init.headers : {}) };
        
        // 如果init中没有指定body，使用Request的body
        if (!init?.body && input.body) {
          body = input.body;
        }
      } else {
        url = String(input);
      }
      
      // 匹配规则
      let matchedRule;
      if (typeof ajax_interceptor_qoweifjqon?.getMatchedInterface === 'function') {
        try {
          matchedRule = ajax_interceptor_qoweifjqon.getMatchedInterface({
            thisRequestUrl: ajax_interceptor_qoweifjqon.getCompleteUrl(url),
            thisMethod: method
          });
        } catch(e) {
          console.error('匹配fetch规则时出错:', e);
        }
      }
      
      // 如果没有匹配规则，直接使用原始fetch
      if (!matchedRule) {
        return originalFetch.call(this, input, init);
      }
      
      console.log("拦截到fetch请求:", url, method);
      
      // 处理请求
      if (matchedRule.isExpert) {
        // 处理headers
        if (matchedRule.overrideHeadersFunc) {
          try {
            const headersObj = {};
            
            // 将headers转为对象形式
            if (headers instanceof Headers) {
              headers.forEach((value, key) => {
                headersObj[key] = value;
              });
            } else if (Array.isArray(headers)) {
              // Headers作为 [key, value] 数组
              for (let i = 0; i < headers.length; i += 2) {
                if (i + 1 < headers.length) {
                  headersObj[headers[i]] = headers[i + 1];
                }
              }
            } else if (typeof headers === 'object') {
              Object.assign(headersObj, headers);
            }
            
            // 执行函数修改headers
            const newHeaders = ajax_interceptor_qoweifjqon.executeStringFunction(
              matchedRule.overrideHeadersFunc,
              headersObj,
              'headers'
            );
            
            // 更新headers
            if (newHeaders && typeof newHeaders === 'object') {
              headers = newHeaders;
            }
          } catch(e) {
            console.error('处理fetch请求头时出错:', e);
          }
        }
        
        // 处理请求体
        if (matchedRule.overridePayloadFunc) {
          try {
            if (method === 'GET') {
              // 处理GET请求的URL参数
              const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(url);
              const data = { requestUrl: url, queryParams };
              url = ajax_interceptor_qoweifjqon.executeStringFunction(
                matchedRule.overridePayloadFunc,
                data,
                'payload'
              );
            } else {
              // 处理非GET请求的请求体
              body = ajax_interceptor_qoweifjqon.executeStringFunction(
                matchedRule.overridePayloadFunc,
                body,
                'payload'
              );
            }
          } catch(e) {
            console.error('处理fetch请求体时出错:', e);
          }
        }
      }
      
      // 构建并发送修改后的请求
      let newInit: RequestInit = { ...init, method, headers, body };
      
      try {
        // 发送请求
        const response = await originalFetch.call(this, url, newInit);
        
        // 处理响应
        if (matchedRule.overrideTxt || matchedRule.overrideResponseFunc) {
          // 克隆响应避免body被消费
          const clonedResponse = response.clone();
          let responseData = await clonedResponse.text();
          
          try {
            // 尝试解析JSON
            responseData = JSON.parse(responseData);
          } catch {
            // 不是JSON，保持文本格式
          }
          
          let overrideResponse = responseData;
          let status = response.status;
          let statusText = response.statusText;
          
          if (matchedRule.overrideTxt && !matchedRule.isExpert) {
            // 普通模式，直接替换
            overrideResponse = matchedRule.overrideTxt;
            
            // 强制200状态码
            if (ajax_interceptor_qoweifjqon.settings.ajaxInterceptor_always200On && status !== 200) {
              status = 200;
              statusText = 'OK';
            }
          } else if (matchedRule.overrideResponseFunc && matchedRule.isExpert) {
            // 专业模式，执行函数
            const queryParams = ajax_interceptor_qoweifjqon.getRequestParams(url);
            
            const funcArgs = {
              method,
              payload: {
                queryParams,
                requestPayload: body
              },
              orgResponse: responseData,
              orgStatus: status,
              orgStatusText: statusText
            };
            
            const res = ajax_interceptor_qoweifjqon.executeStringFunction(
              matchedRule.overrideResponseFunc,
              funcArgs,
              'response'
            );
            
            // 处理函数返回值
            if (typeof res === 'object' && res !== null) {
              if (res.response !== undefined) overrideResponse = res.response;
              if (res.status !== undefined) status = res.status;
              if (res.statusText !== undefined) statusText = res.statusText;
            }
          }
          
          // 创建新的Response
          let newResponseBody: string;
          if (typeof overrideResponse === 'string') {
            newResponseBody = overrideResponse;
          } else {
            newResponseBody = JSON.stringify(overrideResponse);
          }
          
          // 复制原始响应的headers
          const newHeaders = new Headers();
          response.headers.forEach((value, key) => {
            newHeaders.append(key, value);
          });
          
          // 根据内容类型更新Content-Type
          if (typeof overrideResponse === 'object') {
            newHeaders.set('Content-Type', 'application/json; charset=utf-8');
          }
          
          // 构建新的Response对象
          const newResponse = new Response(newResponseBody, {
            status: status,
            statusText: statusText,
            headers: newHeaders
          });
          
          // 触发事件通知
          window.dispatchEvent(new CustomEvent("pageScript", {
            detail: {
              url: url,
              match: matchedRule.match
            }
          }));
          
          return newResponse;
        }
        
        // 如果没有修改响应，返回原始响应
        return response;
      } catch(error) {
        console.error('执行fetch拦截器时出错:', error);
        // 出错时fallback到原始fetch
        return originalFetch.call(this, input, init);
      }
    };
    
    // 标记已拦截
    (window.fetch as any).__intercepted__ = true;
    console.log("成功拦截fetch");
  },
  
  // 恢复原始fetch
  unpatchFetch() {
    if ((window.fetch as any).__intercepted__) {
      window.fetch = this.originalFetch;
      console.log("已恢复原始fetch");
    }
  },
  
  // 停止拦截
  unpatch() {
    this.unpatchXHR();
    this.unpatchFetch();
    console.log("已停止所有拦截");
  }
};

// 添加正确的事件监听
window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  const data = event.data;
  if (!data) return;

  if (data.type === "requestCache" && data.to === "inject") {
    const message = data.message;
    if (message && message.doYouWantToEnableHijacking) {
      console.log("开启拦截");
      // 初始化拦截器
      request_cache_interceptor.init();
    } else if (message && message.disableHijacking) {
      console.log("关闭拦截");
      // 停止拦截
      request_cache_interceptor.unpatch();
    }
  }
});
