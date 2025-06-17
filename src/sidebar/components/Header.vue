<template>
  <div class="sidebar-header">
    <h1 class="sidebar-title">Mock工具</h1>
    <div class="sidebar-header-right">
      <span>是否缓存侧边栏</span>
      <el-switch v-model="sidebarIfCacheState" @change="handleSidebarIfCacheStateChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { chromeLocalStorage } from '@/utils';
import { onMounted, ref } from 'vue'
import { ElSwitch } from 'element-plus';
const sidebarIfCacheState = ref(false);

function handleSidebarIfCacheStateChange(value: boolean) {
  chromeLocalStorage.set({
    'sidebarIfCacheState': value
  })
}

onMounted(async () => {
  const sidebarIfCacheStateInStorage = await chromeLocalStorage.get('sidebarIfCacheState')
  sidebarIfCacheState.value = sidebarIfCacheStateInStorage
})
// 无需props和事件
</script>

<style scoped lang="scss">
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  
  .sidebar-title {
    font-size: 18px;
    margin: 0;
    color: #303133;
  }

  .sidebar-header-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #606266;
  }
}
</style> 