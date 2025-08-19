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
  width: 80px;
  padding: 8px 0;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
  background-color: #fafafa;
  
  .tabs-menu {
    border-right: none;
    background-color: transparent;
    
    :deep(.el-menu-item) {
      height: 80px;
      padding: 16px 8px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 4px 8px;
      border-radius: 8px;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: #f0f2f5;
        transform: translateY(-1px);
      }
      
      &.is-active {
        background-color: #409eff;
        color: #fff;
        
        .menu-icon {
          color: #fff;
        }
        
        .menu-text {
          color: #fff;
        }
      }
      
      .menu-icon {
        margin-right: 0;
        font-size: 20px;
        margin-bottom: 6px;
        color: #606266;
        transition: color 0.3s ease;
      }
      
      .menu-text {
        font-size: 12px;
        line-height: 1.2;
        white-space: nowrap;
        width: 100%;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #606266;
        font-weight: 500;
        transition: color 0.3s ease;
      }
    }
  }
}
</style> 