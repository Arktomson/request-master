# Vue3 Chrome 浏览器扩展

这是一个使用Vue3和TypeScript开发的Chrome浏览器扩展项目，使用Vite作为构建工具。

## 项目结构

```
chrome-extension-vue3/
├── src/
│   ├── assets/           # 静态资源（图标等）
│   ├── background/       # 背景脚本
│   ├── content/          # 内容脚本
│   ├── popup/            # 弹出窗口
│   ├── options/          # 选项页面
│   ├── components/       # 共享组件
│   ├── store/            # 状态管理
│   └── utils/            # 工具函数
├── manifest.json         # 扩展清单文件
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
└── package.json          # 项目依赖
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 加载扩展到Chrome浏览器

1. 打开Chrome浏览器，进入扩展管理页面 (`chrome://extensions/`)
2. 开启"开发者模式"（右上角）
3. 点击"加载已解压的扩展程序"
4. 选择项目的`dist`目录

## 功能说明

本扩展提供以下功能：

- 弹出窗口 (Popup)：显示当前标签页信息并提供交互界面
- 选项页面 (Options)：提供扩展详细设置
- 内容脚本 (Content Script)：与网页交互
- 后台脚本 (Background)：处理扩展生命周期和事件

## 技术栈

- Vue 3
- TypeScript
- Vite
- Chrome Extension API

## 开发注意事项

- 修改`manifest.json`时需要重新构建并重新加载扩展
- 内容脚本的权限受到Chrome安全策略限制
- 使用Chrome Storage API进行数据持久化
- 遵循Chrome扩展开发的最佳实践

## 许可证

MIT
