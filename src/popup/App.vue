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
import { Storage } from '@/utils/index';
import { ref, onMounted, nextTick } from "vue"



const isActive = ref(false)



// 切换激活状态
const toggleActive = () => {
  isActive.value = !isActive.value
  nextTick(() => {
    Storage.set({ disasterRecoveryProcessing: isActive.value })
  })
}

// 打开缓存查看器
// const openCacheViewer = () => {
//   chrome.tabs.create({
//     url: chrome.runtime.getURL('src/cache-viewer/index.html')
//   });
// }

onMounted(async () => {
  // 获取当前激活状态
  const disasterRecoveryProcessing = await Storage.get('disasterRecoveryProcessing')
  isActive.value = disasterRecoveryProcessing

})
</script>

<style scoped lang="scss">
.popup {
  &-container {
    width: 300px;
    min-height: 200px;
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
