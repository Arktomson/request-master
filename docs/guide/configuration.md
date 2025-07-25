# 基本配置

本章介绍 Request Master 的各种配置选项和使用方法。

## 全局配置

### 监控设置

#### 启用/禁用监控

```javascript
// 通过扩展面板开关控制
monitorEnabled: true | false
```

监控功能控制是否拦截页面中的Ajax请求：
- **开启**：自动拦截所有XHR和Fetch请求
- **关闭**：不进行任何拦截，扩展处于静默状态

#### 监控范围

默认监控所有Ajax请求，支持通过配置限制监控范围：

```javascript
// 只监控特定域名
const monitorConfig = {
  domains: ['api.example.com', 'service.example.com'],
  // 排除特定路径
  excludePaths: ['/health', '/ping']
};
```

### Mock配置

#### 全局Mock开关

```javascript
mockEnabled: true | false
```

控制Mock功能是否生效：
- **开启**：根据配置的规则返回Mock数据
- **关闭**：所有请求正常发送，不进行Mock处理

#### Mock规则配置

Mock规则采用JSON格式配置：

```json
{
  "mockList": [
    {
      "id": "user-info",
      "name": "用户信息接口",
      "url": "/api/user/info",
      "method": "GET",
      "enabled": true,
      "response": {
        "status": 200,
        "data": {
          "code": 200,
          "message": "success",
          "data": {
            "id": 1,
            "username": "zhangsan",
            "email": "zhangsan@example.com"
          }
        }
      }
    }
  ]
}
```

### 容错配置

#### 灾难恢复处理

```javascript
disasterRecoveryProcessing: true | false
```

启用后，当接口返回错误状态码时：
- 自动使用缓存的成功响应数据
- 避免因临时网络问题影响页面功能
- 在控制台提供恢复日志信息

## Mock规则详解

### 基础规则结构

```json
{
  "id": "unique-id",           // 规则唯一标识
  "name": "规则名称",           // 便于管理的显示名称
  "url": "/api/path",          // 匹配的URL路径
  "method": "GET",             // HTTP方法
  "enabled": true,             // 是否启用此规则
  "response": {                // 响应配置
    "status": 200,             // HTTP状态码
    "headers": {},             // 响应头
    "data": {}                 // 响应数据
  }
}
```

### URL匹配模式

#### 1. 精确匹配

```json
{
  "url": "/api/user/info",
  "method": "GET"
}
```

只匹配完全相同的URL路径。

#### 2. 通配符匹配

```json
{
  "url": "/api/user/*",
  "method": "GET"  
}
```

支持使用 `*` 通配符：
- `/api/user/123` ✅
- `/api/user/info` ✅
- `/api/product/123` ❌

#### 3. 参数忽略

```json
{
  "url": "/api/search",
  "method": "GET",
  "ignoreQuery": true
}
```

设置 `ignoreQuery: true` 时忽略URL参数：
- `/api/search?q=test` ✅
- `/api/search?page=1&size=10` ✅

### 响应配置

#### 基础响应

```json
{
  "response": {
    "status": 200,
    "data": {
      "message": "Hello World"
    }
  }
}
```

#### 自定义响应头

```json
{
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "custom-value"
    },
    "data": {
      "result": "success"
    }
  }
}
```

#### 错误响应

```json
{
  "response": {
    "status": 400,
    "data": {
      "error": "Bad Request",
      "message": "参数错误"
    }
  }
}
```

#### 延迟响应

```json
{
  "response": {
    "status": 200,
    "delay": 2000,  // 延迟2秒返回
    "data": {
      "message": "Delayed response"
    }
  }
}
```

### 动态响应

#### 基于请求参数

```json
{
  "url": "/api/user/{id}",
  "method": "GET",
  "response": {
    "status": 200,
    "data": {
      "id": "{{url.id}}",        // 从URL路径获取
      "name": "{{query.name}}",  // 从查询参数获取
      "timestamp": "{{now}}"     // 当前时间戳
    }
  }
}
```

<!-- 支持的动态变量：
- `{{url.参数名}}`：URL路径参数
- `{{query.参数名}}`：查询字符串参数
- `{{body.字段名}}`：请求体字段
- `{{now}}`：当前时间戳
- `{{uuid}}`：随机UUID -->

#### 条件响应

```json
{
  "url": "/api/login",
  "method": "POST",
  "conditions": [
    {
      "when": "{{body.username}} === 'admin'",
      "response": {
        "status": 200,
        "data": { "role": "admin", "token": "admin-token" }
      }
    },
    {
      "when": "{{body.username}} === 'user'", 
      "response": {
        "status": 200,
        "data": { "role": "user", "token": "user-token" }
      }
    }
  ],
  "defaultResponse": {
    "status": 401,
    "data": { "error": "Invalid credentials" }
  }
}
```

## 缓存配置

### 缓存策略

```javascript
const cacheConfig = {
  // 缓存大小限制（MB）
  maxSize: 50,
  
  // 缓存过期时间（毫秒）
  ttl: 30 * 60 * 1000, // 30分钟
  
  // 是否启用压缩
  compression: true
};
```

### 缓存清理

提供多种缓存清理选项：

```javascript
// 清空所有缓存
cacheManager.clear();

// 清空特定URL的缓存
cacheManager.clearByUrl('/api/user/info');

// 清空过期缓存
cacheManager.clearExpired();
```

## 界面配置

### 面板设置

```javascript
const panelConfig = {
  // 默认宽度
  defaultWidth: 400,
  
  // 最小宽度
  minWidth: 300,
  
  // 最大宽度
  maxWidth: 800,
  
  // 是否记住大小
  rememberSize: true
};
```

### 主题配置

```javascript
const themeConfig = {
  // 主题模式
  mode: 'light', // 'light' | 'dark' | 'auto'
  
  // 主色调
  primaryColor: '#1976d2',
  
  // 字体大小
  fontSize: 14
};
```

## 导入导出

### 导出配置

```javascript
// 导出所有配置
const config = extensionManager.exportConfig();

// 导出特定配置
const mockRules = extensionManager.exportMockRules();
```

### 导入配置

```javascript
// 导入完整配置
extensionManager.importConfig(configData);

// 导入Mock规则
extensionManager.importMockRules(mockRules);

// 合并导入（不覆盖现有配置）
extensionManager.importConfig(configData, { merge: true });
```

### 配置文件格式

```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "config": {
    "monitorEnabled": true,
    "mockEnabled": true,
    "disasterRecoveryProcessing": false,
    "mockList": [
      // Mock规则数组
    ]
  }
}
```

## 最佳实践

### 规则组织

1. **按模块分组**：为不同的业务模块创建不同的规则组
2. **命名规范**：使用清晰的规则名称和ID
3. **版本管理**：定期备份配置文件

### 性能优化

1. **限制规则数量**：避免创建过多的Mock规则
2. **精确匹配**：优先使用精确匹配而非通配符
3. **定期清理**：删除不再使用的规则和缓存

### 团队协作

1. **配置共享**：通过导出/导入功能共享Mock配置
2. **环境区分**：为不同环境创建不同的配置文件
3. **文档维护**：为复杂规则添加说明注释

## 故障排除

### 配置不生效

1. 检查规则的 `enabled` 状态
2. 确认URL匹配规则正确
3. 验证JSON格式有效性
4. 查看控制台错误信息

### 性能问题

1. 减少Mock规则数量
2. 优化URL匹配模式
3. 清理过期缓存
4. 禁用不必要的功能

通过合理配置这些选项，您可以充分发挥 Request Master 的强大功能，提升开发效率。
