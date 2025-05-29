<template>
  <div class="sidebar-header">
    <h1 class="sidebar-title">Mock工具</h1>
    <div class="sidebar-status">
      <span class="status-indicator" :class="{ 'active': isActive }"></span>
      <span>{{ isActive ? '已激活' : '未激活' }}</span>
      <el-switch :model-value="isActive" @update:model-value="toggleActive" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { chromeLocalStorage } from '@/utils';

// 接收父组件传递的属性
defineProps<{
  isActive: boolean
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'update:isActive', value: boolean): void
}>();

// 方法
const toggleActive = (value: boolean) => {
  emit('update:isActive', value);
  chromeLocalStorage.set({ mockEnabled: value });
  ElMessage.success(value ? 'Mock功能已启用' : 'Mock功能已禁用');
};
</script>

<style scoped lang="scss">
.sidebar-header {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  
  .sidebar-title {
    font-size: 18px;
    margin: 0 0 8px 0;
    color: #303133;
  }
  
  .sidebar-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #606266;
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #909399;
      
      &.active {
        background-color: #67c23a;
      }
    }
  }
}
</style> 