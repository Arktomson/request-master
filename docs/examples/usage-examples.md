# 使用示例

本章提供了 Request Master 在实际开发中的各种使用场景和示例。

## 基础使用场景

### 场景1：监控API请求

当你需要调试页面中的Ajax请求时：

1. **启用监控功能**
   ```javascript
   // 在扩展面板中开启监控开关
   monitorEnabled = true;
   ```

2. **访问目标页面**
   - 打开包含Ajax请求的网页
   - 触发相关操作（如登录、提交表单等）

3. **查看请求详情**
   - 在扩展面板的请求列表中查看所有拦截的请求
   - 点击具体请求查看详细信息：
     - 请求URL和方法
     - 请求头和参数
     - 响应状态和数据
     - 请求耗时

### 场景2：简单Mock接口

为前端开发提供Mock数据：

**配置Mock规则：**
```json
{
  "id": "user-list",
  "name": "用户列表接口",
  "url": "/api/users",
  "method": "GET",
  "enabled": true,
  "response": {
    "status": 200,
    "data": {
      "code": 200,
      "message": "success",
      "data": [
        {
          "id": 1,
          "name": "张三",
          "email": "zhangsan@example.com",
          "role": "admin"
        },
        {
          "id": 2,
          "name": "李四", 
          "email": "lisi@example.com",
          "role": "user"
        }
      ]
    }
  }
}
```

**测试效果：**
```javascript
// 原始代码不变
fetch('/api/users')
  .then(response => response.json())
  .then(data => {
    console.log(data); // 输出Mock数据
  });
```

## 高级使用场景

### 场景3：动态Mock数据

根据请求参数返回不同的Mock数据：

```json
{
  "id": "user-detail",
  "name": "用户详情接口",
  "url": "/api/user/*",
  "method": "GET", 
  "enabled": true,
  "response": {
    "status": 200,
    "data": {
      "code": 200,
      "data": {
        "id": "{{url.id}}",
        "name": "用户{{url.id}}",
        "email": "user{{url.id}}@example.com",
        "lastLogin": "{{now}}"
      }
    }
  }
}
```

**请求示例：**
```javascript
// 请求 /api/user/123
fetch('/api/user/123')
  .then(response => response.json())
  .then(data => {
    console.log(data);
    // 输出：
    // {
    //   "code": 200,
    //   "data": {
    //     "id": "123",
    //     "name": "用户123",
    //     "email": "user123@example.com", 
    //     "lastLogin": 1640995200000
    //   }
    // }
  });
```

### 场景4：模拟网络错误

测试错误处理逻辑：

```json
{
  "id": "server-error",
  "name": "服务器错误模拟",
  "url": "/api/submit",
  "method": "POST",
  "enabled": true,
  "response": {
    "status": 500,
    "data": {
      "error": "Internal Server Error",
      "message": "服务器内部错误，请稍后重试"
    }
  }
}
```

### 场景5：登录状态模拟

模拟不同的登录状态：

```json
{
  "id": "login-success",
  "name": "登录成功",
  "url": "/api/login",
  "method": "POST",
  "enabled": true,
  "conditions": [
    {
      "when": "{{body.username}} === 'admin' && {{body.password}} === '123456'",
      "response": {
        "status": 200,
        "data": {
          "code": 200,
          "message": "登录成功",
          "data": {
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "userInfo": {
              "id": 1,
              "username": "admin",
              "role": "administrator"
            }
          }
        }
      }
    }
  ],
  "defaultResponse": {
    "status": 401,
    "data": {
      "code": 401,
      "message": "用户名或密码错误"
    }
  }
}
```

## 实际开发场景

### 场景6：电商网站开发

为电商项目Mock各种接口：

**商品列表接口：**
```json
{
  "id": "product-list",
  "url": "/api/products",
  "method": "GET",
  "response": {
    "status": 200,
    "data": {
      "code": 200,
      "data": {
        "products": [
          {
            "id": 1,
            "name": "iPhone 15 Pro",
            "price": 7999,
            "image": "https://example.com/iphone15pro.jpg",
            "category": "手机",
            "stock": 100
          },
          {
            "id": 2,
            "name": "MacBook Pro",
            "price": 14999,
            "image": "https://example.com/macbook.jpg", 
            "category": "电脑",
            "stock": 50
          }
        ],
        "total": 2,
        "page": 1,
        "pageSize": 10
      }
    }
  }
}
```

**购物车接口：**
```json
{
  "id": "add-to-cart",
  "url": "/api/cart/add",
  "method": "POST",
  "response": {
    "status": 200,
    "data": {
      "code": 200,
      "message": "添加成功",
      "data": {
        "cartCount": 3,
        "totalPrice": 22998
      }
    }
  }
}
```

### 场景7：后台管理系统

为管理系统提供Mock数据：

**数据统计接口：**
```json
{
  "id": "dashboard-stats",
  "url": "/api/dashboard/stats",
  "method": "GET",
  "response": {
    "status": 200,
    "data": {
      "code": 200,
      "data": {
        "todayOrders": 128,
        "todayRevenue": 25600,
        "totalUsers": 10240,
        "activeUsers": 1560,
        "chartData": [
          { "date": "2024-01-01", "orders": 45, "revenue": 9200 },
          { "date": "2024-01-02", "orders": 52, "revenue": 10800 },
          { "date": "2024-01-03", "orders": 38, "revenue": 7600 }
        ]
      }
    }
  }
}
```

## 容错处理场景

### 场景8：网络异常恢复

启用容错处理功能，当接口异常时自动使用缓存：

1. **启用容错处理**
   ```javascript
   disasterRecoveryProcessing = true;
   ```

2. **正常请求会被缓存**
   ```javascript
   // 第一次请求成功，数据被缓存
   fetch('/api/user/info')
     .then(response => response.json())
     .then(data => {
       console.log('正常响应:', data);
       // 数据自动缓存
     });
   ```

3. **异常时使用缓存**
   ```javascript
   // 服务器返回500错误时，自动使用缓存数据
   fetch('/api/user/info')
     .then(response => response.json())
     .then(data => {
       console.log('缓存响应:', data);
       // 输出之前缓存的数据
     });
   ```

## 团队协作场景

### 场景9：配置共享

团队成员之间共享Mock配置：

1. **导出配置**
   ```javascript
   // 在扩展面板中点击"导出配置"
   // 生成配置文件：request-master-config.json
   ```

2. **配置文件内容**
   ```json
   {
     "version": "1.0.0",
     "timestamp": "2024-01-15T10:30:00.000Z",
     "config": {
       "monitorEnabled": true,
       "mockEnabled": true,
       "mockList": [
         // 所有Mock规则
       ]
     }
   }
   ```

3. **导入配置**
   ```javascript
   // 其他团队成员导入配置文件
   // 在扩展面板中点击"导入配置"
   ```

### 场景10：环境隔离

为不同环境配置不同的Mock规则：

**开发环境配置：**
```json
{
  "name": "开发环境Mock",
  "rules": [
    {
      "url": "/api/*",
      "response": {
        "data": "开发环境数据"
      }
    }
  ]
}
```

**测试环境配置：**
```json
{
  "name": "测试环境Mock", 
  "rules": [
    {
      "url": "/api/*",
      "response": {
        "data": "测试环境数据"
      }
    }
  ]
}
```

## 性能测试场景

### 场景11：延迟模拟

模拟网络延迟进行性能测试：

```json
{
  "id": "slow-api",
  "url": "/api/data",
  "method": "GET", 
  "response": {
    "status": 200,
    "delay": 3000,  // 3秒延迟
    "data": {
      "message": "慢速响应数据"
    }
  }
}
```

### 场景12：大数据量测试

模拟大量数据的响应：

```json
{
  "id": "big-data",
  "url": "/api/big-list",
  "method": "GET",
  "response": {
    "status": 200,
    "data": {
      "code": 200,
      "data": [
        // 使用脚本生成大量测试数据
        // 可以达到数千条记录
      ]
    }
  }
}
```

## 调试技巧

### 技巧1：结合DevTools使用

1. 在Request Master中监控请求
2. 在Chrome DevTools的Network面板中查看原始请求
3. 对比分析请求和响应的差异

### 技巧2：日志分析

```javascript
// 在控制台中查看详细日志  
console.log('Request Master 拦截日志');
// 查看具体的请求处理流程
```

### 技巧3：缓存调试

```javascript
// 查看缓存状态
cacheManager.getStats();

// 清空特定缓存
cacheManager.clearByUrl('/api/user/info');
```

通过这些实际场景的示例，您可以更好地理解如何在实际开发中运用 Request Master 的各种功能。
