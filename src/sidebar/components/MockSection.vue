<template>
  <div class="mock-section" ref="mockSectionRef">
    <div class="section-header">
      <div class="section-title">Mock列表</div>
      <div class="mock-actions">
        <span style="margin-right: 8px;">Mock功能</span>
        <el-switch 
          v-model="mockEnabled" 
          @change="handleMockToggle"
        />
        <el-button type="primary" size="small" @click="handleAddMock">
          添加Mock
        </el-button>
        <el-button type="danger" size="small" @click="handleClearAllMocks">
          清除所有
        </el-button>
      </div>
    </div>

    <!-- Mock列表头部 -->
    <div class="mock-header">
      <div class="url-column">URL</div>
      <div class="method-column">方法</div>
      <div class="action-column">操作</div>
    </div>

    <!-- Mock列表 -->
    <div class="mock-list">
      <div v-if="mockList.length === 0" class="empty-list">
        <el-empty description="暂无Mock数据" :image-size="130"/>
      </div>
      <template v-else>
        <div 
          v-for="(item, index) in mockList" 
          :key="index" 
          class="mock-item"
          :class="{'selected': selectedMockIndex === index}"
          @click="selectMock(index)"
        >
          <div class="url-column text-ellipsis">
            <el-tooltip 
              effect="dark" 
              :content="item.url" 
              placement="top"
              :show-after="500"
            >
              <span>{{ getUrlPath(item.url) }}</span>
            </el-tooltip>
          </div>
          <div class="method-column">
            <el-tag :type="getMethodType(item.method)" size="small">
              {{ item.method }}
            </el-tag>
          </div>
          <div class="action-column">
            <el-button
              type="primary"
              size="small"
              circle
              @click.stop="editMock(index)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              type="danger"
              size="small"
              circle
              @click.stop="deleteMock(item.cacheKey)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chromeLocalStorage, customEventSend, getUrlPath, messageToContent } from '@/utils';
import { Edit, Delete } from '@element-plus/icons-vue';

// 接收父组件传递的属性
defineProps<{
  mockList: any[];
  selectedMockIndex: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'select-mock', index: number): void;
  (e: 'edit-mock', index: number): void;
  (e: 'delete-mock', cacheKey: string): void;
  (e: 'add-mock'): void;
  (e: 'mock-toggle', enabled: boolean): void;
  (e: 'clear-all-mocks'): void;
}>();

// DOM引用
const mockSectionRef = ref<HTMLElement | null>(null);
const mockEnabled = ref(false);

// 方法
const getMethodType = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower === 'get') return 'info';
  if (methodLower === 'post') return 'success';
  if (methodLower === 'put') return 'warning';
  if (methodLower === 'delete') return 'danger';
  return 'info';
};

const selectMock = (index: number) => {
  emit('select-mock', index);
};

const editMock = (index: number) => {
  emit('edit-mock', index);
};

const deleteMock = (cacheKey: string) => {
  emit('delete-mock', cacheKey);
};

const handleAddMock = () => {
  emit('add-mock');
};

const handleMockToggle = (enabled: boolean) => {
  emit('mock-toggle', enabled);
  ElMessage.success(enabled ? 'Mock已开启' : 'Mock已关闭');
};

const handleClearAllMocks = () => {
  ElMessageBox.confirm(
    '确定要清除所有Mock数据吗？此操作不可恢复。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      emit('clear-all-mocks');
      ElMessage.success('已清除所有Mock数据');
    })
    .catch(() => {
      // 用户取消操作，不做任何处理
    });
};

// 初始化Mock开关状态
onMounted(async () => {
  const storedMockEnabled = await chromeLocalStorage.get('mockEnabled');
  mockEnabled.value = storedMockEnabled === true;
});

watch(mockEnabled, (newVal) => {
  chromeLocalStorage.set({ mockEnabled: newVal });
  messageToContent({
    type: 'mockEnabled_change',
    data: newVal
  }, () => {});
});

// 暴露给父组件的方法和属性
defineExpose({
  mockSectionRef
});
</script>

<style scoped lang="scss">
.mock-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
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
    
    .mock-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
  
  .mock-header {
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
    
    .method-column {
      width: 70px;
      text-align: center;
    }
    
    .action-column {
      width: 100px;
      text-align: center;
    }
  }
  
  .mock-list {
    flex: 1;
    overflow-y: auto;
    
    /* 只在内容溢出时显示滚动条 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.3);
      }
    }
    
    /* 针对Firefox */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    
    .empty-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 0;
      :deep(.el-empty) {
        --el-empty-padding: 10px 0;
      }
    }
    
    .mock-item {
      display: flex;
      padding: 4px 6px;
      align-items: center;
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
      
      .method-column {
        width: 70px;
        text-align: center;
      }
      
      .action-column {
        width: 100px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
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