<template>
  <div class="popup-container">
    <header class="popup-header">
      <img src="../assets/icon48.png" alt="Logo" class="logo">
      <h1>HTTP缓存工具</h1>
    </header>
    
    <main class="popup-content">
      <div class="status-section">
        <p>状态: <span class="status-badge" :class="{ active: isActive }">
          {{ isActive ? '激活' : '未激活' }}</span>
        </p>
        <button @click="toggleActive" class="toggle-btn" :class="{ active: isActive }">
          {{ isActive ? '停用' : '启用' }}
        </button>
      </div>
      
      <div class="stats-section" v-if="cacheStats">
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
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'

interface CacheStats {
  hits: number;
  misses: number;
  savedBytes: number;
  savedTime: number;
  cacheCount?: number;
  totalSize?: number;
}

export default defineComponent({
  name: 'PopupApp',
  setup() {
    const isActive = ref(false)
    const cacheStats = ref<CacheStats | null>(null)
    
    // 格式化字节
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }
    
    // 切换激活状态
    const toggleActive = () => {
      isActive.value = !isActive.value
      chrome.storage.local.set({ isActive: isActive.value })
      
      // 向当前标签页发送消息
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'TOGGLE_STATE', 
            isActive: isActive.value 
          })
        }
      })
    }
    
    // 加载缓存统计数据
    const loadCacheStats = () => {
      chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }, (response) => {
        if (response && response.success) {
          cacheStats.value = response.data;
        }
      });
    }
    
    // 打开缓存查看器
    const openCacheViewer = () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/cache-viewer/index.html')
      });
    }
    
    onMounted(() => {
      // 获取当前激活状态
      chrome.storage.local.get(['isActive'], (result) => {
        isActive.value = result.isActive !== false
      })
      
      // 加载缓存统计数据
      loadCacheStats();
    })
    
    return {
      isActive,
      cacheStats,
      toggleActive,
      formatBytes,
      openCacheViewer
    }
  }
})
</script>

<style scoped>
.popup-container {
  width: 300px;
  min-height: 200px;
  background-color: #f9fafb;
  color: #1f2937;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 12px;
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.popup-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-badge {
  font-weight: 600;
  color: #ef4444;
}

.status-badge.active {
  color: #10b981;
}

.status-section p {
  margin: 0;
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
}

.toggle-btn.active {
  background-color: #10b981;
}

.toggle-btn:hover {
  filter: brightness(1.1);
}

.stats-section {
  background-color: #ffffff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stats-section h2 {
  font-size: 16px;
  margin: 0 0 12px 0;
  color: #374151;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #3b82f6;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.cache-viewer-section {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.cache-viewer-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cache-viewer-btn:hover {
  background-color: #2563eb;
}
</style>
