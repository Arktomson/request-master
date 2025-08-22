---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Request Master"
  text: "Ajax请求拦截与Mock工具"
  tagline: 强大的Chrome扩展，让前端开发和测试更轻松
  image:
    src: /logo.svg
    alt: Request Master
    width: 400
    height: 400
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看API
      link: /api/ajax-hook

features:
  - icon: 🚀
    title: Ajax请求拦截
    details: 自动拦截和监控页面中的所有Ajax请求，提供详细的请求和响应信息
  - icon: 🛠️
    title: 灵活的Mock功能
    details: 支持动态配置Mock规则，轻松模拟各种API响应场景
  - icon: 📊
    title: 实时监控面板
    details: 直观的侧边栏界面，实时展示请求状态和数据，支持JSON格式化显示
  - icon: 💾
    title: 智能缓存管理
    details: 内置缓存机制，支持数据恢复和容错处理，提升开发效率
  - icon: ⚡
    title: 高性能设计
    details: 优化的事件系统和内存管理，确保扩展运行流畅不影响页面性能
  - icon: 🔧
    title: 易于集成
    details: 简单的配置方式，支持动态开关，可无缝集成到现有开发流程
---

## 为什么选择 Request Master？

Request Master 是专为前端开发者和测试人员设计的Chrome扩展工具。它解决了在开发过程中经常遇到的以下问题：

- **调试困难**：难以实时查看Ajax请求的详细信息
- **接口未就绪**：后端接口还未完成，需要Mock数据进行前端开发
- **测试场景复杂**：需要模拟各种异常情况和边界情况
- **数据恢复**：网络异常时希望能够使用缓存数据

## 主要特性

### 🎯 智能请求拦截
- 自动识别XHR和Fetch请求
- 支持请求和响应数据的完整记录
- 实时状态监控和错误处理

### 🎨 可视化操作界面
- 类似Chrome DevTools的专业界面
- 支持拖拽调整面板大小
- JSON数据格式化显示和编辑

### ⚙️ 灵活的配置系统
- 支持URL匹配规则配置
- 动态开关控制
- 批量数据处理能力

### 🔒 数据安全保障
- 本地存储，不上传任何敏感数据
- 支持数据导入导出
- 完善的错误处理机制

---

准备好开始了吗？查看我们的[快速开始指南](/guide/getting-started)，几分钟内即可上手使用！
