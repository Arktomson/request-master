<template>
  <div class="sidebar-header">
    <div class="sidebar-title">Mock工具</div>
    <div class="sidebar-header-right">
      <span>切换侧边栏位置</span>
      <el-select v-model="sidebarPosition" @change="handleSidebarPositionChange">
        <el-option label="右侧" value="right" />
        <el-option label="底部" value="bottom" />
      </el-select>
      <span>是否缓存侧边栏</span>
      <el-switch v-model="sidebarIfCacheState" @change="handleSidebarIfCacheStateChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { chromeLocalStorage, messageToContent } from '../../../../utils';
import { onMounted, ref } from 'vue'
import { ElSwitch, ElSelect, ElOption } from 'element-plus';
const sidebarIfCacheState = ref(false);
const sidebarPosition = ref('right');

function handleSidebarPositionChange(value: string) {
  chromeLocalStorage.set({
    'sidebarPosition': value
  })
  messageToContent({
    type: 'toggle_sidebar_position',
    data: {
      position: value
    }
  })
}

function handleSidebarIfCacheStateChange(value: boolean | string | number) {
  chromeLocalStorage.set({
    'sidebarIfCacheState': value
  })
}

onMounted(async () => {
  const { sidebarIfCacheState: sidebarIfCacheStateInStorage, sidebarPosition: sidebarPositionInStorage } = await chromeLocalStorage.get(['sidebarIfCacheState', 'sidebarPosition'])
  sidebarIfCacheState.value = sidebarIfCacheStateInStorage
  sidebarPosition.value = sidebarPositionInStorage
})
// 无需props和事件
</script>

<style scoped lang="scss">
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 8px 0px;
  border-bottom: 1px solid #ebeef5;
  min-height: 40px;
  
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
    gap: 8px;
    font-size: 14px;
    color: #606266;
    white-space: nowrap;
    
    span {
      margin-right: 4px;
    }
    
    .el-select {
      width: 80px;
      margin-right: 8px;
    }
  }
}
</style> 