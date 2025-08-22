# Mock Panel API

Mock Panel 是 Request Master 的用户界面组件，提供可视化的Mock规则管理和请求监控功能。

## 组件结构

### 主要组件

```vue
<template>
  <div class="mock-panel">
    <!-- 工具栏 -->
    <div class="toolbar">
      <switch v-model="monitorEnabled" />
      <switch v-model="mockEnabled" />
      <button @click="clearCache">清空缓存</button>
    </div>
    
    <!-- 请求列表 -->
    <div class="request-list">
      <request-item 
        v-for="request in requestList" 
        :key="request.id"
        :data="request"
        @select="selectRequest"
      />
    </div>
    
    <!-- 详情面板 -->
    <div class="detail-panel">
      <json-viewer :data="selectedRequest" />
    </div>
  </div>
</template>
```

## 核心功能

### 请求监控

```typescript
interface RequestItem {
  id: string;
  url: string;
  method: string;
  status: number;
  timestamp: number;
  duration: number;
  request: AjaxHookRequest;
  response: AjaxHookResponse;
  cached: boolean;
  mocked: boolean;
}

class RequestMonitor {
  private requestList: RequestItem[] = [];
  
  // 添加新请求
  addRequest(data: RequestItem): void {
    this.requestList.unshift(data);
    
    // 限制列表长度，避免内存溢出
    if (this.requestList.length > 1000) {
      this.requestList = this.requestList.slice(0, 1000);
    }
  }
  
  // 清空请求列表
  clearRequests(): void {
    this.requestList = [];
  }
  
  // 过滤请求
  filterRequests(filter: RequestFilter): RequestItem[] {
    return this.requestList.filter(item => {
      if (filter.method && item.method !== filter.method) {
        return false;
      }
      if (filter.status && item.status !== filter.status) {
        return false;
      }
      if (filter.url && !item.url.includes(filter.url)) {
        return false;
      }
      return true;
    });
  }
}
```

### Mock规则管理

```typescript
interface MockRule {
  id: string;
  name: string;
  url: string;
  method: string;
  enabled: boolean;
  response: MockResponse;
  conditions?: MockCondition[];
}

interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  data: any;
  delay?: number;
}

class MockRuleManager {
  private rules: MockRule[] = [];
  
  // 添加Mock规则
  addRule(rule: MockRule): void {
    this.rules.push(rule);
    this.saveToStorage();
    this.notifyUpdate();
  }
  
  // 更新Mock规则
  updateRule(id: string, updates: Partial<MockRule>): void {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      this.saveToStorage();
      this.notifyUpdate();
    }
  }
  
  // 删除Mock规则
  removeRule(id: string): void {
    this.rules = this.rules.filter(rule => rule.id !== id);  
    this.saveToStorage();
    this.notifyUpdate();
  }
  
  // 启用/禁用规则
  toggleRule(id: string): void {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.saveToStorage();
      this.notifyUpdate();
    }
  }
  
  // 获取所有规则
  getRules(): MockRule[] {
    return [...this.rules];
  }
  
  // 根据请求匹配规则
  matchRule(request: AjaxHookRequest): MockRule | null {
    return this.rules.find(rule => {
      if (!rule.enabled) return false;
      
      // URL匹配
      const urlMatch = this.matchUrl(rule.url, request.url);
      if (!urlMatch) return false;
      
      // 方法匹配
      if (rule.method.toUpperCase() !== request.method.toUpperCase()) {
        return false;
      }
      
      // 条件匹配
      if (rule.conditions) {
        return this.matchConditions(rule.conditions, request);
      }
      
      return true;
    }) || null;
  }
  
  private matchUrl(pattern: string, url: string): boolean {
    // 支持通配符匹配
    if (pattern.includes('*')) {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
      );
      return regex.test(url);
    }
    
    // 精确匹配
    return url.includes(pattern);
  }
  
  private matchConditions(conditions: MockCondition[], request: AjaxHookRequest): boolean {
    // 条件匹配逻辑
    return conditions.some(condition => {
      // 实现条件表达式解析和执行
      return this.evaluateCondition(condition, request);
    });
  }
  
  private saveToStorage(): void {
    // 保存到Chrome扩展存储
    chrome.storage.local.set({
      mockRules: this.rules
    });
  }
  
  private notifyUpdate(): void {
    // 通知Ajax Hook更新Mock规则
    this.sendMessage('mockList_change', this.rules);
  }
}
```

## 用户界面组件

### JsonViewer组件

```vue
<template>
  <div class="json-viewer">
    <div class="json-toolbar">
      <button @click="expandAll">展开全部</button>
      <button @click="collapseAll">收起全部</button>
      <button @click="copyJson">复制JSON</button>
    </div>
    
    <div class="json-content" ref="jsonContainer">
      <json-node 
        v-for="(value, key) in data" 
        :key="key"
        :name="key"
        :value="value"
        :level="0"
      />  
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  data: any;
  expandLevel?: number;
}

const props = withDefaults(defineProps<Props>(), {
  expandLevel: 2
});

const jsonContainer = ref<HTMLElement>();

const expandAll = () => {
  // 展开所有节点
  const nodes = jsonContainer.value?.querySelectorAll('.json-node');
  nodes?.forEach(node => {
    node.classList.add('expanded');
  });
};

const collapseAll = () => {
  // 收起所有节点
  const nodes = jsonContainer.value?.querySelectorAll('.json-node');
  nodes?.forEach(node => {
    node.classList.remove('expanded');
  });
};

const copyJson = () => {
  // 复制JSON到剪贴板
  const jsonString = JSON.stringify(props.data, null, 2);
  navigator.clipboard.writeText(jsonString);
};
</script>
```

### RequestItem组件

```vue
<template>
  <div 
    class="request-item"
    :class="{
      'active': selected,
      'error': data.status >= 400,
      'cached': data.cached,
      'mocked': data.mocked
    }"
    @click="$emit('select', data)"
  >
    <div class="request-header">
      <span class="method" :class="data.method.toLowerCase()">
        {{ data.method }}
      </span>
      <span class="url">{{ data.url }}</span>
      <span class="status" :class="getStatusClass(data.status)">
        {{ data.status }}
      </span>
    </div>
    
    <div class="request-meta">
      <span class="time">{{ formatTime(data.timestamp) }}</span>
      <span class="duration">{{ data.duration }}ms</span>
      <span v-if="data.cached" class="tag cached">缓存</span>
      <span v-if="data.mocked" class="tag mocked">Mock</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  data: RequestItem;
  selected?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [data: RequestItem];
}>();

const getStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  if (status >= 500) return 'server-error';
  return '';
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};
</script>
```

## 事件通信

### 与背景脚本通信

```typescript
class MessageHandler {
  // 发送消息到背景脚本
  sendToBackground(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type,
        data
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  // 监听来自背景脚本的消息
  onMessage(callback: (message: any) => void): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      callback(message);
      sendResponse({ success: true });
    });
  }
}
```

### 与内容脚本通信

```typescript
class ContentCommunication {
  // 发送配置变更到内容脚本
  sendConfigChange(type: string, data: any): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type,
          data
        });
      }
    });
  }
  
  // 监听来自内容脚本的数据
  onContentMessage(callback: (data: any) => void): void {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (sender.tab) {
        callback(message);
      }
    });
  }
}
```

## 数据持久化

### 存储管理

```typescript
class StorageManager {
  // 保存Mock规则
  async saveMockRules(rules: MockRule[]): Promise<void> {
    await chrome.storage.local.set({
      mockRules: rules
    });
  }
  
  // 加载Mock规则
  async loadMockRules(): Promise<MockRule[]> {
    const result = await chrome.storage.local.get('mockRules');
    return result.mockRules || [];
  }
  
  // 保存用户配置
  async saveConfig(config: UserConfig): Promise<void> {
    await chrome.storage.local.set({
      userConfig: config
    });
  }
  
  // 加载用户配置
  async loadConfig(): Promise<UserConfig> {
    const result = await chrome.storage.local.get('userConfig');
    return result.userConfig || defaultConfig;
  }
  
  // 导出数据
  async exportData(): Promise<ExportData> {
    const [mockRules, config] = await Promise.all([
      this.loadMockRules(),
      this.loadConfig()
    ]);
    
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      mockRules,
      config
    };
  }
  
  // 导入数据
  async importData(data: ExportData): Promise<void> {
    if (data.version === '1.0.0') {
      await Promise.all([
        this.saveMockRules(data.mockRules),
        this.saveConfig(data.config)
      ]);
    } else {
      throw new Error('不支持的数据版本');
    }
  }
}
```

## 主题和样式

### CSS变量定义

```css
:root {
  /* 颜色变量 */
  --primary-color: #1976d2;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --error-color: #f44336;
  --info-color: #2196f3;
  
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #eeeeee;
  
  /* 文字颜色 */
  --text-primary: #212121;
  --text-secondary: #757575;
  --text-disabled: #bdbdbd;
  
  /* 边框和分割线 */
  --border-color: #e0e0e0;
  --divider-color: #f0f0f0;
}

/* 暗色主题 */
.dark-theme {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --bg-tertiary: #2c2c2c;
  
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --text-disabled: #666666;
  
  --border-color: #333333;
  --divider-color: #2c2c2c;
}
```

### 组件样式

```scss
.mock-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  
  .toolbar {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-color);
    gap: 12px;
    
    .switch {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    button {
      padding: 6px 12px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      
      &:hover {
        background: var(--bg-tertiary);
      }
    }
  }
  
  .request-list {
    flex: 1;
    overflow-y: auto;
    
    .request-item {
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
      cursor: pointer;
      
      &:hover {
        background: var(--bg-secondary);
      }
      
      &.active {
        background: var(--primary-color);
        color: white;
      }
      
      &.error {
        border-left: 3px solid var(--error-color);
      }
      
      .request-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
        
        .method {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          
          &.get { background: var(--success-color); color: white; }
          &.post { background: var(--info-color); color: white; }
          &.put { background: var(--warning-color); color: white; }
          &.delete { background: var(--error-color); color: white; }
        }
        
        .url {
          flex: 1;
          font-family: monospace;
          font-size: 13px;
        }
        
        .status {
          font-weight: bold;
          
          &.success { color: var(--success-color); }
          &.client-error { color: var(--error-color); }
          &.server-error { color: var(--error-color); }
        }
      }
      
      .request-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        color: var(--text-secondary);
        
        .tag {
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 10px;
          
          &.cached {
            background: var(--info-color);
            color: white;
          }
          
          &.mocked {
            background: var(--warning-color);
            color: white;
          }
        }
      }
    }
  }
}
```

通过这些API和组件，Mock Panel 提供了完整的可视化界面，让用户能够方便地管理Mock规则和监控Ajax请求。
