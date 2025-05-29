<template>
  <div class="monitor-section" ref="monitorSectionRef">
    <div class="section-header">
      <div class="section-title">监控记录</div>
      <div class="monitor-actions">
        <el-button type="primary" size="small" @click="handleClearRequests">
          清空记录
        </el-button>
        <el-button type="success" size="small" @click="handleAddMock">
          添加Mock
        </el-button>
      </div>
    </div>

    <!-- 请求列表头部 -->
    <div class="request-header">
      <div class="url-column">URL</div>
      <div class="time-column">时间</div>
      <div class="method-column">方法</div>
    </div>

    <!-- 请求列表 -->
    <div class="request-list">
      <div 
        v-for="(item, index) in requests" 
        :key="index" 
        class="request-item"
        :class="{'selected': selectedRequestIndex === index}"
        @click="selectRequest(index)"
      >
        <div class="url-column text-ellipsis">{{ item.url }}</div>
        <div class="time-column">{{ formatTime(item.time) }}</div>
        <div class="method-column">
          <el-tag :type="getMethodType(item.method)" size="small">
            {{ item.method }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chromeSessionStorage } from '@/utils';

// 接收父组件传递的属性
defineProps<{
  requests: any[];
  selectedRequestIndex: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'select-request', index: number): void;
  (e: 'clear-requests'): void;
  (e: 'add-mock'): void;
}>();

// DOM引用
const monitorSectionRef = ref<HTMLElement | null>(null);

// 方法
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

const getMethodType = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower === 'get') return '';
  if (methodLower === 'post') return 'success';
  if (methodLower === 'put') return 'warning';
  if (methodLower === 'delete') return 'danger';
  return 'info';
};

const selectRequest = (index: number) => {
  emit('select-request', index);
};

const handleClearRequests = () => {
  ElMessageBox.confirm('确定要清空所有请求记录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    emit('clear-requests');
  }).catch(() => {});
};

const handleAddMock = () => {
  emit('add-mock');
};

// 暴露给父组件的方法和属性
defineExpose({
  monitorSectionRef
});
</script>

<style scoped lang="scss">
.monitor-section {
  height: 50%;
  display: flex;
  flex-direction: column;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #ebeef5;
    
    .section-title {
      font-weight: 600;
      font-size: 14px;
    }
    
    .monitor-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .request-header {
    display: flex;
    padding: 8px 12px;
    background-color: #f5f7fa;
    font-weight: bold;
    font-size: 12px;
    color: #606266;
    border-bottom: 1px solid #ebeef5;
    
    .url-column {
      flex: 1;
    }
    
    .time-column {
      width: 70px;
      text-align: center;
    }
    
    .method-column {
      width: 70px;
      text-align: center;
    }
  }
  
  .request-list {
    flex: 1;
    overflow-y: auto;
    
    .request-item {
      display: flex;
      padding: 8px 12px;
      border-bottom: 1px solid #ebeef5;
      cursor: pointer;
      
      &:hover {
        background-color: #f5f7fa;
      }
      
      &.selected {
        background-color: #ecf5ff;
      }
      
      .url-column {
        flex: 1;
        font-size: 12px;
      }
      
      .time-column {
        width: 70px;
        text-align: center;
        font-size: 12px;
        color: #909399;
      }
      
      .method-column {
        width: 70px;
        text-align: center;
      }
    }
  }
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 