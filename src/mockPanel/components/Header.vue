<template>
  <div class="sidebar-header">
    <div class="sidebar-title">Mock工具</div>
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

function handleSidebarIfCacheStateChange(value: boolean | string | number) {
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
  padding: 3px 0px;
  border-bottom: 1px solid #ebeef5;
  
  .sidebar-title {
    font-size: 16px;
    color: #303133;
    font-weight: bold;
    margin-left: 10px;
  }

  .sidebar-header-right {
    margin-left: auto;
    margin-right: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #606266;
  }
}
</style> 