<template>
  <div class="json-viewer-area" ref="jsonViewerAreaRef">
    <div class="viewer-header">
      <span>响应数据</span>
      <div class="viewer-actions">
        <el-button size="small" type="primary" @click="handleCopyJson">复制</el-button>
        <el-button size="small" @click="handleFormatJson">格式化</el-button>
        <div v-if="hasContent" class="json-editor-actions">
        <!-- 只有选择Mock时才显示编辑按钮，监控状态时不能编辑 -->
        <el-button 
          v-if="!isEditing && isMockSelected" 
          type="primary" 
          size="small" 
          @click="startEditing"
        >
          编辑
        </el-button>
        <template v-else-if="isEditing && isMockSelected">
          <el-button type="success" size="small" @click="saveJsonEdit">保存</el-button>
          <el-button size="small" @click="cancelJsonEdit">取消</el-button>
        </template>

      </div>
      </div>
    </div>
    <div class="json-content">
             <el-input
         v-model="jsonContent"
         type="textarea"
         :rows="38"
         placeholder="选择请求查看JSON响应"
         :readonly="!isEditing || !isMockSelected"
       />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { messageToContent } from '@/utils';

// 定义属性
const props = defineProps<{
  content: string;
  isSelected: boolean;
  isMockSelected: boolean;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'update:content', value: string): void;
  (e: 'save', value: string): void;
}>();

// 状态
const jsonContent = ref(props.content);
const isEditing = ref(false);
const jsonBackup = ref('');
const jsonViewerAreaRef = ref<HTMLElement | null>(null);

// 计算属性
const hasContent = computed(() => {
  return props.isSelected || props.isMockSelected;
});

// 监听属性变化
watch(() => props.content, (newValue) => {
  jsonContent.value = newValue;
});

// 监听选择状态变化，如果切换到监控状态则退出编辑模式
watch(() => [props.isSelected, props.isMockSelected], ([isSelected, isMockSelected]) => {
  if (isSelected && !isMockSelected && isEditing.value) {
    // 从Mock切换到监控状态时，自动退出编辑模式
    cancelJsonEdit();
    ElMessage.info('已切换到监控状态，自动退出编辑模式');
  }
});

// 方法
const handleCopyJson = async () => {
  if (!jsonContent.value) {
    ElMessage.warning('没有内容可复制');
    return;
  }
  messageToContent({
    type: 'copy_json',
    data: jsonContent.value
  },(response) => {
    if(response.success){
      ElMessage.success('已复制到剪贴板');
    }else{
      ElMessage.error('复制失败，请手动复制');
    }
  });
};

const handleFormatJson = () => {
  if (!jsonContent.value) {
    ElMessage.warning('没有内容可格式化');
    return;
  }

  try {
    const parsed = JSON.parse(jsonContent.value);
    jsonContent.value = JSON.stringify(parsed, null, 2);
    emit('update:content', jsonContent.value);
    ElMessage.success('格式化成功');
  } catch (error) {
    ElMessage.error('JSON格式无效，无法格式化');
  }
};

const startEditing = () => {
  // 只有在选择Mock时才允许编辑
  if (!props.isMockSelected) {
    ElMessage.warning('监控状态下不允许编辑，请选择Mock项目进行编辑');
    return;
  }
  
  jsonBackup.value = jsonContent.value;
  isEditing.value = true;
};

const saveJsonEdit = () => {
  try {
    // 尝试解析确保有效
    JSON.parse(jsonContent.value);
    
    // 更新内容并发送保存事件
    emit('update:content', jsonContent.value);
    emit('save', jsonContent.value);
    
    isEditing.value = false;
    ElMessage.success('修改已保存');
  } catch (error) {
    ElMessage.error('JSON格式无效，请检查格式');
  }
};

const cancelJsonEdit = () => {
  jsonContent.value = jsonBackup.value;
  emit('update:content', jsonContent.value);
  isEditing.value = false;
};

// 暴露给父组件的方法和属性
defineExpose({
  jsonViewerAreaRef
});
</script>

<style scoped lang="scss">
.json-viewer-area {
  flex: 1;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #ebeef5;
    font-weight: bold;
    
    .viewer-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .json-content {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .el-input {
      height: 100%;
      overflow: hidden;
      
      :deep(.el-textarea__inner) {
        height: 100%;
        font-family: monospace;
        resize: none;
        overflow: auto;
      }
    }
    
    .json-editor-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      
    }
  }
}

// 响应式调整
@media (max-width: 1200px) {
  .json-viewer-area {
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .json-viewer-area {
    min-width: 180px;
  }
}
</style> 