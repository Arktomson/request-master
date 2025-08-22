# Ajax Hook API

Ajax Hook 是 Request Master 的核心模块，负责拦截和处理页面中的所有Ajax请求。

## 核心功能

### 请求拦截

Ajax Hook 通过重写原生的 `XMLHttpRequest` 和 `fetch` API 来实现请求拦截：

```typescript
interface AjaxHookRequest {
  url: string;           // 请求URL
  method: string;        // HTTP方法
  data?: any;           // 请求数据
  headers?: Record<string, string>; // 请求头
  timestamp: number;     // 请求时间戳
}

interface AjaxHookResponse {
  status: number;        // HTTP状态码
  statusText: string;    // 状态文本
  responseHeaders: Record<string, string>; // 响应头
  response: any;         // 响应数据
  responseText: string;  // 响应文本
  timestamp: number;     // 响应时间戳
  duration: number;      // 请求耗时
}
```

### 配置变量

Ajax Hook 支持通过以下配置变量控制行为：

```typescript
// 全局配置变量
let mockList: MockRule[] = [];              // Mock规则列表
let mockEnabled: boolean = true;            // Mock功能开关
let monitorEnabled: boolean = true;         // 监控功能开关  
let disasterRecoveryProcessing: boolean = false; // 容错处理开关
```

## API 方法

### beginHook()

启动Ajax拦截功能的主要方法。

```typescript
interface BeginHookOptions {
  monitorEnabled?: boolean;
  mockEnabled?: boolean;
  disasterRecoveryProcessing?: boolean;
  mockList?: MockRule[];
}

function beginHook(options?: BeginHookOptions): void
```

**参数说明：**
- `options` - 可选的配置选项

**示例：**
```typescript
// 使用默认配置启动
beginHook();

// 使用自定义配置启动
beginHook({
  monitorEnabled: true,
  mockEnabled: false,
  mockList: []
});
```

### getCacheKey()

生成请求的缓存键值。

```typescript
function getCacheKey(request: AjaxHookRequest): string
```

**参数说明：**
- `request` - Ajax请求对象

**返回值：**
- 字符串类型的缓存键

**示例：**
```typescript
const cacheKey = getCacheKey({
  url: '/api/user/info',
  method: 'GET',
  data: null,
  timestamp: Date.now()
});
// 返回: "GET_/api/user/info_null"
```

### checkStatus()

检查请求和响应的处理状态。

```typescript
interface StatusResult {
  status: ProcessStatus;
}

enum ProcessStatus {
  CACHE = 'cache',
  ERROR_NO_CACHE = 'error_no_cache', 
  RECOVERY = 'recovery'
}

function checkStatus(
  request: AjaxHookRequest,
  response: AjaxHookResponse, 
  cacheKey: string
): StatusResult
```

**参数说明：**
- `request` - 请求对象
- `response` - 响应对象  
- `cacheKey` - 缓存键

**返回值：**
- 包含状态信息的对象

### filterSituation()

过滤和判断响应是否需要处理。

```typescript
function filterSituation(response: AjaxHookResponse): boolean
```

**参数说明：**
- `response` - 响应对象

**返回值：**
- 布尔值，表示是否需要处理此响应

## 事件系统

### 配置变更事件

Ajax Hook 监听来自内容脚本的配置变更事件：

```typescript
// 事件监听器
window.addEventListener('content_to_ajaxHook', (event) => {
  const { detail: { type, message } = {} } = event || {};
  
  if (type?.endsWith('_change')) {
    const variableName = type.replace('_change', '');
    eval(`${variableName} = message`);
  }
});
```

**支持的事件类型：**
- `mockList_change` - Mock规则列表变更
- `mockEnabled_change` - Mock开关状态变更
- `monitorEnabled_change` - 监控开关状态变更
- `disasterRecoveryProcessing_change` - 容错处理开关变更

### 数据上报事件

Ajax Hook 通过自定义事件向内容脚本上报数据：

```typescript
// 发送拦截到的请求数据
customEventSend('ajaxHook_to_content', {
  type: 'request_data',
  data: {
    request: AjaxHookRequest,
    response: AjaxHookResponse,
    cacheKey: string,
    status: ProcessStatus
  }
});
```

## Mock 处理

### Mock规则匹配

```typescript
interface MockRule {
  id: string;
  name: string;
  url: string;
  method: string;
  enabled: boolean;
  response: {
    status: number;
    data: any;
    headers?: Record<string, string>;
  };
}

// Mock规则匹配逻辑
const isFindMock = mockList.find((item: MockRule) => {
  const { url: mockUrl, method: mockMethod } = item;
  return request.url.includes(mockUrl) && 
         request.method.toUpperCase() === mockMethod.toUpperCase();
});
```

### Mock响应生成

当找到匹配的Mock规则时，Ajax Hook会生成对应的Mock响应：

```typescript
if (isFindMock && isFindMock.enabled) {
  const mockResponse = {
    status: isFindMock.response.status || 200,
    statusText: 'OK',
    responseHeaders: {
      'content-type': 'application/json',
      ...isFindMock.response.headers
    },
    response: isFindMock.response.data,
    responseText: JSON.stringify(isFindMock.response.data),
    timestamp: Date.now(),
    duration: Math.random() * 100 + 50 // 模拟网络延迟
  };
  
  return mockResponse;
}
```

## 缓存机制

### 缓存存储

Ajax Hook 使用 `cacheManager` 来管理响应数据的缓存：

```typescript
// 存储成功响应到缓存
if (response.status >= 200 && response.status < 300) {
  cacheManager.set(cacheKey, {
    request,
    response,
    timestamp: Date.now()
  });
}
```

### 缓存恢复

当启用容错处理且接口返回错误时，尝试使用缓存数据：

```typescript
if (disasterRecoveryProcessing && 
    serverTempErrorCodes.includes(response.status)) {
  
  const cachedData = cacheManager.get(cacheKey);
  if (cachedData) {
    console.log('使用缓存数据恢复:', cacheKey);
    return cachedData.response;
  }
}
```

## 错误处理

### 服务器错误码

```typescript
// 定义需要容错处理的服务器错误码
const serverTempErrorCodes = [500, 502, 503, 504];
```

### 异常捕获

Ajax Hook 包含完善的异常处理机制：

```typescript
try {
  // 请求处理逻辑
  const result = await processRequest(request);
  return result;
} catch (error) {
  console.error('Ajax Hook 处理异常:', error);
  
  // 尝试使用缓存数据
  if (disasterRecoveryProcessing) {
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData.response;
    }
  }
  
  // 返回原始错误
  throw error;
}
```

## 性能优化

### 条件执行

只在必要时启用拦截功能：

```typescript
// 只有在监控开启或需要容错处理时才进行拦截
if (monitorEnabled || (urlMatch && disasterRecoveryProcessing)) {
  // 执行拦截逻辑
  performIntercept(request);
}
```

### 异步处理

数据上报采用异步方式，避免阻塞原始请求：

```typescript
// 异步发送数据，不阻塞请求流程
setTimeout(() => {
  customEventSend('ajaxHook_to_content', {
    type: 'request_data',
    data: interceptData
  });
}, 0);
```

## 调试支持

### 日志输出

Ajax Hook 提供详细的调试日志：

```typescript
console.log('请求拦截:', {
  url: request.url,
  method: request.method,
  timestamp: new Date().toISOString()
});

console.log('响应处理:', {
  status: response.status,
  duration: response.duration,
  cached: !!cachedData
});
```

### 开发工具集成

支持与Chrome DevTools的集成，方便调试：

- 在Network面板中显示拦截的请求
- 在Console面板中输出详细日志
- 支持断点调试和性能分析

通过这些API，开发者可以深入了解和定制Ajax Hook的行为，实现更复杂的请求拦截和处理逻辑。
