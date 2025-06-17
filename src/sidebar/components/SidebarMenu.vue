<template>
  <div class="tabs-sidebar">
    <el-menu :default-active="activeTab" class="tabs-menu" @select="handleSelect">
      <el-menu-item index="monitor" class="menu-item-vertical">
        <el-icon class="menu-icon"><Monitor /></el-icon>
        <span class="menu-text">请求监测</span>
      </el-menu-item>
      <el-menu-item index="setting" class="menu-item-vertical">
        <el-icon class="menu-icon"><Setting /></el-icon>
        <span class="menu-text">设置</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { Monitor, Setting } from '@element-plus/icons-vue';
import { ElMenu, ElMenuItem, ElIcon } from 'element-plus';

// 接收父组件传递的属性
defineProps<{
  activeTab: string
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'update:activeTab', value: string): void
}>();

// 处理菜单选择
const handleSelect = (key: string) => {
  emit('update:activeTab', key);
};
</script>

<style scoped lang="scss">
.tabs-sidebar {
  width: 84px;
  border-right: 1px solid #ebeef5;
  flex-shrink: 0;
  
  .tabs-menu {
    border-right: none;
    
    :deep(.el-menu-item) {
      height: 70px;
      padding: 12px 0 !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      
      .menu-icon {
        margin-right: 0;
        font-size: 18px;
        margin-bottom: 4px;
      }
      
      .menu-text {
        font-size: 12px;
        line-height: 1.2;
        white-space: nowrap;
        width: 100%;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}
</style> 