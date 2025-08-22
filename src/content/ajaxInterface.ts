// @ts-nocheck
import { serverTempErrorCodes } from '@/config';
export const ajaxInterface = function () {
  const version = '1.4.5';
  const hookInst = {
    hookFns: [],
    filters: [],
  };

  // 添加处理JSON响应的辅助函数
  function modifyJsonResponse(req, res, modifier) {
    try {
      if (req.type === 'fetch') {
        // 如果 json 方法不存在则直接返回
        if (res?.json) {
          res.json = modifier(res.json);
        } else if (res?.text) {
          res.text = JSON.stringify(modifier(JSON.parse(res.text)));
        }
      } else {
        const tranferJson = res.responseText
          ? JSON.parse(res.responseText)
          : res.responseText;
        // 应用修改函数
        const modified = modifier(tranferJson);

        
        // 将修改后的对象重新序列化为字符串
        res.responseText = JSON.stringify(modified);
        res.response = JSON.stringify(modified);
      }
    } catch (error) {
      console.error('修改JSON响应时出错:', error);
    }

    return res;
  }

  const win = window; // Chrome扩展注入脚本环境中没有unsafeWindow
  let winAh = win.__ajaxHooker;
  const resProto = win.Response.prototype;
  const xhrResponses = [
    'response',
    'responseText',
    'responseXML',
    'status',
    'statusText',
  ];
  const fetchResponses = ['arrayBuffer', 'blob', 'formData', 'json', 'text'];
  const commonResponseProps = ['status', 'statusText'];
  const fetchInitProps = [
    'method',
    'headers',
    'body',
    'mode',
    'credentials',
    'cache',
    'redirect',
    'referrer',
    'referrerPolicy',
    'integrity',
    'keepalive',
    'signal',
    'priority',
  ];
  const xhrAsyncEvents = ['readystatechange', 'load', 'loadend'];
  const getType = {}.toString.call.bind({}.toString);
  const getDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
  const emptyFn = () => {};
  const errorFn = (e) => console.error(e);
  function isThenable(obj) {
    return (
      obj &&
      ['object', 'function'].includes(typeof obj) &&
      typeof obj.then === 'function'
    );
  }
  function catchError(fn, ...args) {
    try {
      const result = fn(...args);
      if (isThenable(result)) return result.then(null, errorFn);
      return result;
    } catch (err) {
      console.error(err);
    }
  }
  function defineProp(obj, prop, getter, setter) {
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      get: getter,
      set: setter,
    });
  }
  function readonly(obj, prop, value = obj[prop]) {
    defineProp(obj, prop, () => value, emptyFn);
  }
  function writable(obj, prop, value = obj[prop]) {
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: value,
    });
  }
  function parseHeaders(obj) {
    const headers = {};
    
    if (!obj) return headers;
    
    switch (getType(obj)) {
      case '[object String]':
        for (const line of obj.trim().split(/[\r\n]+/)) {
          const [header, value] = line.split(/\s*:\s*/);
          if (!header) break;
          const lheader = header.toLowerCase();
          headers[lheader] =
            lheader in headers ? `${headers[lheader]}, ${value}` : value;
        }
        break;
      case '[object Headers]':
        // 使用entries()确保获取所有headers
        for (const [key, val] of obj.entries()) {
          const lkey = key.toLowerCase();
          headers[lkey] = lkey in headers ? `${headers[lkey]}, ${val}` : val;
        }
        break;
      case '[object Object]':
        // 确保key统一为小写
        for (const [key, val] of Object.entries(obj)) {
          const lkey = key.toLowerCase();
          headers[lkey] = lkey in headers ? `${headers[lkey]}, ${val}` : val;
        }
        break;
    }
    return headers;
  }
  function stopImmediatePropagation() {
    this.ajaxHooker_isStopped = true;
  }
  class SyncThenable {
    then(fn) {
      fn && fn();
      return new SyncThenable();
    }
  }
  class AHRequest {
    constructor(request) {
      this.request = request;
      this.requestClone = {
        ...this.request,
      };
    }
    shouldFilter(filters) {
      const { type, url, method, async } = this.request;
      return (
        filters.length &&
        !filters.find((obj) => {
          switch (true) {
            case obj.type && obj.type !== type:
            case getType(obj.url) === '[object String]' &&
              !url.includes(obj.url):
            case getType(obj.url) === '[object RegExp]' && !obj.url.test(url):
            case obj.method &&
              obj.method.toUpperCase() !== method.toUpperCase():
            case 'async' in obj && obj.async !== async:
              return false;
          }
          return true;
        })
      );
    }
    waitForRequestKeys() {
      const requestKeys = ['url', 'method', 'abort', 'headers', 'data'];
      if (!this.request.async) {
        win.__ajaxHooker.hookInsts.forEach(({ hookFns, filters }) => {
          if (this.shouldFilter(filters)) return;
          hookFns.forEach((fn) => {
            if (getType(fn) === '[object Function]')
              catchError(fn, this.request);
          });
          requestKeys.forEach((key) => {
            if (isThenable(this.request[key]))
              this.request[key] = this.requestClone[key];
          });
        });
        return new SyncThenable();
      }
      const promises = [];
      win.__ajaxHooker.hookInsts.forEach(({ hookFns, filters }) => {
        if (this.shouldFilter(filters)) return;
        promises.push(
          Promise.all(hookFns.map((fn) => catchError(fn, this.request))).then(
            () =>
              Promise.all(
                requestKeys.map((key) =>
                  Promise.resolve(this.request[key]).then(
                    (val) => (this.request[key] = val),
                    () => (this.request[key] = this.requestClone[key])
                  )
                )
              )
          )
        );
      });
      return Promise.all(promises);
    }
    waitForResponseKeys(response) {
      const base = this.request.type === 'xhr' ? xhrResponses : fetchResponses;
      const responseKeys = [...base, ...commonResponseProps];
      if (!this.request.async) {
        if (getType(this.request.response) === '[object Function]') {
          catchError(this.request.response, response);
          responseKeys.forEach((key) => {
            if (
              'get' in getDescriptor(response, key) ||
              isThenable(response[key])
            ) {
              delete response[key];
            }
          });
        }
        return new SyncThenable();
      }
      return Promise.resolve(catchError(this.request.response, response)).then(
        () =>
          Promise.all(
            responseKeys.map((key) => {
              const descriptor = getDescriptor(response, key);
              if (descriptor && 'value' in descriptor) {
                return Promise.resolve(descriptor.value).then(
                  (val) => (response[key] = val),
                  () => delete response[key]
                );
              } else {
                delete response[key];
              }
            })
          )
      );
    }
  }
  const proxyHandler = {
    get(target, prop) {
      const descriptor = getDescriptor(target, prop);
      if (
        descriptor &&
        !descriptor.configurable &&
        !descriptor.writable &&
        !descriptor.get
      )
        return target[prop];
      const ah = target.__ajaxHooker;
      if (ah && ah.proxyProps) {
        if (prop in ah.proxyProps) {
          const pDescriptor = ah.proxyProps[prop];
          if ('get' in pDescriptor) return pDescriptor.get();
          if (typeof pDescriptor.value === 'function')
            return pDescriptor.value.bind(ah);
          return pDescriptor.value;
        }
        if (typeof target[prop] === 'function')
          return target[prop].bind(target);
      }
      return target[prop];
    },
    set(target, prop, value) {
      const descriptor = getDescriptor(target, prop);
      if (
        descriptor &&
        !descriptor.configurable &&
        !descriptor.writable &&
        !descriptor.set
      )
        return true;
      const ah = target.__ajaxHooker;
      if (ah && ah.proxyProps && prop in ah.proxyProps) {
        const pDescriptor = ah.proxyProps[prop];
        pDescriptor.set ? pDescriptor.set(value) : (pDescriptor.value = value);
      } else {
        target[prop] = value;
      }
      return true;
    },
  };
  class XhrHooker {
    constructor(xhr) {
      const ah = this;
      Object.assign(ah, {
        originalXhr: xhr,
        proxyXhr: new Proxy(xhr, proxyHandler),
        resThenable: new SyncThenable(),
        proxyProps: {},
        proxyEvents: {},
      });
      xhr.addEventListener('readystatechange', (e) => {
        if (
          ah.proxyXhr.readyState === 4 &&
          ah.request &&
          typeof ah.request.response === 'function'
        ) {
          const response = {
            finalUrl: ah.proxyXhr.responseURL,
            status: ah.proxyXhr.status,
            responseHeaders: parseHeaders(ah.proxyXhr.getAllResponseHeaders()),
          };
          const tempValues = {};
          for (const key of xhrResponses.concat(commonResponseProps)) {
            try {
              tempValues[key] = ah.originalXhr[key];
            } catch (err) {}
            defineProp(
              response,
              key,
              () => {
                return (response[key] = tempValues[key]);
              },
              (val) => {
                delete response[key];
                response[key] = val;
              }
            );
          }
          ah.resThenable = new AHRequest(ah.request)
            .waitForResponseKeys(response)
            .then(() => {
              for (const key of xhrResponses) {
                ah.proxyProps[key] = {
                  get: () => {
                    if (!(key in response)) response[key] = tempValues[key];
                    return response[key];
                  },
                };
              }
            });
        }
        ah.dispatchEvent(e);
      });
      xhr.addEventListener('load', (e) => ah.dispatchEvent(e));
      xhr.addEventListener('loadend', (e) => ah.dispatchEvent(e));
      for (const evt of xhrAsyncEvents) {
        const onEvt = 'on' + evt;
        ah.proxyProps[onEvt] = {
          get: () => ah.proxyEvents[onEvt] || null,
          set: (val) => ah.addEvent(onEvt, val),
        };
      }
      for (const method of [
        'setRequestHeader',
        'addEventListener',
        'removeEventListener',
        'open',
        'send',
      ]) {
        ah.proxyProps[method] = {
          value: ah[method],
        };
      }
    }
    toJSON() {} // Converting circular structure to JSON
    addEvent(type, event) {
      if (type.startsWith('on')) {
        this.proxyEvents[type] = typeof event === 'function' ? event : null;
      } else {
        if (typeof event === 'object' && event !== null)
          event = event.handleEvent;
        if (typeof event !== 'function') return;
        this.proxyEvents[type] = this.proxyEvents[type] || new Set();
        this.proxyEvents[type].add(event);
      }
    }
    removeEvent(type, event) {
      if (type.startsWith('on')) {
        this.proxyEvents[type] = null;
      } else {
        if (typeof event === 'object' && event !== null)
          event = event.handleEvent;
        this.proxyEvents[type] && this.proxyEvents[type].delete(event);
      }
    }
    dispatchEvent(e) {
      e.stopImmediatePropagation = stopImmediatePropagation;
      defineProp(e, 'target', () => this.proxyXhr);
      defineProp(e, 'currentTarget', () => this.proxyXhr);
      this.proxyEvents[e.type] &&
        this.proxyEvents[e.type].forEach((fn) => {
          this.resThenable.then(
            () => !e.ajaxHooker_isStopped && fn.call(this.proxyXhr, e)
          );
        });
      if (e.ajaxHooker_isStopped) return;
      const onEvent = this.proxyEvents['on' + e.type];
      onEvent && this.resThenable.then(onEvent.bind(this.proxyXhr, e));
    }
    setRequestHeader(header, value) {
      this.originalXhr.setRequestHeader(header, value);
      if (!this.request) return;
      const headers = this.request.headers;
      headers[header] =
        header in headers ? `${headers[header]}, ${value}` : value;
    }
    addEventListener(...args) {
      if (xhrAsyncEvents.includes(args[0])) {
        this.addEvent(args[0], args[1]);
      } else {
        this.originalXhr.addEventListener(...args);
      }
    }
    removeEventListener(...args) {
      if (xhrAsyncEvents.includes(args[0])) {
        this.removeEvent(args[0], args[1]);
      } else {
        this.originalXhr.removeEventListener(...args);
      }
    }
    open(method, url, async = true, ...args) {
      this.request = {
        type: 'xhr',
        url: url.toString(),
        method: method.toUpperCase(),
        abort: false,
        headers: {},
        data: null,
        response: null,
        async: !!async,
      };
      this.openArgs = args;
      this.resThenable = new SyncThenable();
      [
        'responseURL',
        'readyState',
        'status',
        'statusText',
        ...xhrResponses,
      ].forEach((key) => {
        delete this.proxyProps[key];
      });
      return this.originalXhr.open(method, url, async, ...args);
    }
    send(data) {
      const ah = this;
      const xhr = ah.originalXhr;
      const request = ah.request;
      if (!request) return xhr.send(data);
      request.data = data;
      new AHRequest(request).waitForRequestKeys().then(() => {
        if (request.abort) {
          if (typeof request.response === 'function') {
            Object.assign(ah.proxyProps, {
              responseURL: {
                value: request.url,
              },
              readyState: {
                value: 4,
              },
              status: {
                value: 200,
              },
              statusText: {
                value: 'OK',
              },
            });
            xhrAsyncEvents.forEach((evt) => xhr.dispatchEvent(new Event(evt)));
          }
        } else {
          xhr.open(request.method, request.url, request.async, ...ah.openArgs);
          for (const header in request.headers) {
            xhr.setRequestHeader(header, request.headers[header]);
          }
          xhr.send(request.data);
        }
      });
    }
  }
  function fakeXHR() {
    const xhr = new winAh.realXHR();
    if ('__ajaxHooker' in xhr)
      console.warn('检测到不同版本的ajaxHooker，可能发生冲突！');
    xhr.__ajaxHooker = new XhrHooker(xhr);
    return xhr.__ajaxHooker.proxyXhr;
  }
  fakeXHR.prototype = win.XMLHttpRequest.prototype;
  Object.keys(win.XMLHttpRequest).forEach(
    (key) => (fakeXHR[key] = win.XMLHttpRequest[key])
  );
  function fakeFetch(url, options = {}) {
    if (!url) return winAh.realFetch.call(win, url, options);
    return new Promise(async (resolve, reject) => {
      const init = {};
      // 正确处理Request对象，手动提取所有属性
      if (url instanceof Request) {
        const reqClone = url.clone();
        
        // 手动提取Request对象的所有属性
        for (const prop of fetchInitProps) {
          if (prop === 'headers') {
            // 特殊处理headers - 手动提取所有header
            const requestHeaders = {};
            console.debug('提取Request headers:');
            // 遍历所有headers
            for (const [key, value] of reqClone.headers.entries()) {
              console.debug(`  ${key}: ${value}`);
              requestHeaders[key] = value;
            }
            init.headers = requestHeaders;
            console.debug('最终提取的headers:', requestHeaders);
          } else if (prop === 'body' && reqClone.body) {
            // 特殊处理body
            init.body = await reqClone.arrayBuffer();
          } else if (reqClone[prop] !== undefined) {
            init[prop] = reqClone[prop];
          }
        }
        
        url = reqClone.url;
      }
      url = url.toString();
      Object.assign(init, options);
      init.method = init.method || 'GET';
      init.headers = init.headers || {};
      const request = {
        type: 'fetch',
        url: url,
        method: init.method.toUpperCase(),
        abort: false,
        headers: parseHeaders(init.headers),
        data: init.body,
        response: null,
        async: true,
      };
      const req = new AHRequest(request);
      await req.waitForRequestKeys();
      if (request.abort) {
        if (typeof request.response === 'function') {
          const response = {
            finalUrl: request.url,
            status: 200,
            responseHeaders: {},
          };
          await req.waitForResponseKeys(response);
          const key = fetchResponses.find((k) => k in response);
          let val = response[key];
          if (key === 'json' && typeof val === 'object') {
            val = catchError(JSON.stringify.bind(JSON), val);
          }
          const res = new Response(val, {
            status: 200,
            statusText: 'OK',
          });
          defineProp(res, 'type', () => 'basic');
          defineProp(res, 'url', () => request.url);
          resolve(res);
        } else {
          reject(new DOMException('aborted', 'AbortError'));
        }
        return;
      }
      init.method = request.method;
      init.headers = request.headers;
      init.body = request.data;
      winAh.realFetch
        .call(win, request.url, init)
        .then(async (res) => {
          if (typeof request.response === 'function') {
            // 对于错误状态码且是JSON格式的响应，进行特殊处理
            // if (serverTempErrorCodes.includes(res.status)) {
            //   // 检查Content-Type是否为JSON
            //   const contentType = res.headers.get('content-type');
            //   if (contentType && contentType.includes('json')) {
            //     try {
            //       // 尝试读取响应体
            //       let responseData = await res.json();

            //       // 构建响应对象
            //       const response = {
            //         finalUrl: res.url,
            //         status: res.status,
            //         statusText: res.statusText,
            //         responseHeaders: parseHeaders(res.headers),
            //         json: responseData,
            //         text: JSON.stringify(responseData),
            //         response: JSON.stringify(responseData),
            //         responseText: JSON.stringify(responseData),
            //       };

            //       // 调用 request.response 处理错误响应
            //       const modifiedResponse =
            //         request.response(response) || response;

            //       // 创建新的Response对象返回
            //       const mockResponse = new Response(
            //         modifiedResponse.text ||
            //           modifiedResponse.responseText ||
            //           JSON.stringify(modifiedResponse.json),
            //         {
            //           status: modifiedResponse.status || 200,
            //           statusText: modifiedResponse.statusText || 'OK',
            //           headers: new Headers(
            //             modifiedResponse.responseHeaders || {}
            //           ),
            //         }
            //       );

            //       // 为新的Response对象添加方法
            //       fetchResponses.forEach((key) => {
            //         mockResponse[key] = function () {
            //           if (key === 'json') {
            //             return Promise.resolve(
            //               modifiedResponse.json ||
            //                 JSON.parse(modifiedResponse.text || '{}')
            //             );
            //           } else if (key === 'text') {
            //             return Promise.resolve(
            //               modifiedResponse.text ||
            //                 JSON.stringify(modifiedResponse.json || '')
            //             );
            //           } else {
            //             return Promise.resolve(modifiedResponse[key]);
            //           }
            //         };
            //       });

            //       resolve(mockResponse);
            //       return;
            //     } catch (error) {
            //       console.error('读取错误响应失败:', error);
            //     }
            //   } else {
                
            //   }
            // }

            // 对于正常状态码或非JSON的错误状态码，使用原有逻辑
            const response = {
              finalUrl: res.url,
              status: res.status,
              statusText: res.statusText,
              responseHeaders: parseHeaders(res.headers),
            };

            fetchResponses.forEach((key) => {
              // 仅对可调用的方法进行代理
              res[key] = function () {
                if (key in response) return Promise.resolve(response[key]);
                return resProto[key].call(this).then((val) => {
                  response[key] = val;
                  return req
                    .waitForResponseKeys(response)
                    .then(() => (key in response ? response[key] : val));
                });
              };
            });
          }
          resolve(res);
        })
        .catch(reject);
    });
  }
  function fakeFetchClone() {
    const descriptors = Object.getOwnPropertyDescriptors(this);
    const res = winAh.realFetchClone.call(this);
    Object.defineProperties(res, descriptors);
    return res;
  }
  winAh = win.__ajaxHooker = winAh || {
    version,
    fakeXHR,
    fakeFetch,
    fakeFetchClone,
    realXHR: win.XMLHttpRequest,
    realFetch: win.fetch,
    realFetchClone: resProto.clone,
    hookInsts: new Set(),
  };
  if (winAh.version !== version)
    console.warn('检测到不同版本的ajaxHooker，可能发生冲突！');
  win.XMLHttpRequest = winAh.fakeXHR;
  win.fetch = winAh.fakeFetch;
  resProto.clone = winAh.fakeFetchClone;
  winAh.hookInsts.add(hookInst);
  // 针对头条、抖音 secsdk.umd.js 的兼容性处理
  class AHFunction extends Function {
    call(thisArg, ...args) {
      if (
        thisArg &&
        thisArg.__ajaxHooker &&
        thisArg.__ajaxHooker.proxyXhr === thisArg
      ) {
        thisArg = thisArg.__ajaxHooker.originalXhr;
      }
      return Reflect.apply(this, thisArg, args);
    }
    apply(thisArg, args) {
      if (
        thisArg &&
        thisArg.__ajaxHooker &&
        thisArg.__ajaxHooker.proxyXhr === thisArg
      ) {
        thisArg = thisArg.__ajaxHooker.originalXhr;
      }
      return Reflect.apply(this, thisArg, args || []);
    }
  }
  function hookSecsdk(csrf) {
    Object.setPrototypeOf(
      csrf.nativeXMLHttpRequestSetRequestHeader,
      AHFunction.prototype
    );
    Object.setPrototypeOf(csrf.nativeXMLHttpRequestOpen, AHFunction.prototype);
    Object.setPrototypeOf(csrf.nativeXMLHttpRequestSend, AHFunction.prototype);
  }
  if (win.secsdk) {
    if (win.secsdk.csrf && win.secsdk.csrf.nativeXMLHttpRequestOpen)
      hookSecsdk(win.secsdk.csrf);
  } else {
    defineProp(win, 'secsdk', emptyFn, (secsdk) => {
      delete win.secsdk;
      win.secsdk = secsdk;
      defineProp(secsdk, 'csrf', emptyFn, (csrf) => {
        delete secsdk.csrf;
        secsdk.csrf = csrf;
        if (csrf.nativeXMLHttpRequestOpen) hookSecsdk(csrf);
      });
    });
  }

  // 添加请求监听器，将拦截到的请求通过自定义事件发送给content script
  hookInst.hookFns.push(function (request) {
    try {
      // 仅发送可序列化的数据
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

  // 暴露给window以便content script能通过自定义事件访问
  window.__ajaxHookerExtension = {
    hook: (fn) => hookInst.hookFns.push(fn),
    filter: (arr) => {
      if (Array.isArray(arr)) hookInst.filters = arr;
    },
    protect: () => {
      readonly(win, 'XMLHttpRequest', winAh.fakeXHR);
      readonly(win, 'fetch', winAh.fakeFetch);
      readonly(resProto, 'clone', winAh.fakeFetchClone);
    },
    unhook: () => {
      winAh.hookInsts.delete(hookInst);
      if (!winAh.hookInsts.size) {
        writable(win, 'XMLHttpRequest', winAh.realXHR);
        writable(win, 'fetch', winAh.realFetch);
        writable(resProto, 'clone', winAh.realFetchClone);
        delete win.__ajaxHooker;
      }
    },
    // 添加JSON辅助方法
    modifyJsonResponse: modifyJsonResponse,
  };

  return window.__ajaxHookerExtension;
};
