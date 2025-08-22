# 安装配置

本章详细介绍如何安装和配置 Request Master Chrome扩展。

## 系统要求

### 浏览器支持
- Chrome 88+
- Microsoft Edge 88+
- 其他基于Chromium的浏览器

### 开发环境要求
- Node.js 18+
- npm 或 yarn
- Git

## 详细安装步骤

### 从源码安装

#### 1. 获取源码

```bash
# 克隆仓库
git clone https://github.com/your-username/request-master.git
cd request-master

# 或者下载ZIP包并解压
```

#### 2. 安装依赖

```bash
# 使用npm
npm install

# 或使用yarn
yarn install
```

#### 3. 构建扩展

```bash
# 开发构建（包含source map，便于调试）
npm run dev

# 生产构建（优化后的版本）
npm run build
```

构建完成后，会在 `dist` 目录生成扩展文件。

#### 4. 加载到Chrome

1. 打开Chrome浏览器
2. 地址栏输入：`chrome://extensions/`
3. 开启右上角的"开发者模式"开关
4. 点击"加载已解压的扩展程序"按钮
5. 选择项目的 `dist` 目录
6. 确认加载

### 验证安装

安装成功后，您应该能看到：

1. **工具栏图标**：Chrome工具栏出现Request Master图标
2. **扩展列表**：在扩展管理页面看到Request Master
3. **权限设置**：扩展具有必要的权限

点击工具栏图标，应该能打开扩展的控制面板。

## 权限说明

Request Master需要以下权限：

### activeTab
- **用途**：访问当前活动标签页
- **说明**：用于注入内容脚本，拦截Ajax请求

### storage
- **用途**：本地数据存储
- **说明**：保存Mock规则、缓存数据和用户配置

### scripting
- **用途**：脚本注入
- **说明**：向页面注入Ajax拦截代码

### host permissions
- **用途**：访问指定网站
- **说明**：在目标网站上运行拦截功能

## 配置选项

### 基础配置

扩展安装后，可以通过以下方式进行配置：

#### 1. 全局设置

```javascript
// 扩展配置对象
const extensionConfig = {
  // 是否启用监控
  monitorEnabled: true,
  
  // 是否启用Mock功能
  mockEnabled: true,
  
  // 是否启用容错处理
  disasterRecoveryProcessing: false,
  
  // Mock规则列表
  mockList: []
};
```

#### 2. 面板设置

通过扩展面板可以实时调整：

- **监控开关**：控制是否拦截Ajax请求
- **Mock开关**：控制Mock功能是否生效
- **容错开关**：控制是否启用缓存恢复
- **清空缓存**：清除所有缓存数据

### 高级配置

#### URL匹配规则

支持多种URL匹配方式：

```javascript
// 精确匹配
{
  url: "/api/user/info",
  method: "GET"
}

// 通配符匹配
{
  url: "/api/user/*",
  method: "GET"
}

// 正则表达式匹配
{
  url: /^\/api\/user\/\d+$/,
  method: "GET"
}
```

#### 响应配置

```javascript
{
  url: "/api/user/info",
  method: "GET",
  response: {
    // HTTP状态码
    status: 200,
    
    // 响应头
    headers: {
      "Content-Type": "application/json"
    },
    
    // 响应数据
    data: {
      code: 200,
      message: "success",
      data: {
        id: 1,
        name: "张三"
      }
    }
  }
}
```

## 开发模式

### 启用开发模式

开发模式下，扩展会提供更多调试信息：

```bash
# 开发构建
npm run dev
```

开发模式特性：
- 详细的控制台日志
- Source Map支持
- 热重载（需手动刷新扩展）
- 错误堆栈信息

### 调试技巧

#### 1. 查看控制台

- **页面控制台**：查看内容脚本的日志
- **扩展控制台**：查看背景脚本和弹窗脚本的日志
- **检查器模式**：右键扩展图标 → 检查

#### 2. 网络面板

可以配合Chrome DevTools的Network面板：
- 对比原始请求和Mock响应
- 查看请求时序
- 分析性能影响

#### 3. 存储查看

在Chrome DevTools的Application面板中：
- **Local Storage**：查看缓存数据
- **Extension Storage**：查看扩展配置

## 故障排除

### 常见问题

#### 扩展加载失败

**错误信息**：`Manifest version 3 required`
**解决方案**：确保使用Chrome 88+版本

**错误信息**：`Could not load extension`
**解决方案**：检查dist目录是否存在，重新构建项目

#### 功能不生效

**问题**：请求没有被拦截
**排查步骤**：
1. 检查监控开关是否开启
2. 刷新目标页面
3. 查看控制台错误信息
4. 确认权限是否正确授予

**问题**：Mock不生效
**排查步骤**：
1. 检查Mock开关是否开启
2. 验证URL匹配规则
3. 确认请求方法匹配
4. 检查响应格式

### 重置扩展

如果遇到无法解决的问题，可以重置扩展：

1. 在扩展管理页面移除扩展
2. 清除浏览器缓存
3. 重新加载扩展
4. 重新配置设置

### 日志收集

收集调试信息：

```bash
# 导出扩展日志
chrome://extensions/ → Request Master → 详细信息 → 检查视图

# 导出配置数据
# 在扩展面板中选择"导出配置"
```

## 卸载说明

如需卸载扩展：

1. 访问 `chrome://extensions/`
2. 找到Request Master
3. 点击"移除"按钮
4. 确认删除

**注意**：卸载会删除所有本地配置和缓存数据，请提前备份重要的Mock规则。
