<template>
  <div class="popup-container">
    <header class="popup-header">
      <img src="../assets/icon48.png" alt="Logo" class="logo">
      <h1>HTTP缓存工具</h1>
    </header>

    <main class="popup-content">
      <div class="status-section">
        <p>状态: <span class="status-badge" :class="{ active: isActive }">
            {{ isActive ? '激活' : '关闭' }}</span>
        </p>
        <button @click="toggleActive" class="toggle-btn" :class="{ active: isActive }">
          {{ isActive ? '停用' : '启用' }}
        </button>
      </div>

      <!-- 添加缓存数据展示部分 -->
      <div class="cache-data-section" v-if="curCacheData && curCacheData.length > 0">
        <h2>缓存命中数据 ({{ curCacheData.length }})</h2>
        <div class="cache-list">
          <div v-for="(item, index) in curCacheData" :key="index" class="cache-item">
            <div class="cache-header" @click="toggleItem(index)">
              <span class="method-badge" :class="getMethodClass(item?.method || 'GET')">
                {{ item?.method || 'GET' }}
              </span>
              <span class="url-text">{{ item?.url || '未知URL' }}</span>
              <span class="expand-icon">{{ expandedItems.includes(index) ? '▼' : '▶' }}</span>
            </div>
            <div v-if="expandedItems.includes(index)" class="cache-detail">
              <div class="params-section">
                <h3>请求参数</h3>
                <pre>{{ formatJson(item?.params) }}</pre>
              </div>
              <div class="response-section">
                <h3>响应数据</h3>
                <pre>{{ formatJson(item?.response) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-cache">
        <p>暂无缓存命中数据</p>
      </div>

      <!-- <div class="stats-section" v-if="cacheStats">
        <h2>缓存统计</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ cacheStats.cacheCount || 0 }}</div>
            <div class="stat-label">缓存条数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatBytes(cacheStats.totalSize || 0) }}</div>
            <div class="stat-label">总大小</div>
          </div>
        </div>
        <div class="cache-viewer-section">
          <button @click="openCacheViewer" class="cache-viewer-btn">查看缓存内容</button>
        </div>
      </div> -->
    </main>
  </div>
</template>

<script setup lang="ts">
import { chromeLocalStorage, chromeSessionStorage } from '@/utils/index';
import { ref, onMounted, nextTick } from "vue"


const isActive = ref(false)
const curCacheData = ref<any[]>([])
const expandedItems = ref<number[]>([])

// 切换激活状态
const toggleActive = () => {
  isActive.value = !isActive.value
  nextTick(() => {
    chromeLocalStorage.set({ disasterRecoveryProcessing: isActive.value })
  })
}

// 切换展开状态
const toggleItem = (index: number) => {
  const position = expandedItems.value.indexOf(index)
  if (position > -1) {
    expandedItems.value.splice(position, 1)
  } else {
    expandedItems.value.push(index)
  }
}

// 格式化JSON数据
const formatJson = (data: any) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch (e) {
    return String(data || '')
  }
}

// 根据请求方法获取样式
const getMethodClass = (method: string) => {
  const methodLower = (method || '').toLowerCase()
  if (methodLower === 'get') return 'method-get'
  if (methodLower === 'post') return 'method-post'
  if (methodLower === 'put') return 'method-put'
  if (methodLower === 'delete') return 'method-delete'
  return 'method-other'
}

// 打开缓存查看器
// const openCacheViewer = () => {
//   chrome.tabs.create({
//     url: chrome.runtime.getURL('src/cache-viewer/index.html')
//   });
// }

onMounted(async () => {
  // 获取当前激活状态
  const disasterRecoveryProcessing = await chromeLocalStorage.get('disasterRecoveryProcessing')
  isActive.value = disasterRecoveryProcessing

  // 获取缓存数据
  const data = await chromeSessionStorage.get('curCacheData')
  if (data) curCacheData.value = Array.isArray(data) ? data : [data]

  // 监听缓存数据变化
  chromeSessionStorage.onChange((changes: any, areaName) => {
    console.log("变化", changes);
    if (changes.curCacheData && changes.curCacheData.newValue) {
      curCacheData.value = changes.curCacheData.newValue
    }
  }, "curCacheData")
})
</script>

<style scoped lang="scss">
.popup {
  &-container {
    width: 400px; // 稍微增加宽度以便展示缓存数据
    min-height: 300px;
    background-color: #f9fafb;
    color: #1f2937;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 12px;
    display: flex;
    flex-direction: column;
  }

  &-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;

    h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
  }

  &-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 12px;
}

.status {
  &-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #ffffff;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    p {
      margin: 0;
    }
  }

  &-badge {
    font-weight: 600;
    color: #ef4444;

    &.active {
      color: #10b981;
    }
  }
}

.toggle-btn {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &.active {
    background-color: #10b981;
  }

  &:hover {
    filter: brightness(1.1);
  }
}

// 新增缓存数据样式
.cache-data-section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 12px;
  margin-top: 8px;

  h2 {
    font-size: 16px;
    margin: 0 0 12px 0;
    color: #374151;
  }
}

.cache-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.cache-item {
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
}

.cache-header {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  background-color: #f9fafb;

  &:hover {
    background-color: #f3f4f6;
  }
}

.method-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 8px;
  text-transform: uppercase;
}

.method-get {
  background-color: #3b82f6;
  color: white;
}

.method-post {
  background-color: #10b981;
  color: white;
}

.method-put {
  background-color: #f59e0b;
  color: white;
}

.method-delete {
  background-color: #ef4444;
  color: white;
}

.method-other {
  background-color: #8b5cf6;
  color: white;
}

.url-text {
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expand-icon {
  margin-left: 8px;
  color: #6b7280;
}

.cache-detail {
  padding: 12px;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;

  h3 {
    font-size: 14px;
    margin: 0 0 8px 0;
    color: #4b5563;
  }
}

.params-section,
.response-section {
  margin-bottom: 12px;

  pre {
    background-color: #f3f4f6;
    padding: 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }
}

.empty-cache {
  text-align: center;
  padding: 24px;
  color: #6b7280;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stats {
  &-section {
    background-color: #ffffff;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    h2 {
      font-size: 16px;
      margin: 0 0 12px 0;
      color: #374151;
    }
  }

  &-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    text-align: center;
  }
}

.stat {
  &-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &-value {
    font-size: 18px;
    font-weight: 600;
    color: #3b82f6;
  }

  &-label {
    font-size: 12px;
    color: #6b7280;
  }
}

.cache-viewer {
  &-section {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }

  &-btn {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #2563eb;
    }
  }
}
</style>
