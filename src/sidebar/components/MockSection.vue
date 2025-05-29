<template>
  <div class="mock-section" ref="mockSectionRef">
    <div class="section-header">
      <div class="section-title">Mock列表</div>
    </div>

    <div class="mock-list">
      <div v-if="mockList.length === 0" class="empty-list">
        <el-empty description="暂无Mock数据" />
        <el-button type="primary" @click="handleAddMock">添加第一个Mock</el-button>
      </div>
      <template v-else>
        <div class="mock-items">
          <div 
            v-for="(item, index) in mockList" 
            :key="index" 
            class="mock-item"
            @click="selectMock(index)"
          >
            <div class="mock-item-header">
              <div class="mock-item-url">{{ item.url }}</div>
              <div class="mock-item-method" :class="getMethodClass(item.method)">
                {{ item.method }}
              </div>
            </div>
            <div class="mock-item-footer">
              <el-switch 
                v-model="item.enabled" 
                @change="updateMockStatus(index, item.enabled)"
              />
              <div class="mock-item-actions">
                <el-button 
                  type="text" 
                  icon="Edit"
                  @click.stop="editMock(index)"
                >
                  编辑
                </el-button>
                <el-button 
                  type="text" 
                  icon="Delete"
                  @click.stop="deleteMock(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chromeLocalStorage } from '@/utils';

// 接收父组件传递的属性
defineProps<{
  mockList: any[];
  selectedMockIndex: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'select-mock', index: number): void;
  (e: 'update-mock-status', index: number, enabled: boolean): void;
  (e: 'edit-mock', index: number): void;
  (e: 'delete-mock', index: number): void;
  (e: 'add-mock'): void;
}>();

// DOM引用
const mockSectionRef = ref<HTMLElement | null>(null);

// 方法
const getMethodClass = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower === 'get') return 'method-get';
  if (methodLower === 'post') return 'method-post';
  if (methodLower === 'put') return 'method-put';
  if (methodLower === 'delete') return 'method-delete';
  return 'method-other';
};

const selectMock = (index: number) => {
  emit('select-mock', index);
};

const updateMockStatus = (index: number, enabled: boolean) => {
  emit('update-mock-status', index, enabled);
};

const editMock = (index: number) => {
  emit('edit-mock', index);
};

const deleteMock = (index: number) => {
  ElMessageBox.confirm('确定要删除这个Mock吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    emit('delete-mock', index);
  }).catch(() => {});
};

const handleAddMock = () => {
  emit('add-mock');
};

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
  }
  
  .mock-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    
    .mock-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .mock-item {
        border: 1px solid #ebeef5;
        border-radius: 4px;
        padding: 8px 12px;
        background-color: #fff;
        transition: box-shadow 0.3s;
        cursor: pointer;
        
        &:hover {
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
        }
        
        &-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        &-url {
          font-size: 14px;
          font-weight: 500;
          color: #303133;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
        
        &-method {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 3px;
          
          &.method-get {
            background-color: #409eff;
            color: white;
          }
          
          &.method-post {
            background-color: #67c23a;
            color: white;
          }
          
          &.method-put {
            background-color: #e6a23c;
            color: white;
          }
          
          &.method-delete {
            background-color: #f56c6c;
            color: white;
          }
          
          &.method-other {
            background-color: #909399;
            color: white;
          }
        }
        
        &-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        &-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
    
    .empty-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 0;
      gap: 16px;
    }
  }
}
</style> 