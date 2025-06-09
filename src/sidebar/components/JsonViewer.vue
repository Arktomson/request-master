<template>
  <div class="json-viewer-area" ref="jsonViewerAreaRef">
    <div class="viewer-header">
      <span>数据面板</span>
      <div class="viewer-actions">
        <el-button size="small" type="primary" @click="handleCopyJson">复制</el-button>
        <el-button size="small" @click="handleFormatJson">格式化</el-button>
        <div v-if="hasContent" class="json-editor-actions">
        <!-- 只有选择Mock时才显示编辑按钮，监控状态时不能编辑 -->
        <el-button 
            v-if="!isEditing && isMockSelected && activeTab === 'response'"
          type="primary" 
          size="small" 
          @click="startEditing"
        >
          编辑
        </el-button>
          <template v-else-if="isEditing && isMockSelected && activeTab === 'response'">
          <el-button type="success" size="small" @click="saveJsonEdit">保存</el-button>
          <el-button size="small" @click="cancelJsonEdit">取消</el-button>
        </template>
      </div>
      </div>
    </div>

    <!-- 新增: Tabs 区域 -->
    <div class="json-tabs">
      <el-tabs v-model="activeTab" type="card" class="json-tabs-bar">
        <el-tab-pane label="Payload" name="payload" />
        <el-tab-pane label="Header" name="header" />
        <el-tab-pane label="Response" name="response" />
      </el-tabs>
    </div>

    <div class="json-content">
      <div ref="editorRef" class="monaco-editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { messageToContent } from '@/utils';
import * as monaco from 'monaco-editor';

// 定义属性
const props = defineProps<{
  content: string;
  isSelected: boolean;
  isMockSelected: boolean;
  payload?: any;
  headers?: any;
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
const activeTab = ref<'payload' | 'header' | 'response'>('response');

// 计算属性
const hasContent = computed(() => {
  return props.isSelected || props.isMockSelected;
});

const payloadContent = computed(() => {
  const data: any = props.payload;
  if (!data) return '';
  try {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
});

const headerContent = computed(() => {
  const data: any = props.headers;
  if (!data) return '';
  try {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
});

// 当前输入框展示内容
const currentText = computed({
  get() {
    if (activeTab.value === 'payload') return payloadContent.value;
    if (activeTab.value === 'header') return headerContent.value;
    return jsonContent.value;
  },
  set(val: string) {
    if (activeTab.value === 'response') {
      jsonContent.value = val;
    }
  },
});

// 根据 tab 和编辑状态判断只读
const isReadonly = computed(() => {
  if (activeTab.value === 'response') {
    return !isEditing.value || !props.isMockSelected;
  }
  return true;
});

// =============== Monaco Editor ===============
const editorRef = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const setEditorContent = (val: string) => {
  if (editor) {
    const model = editor.getModel();
    if (model && model.getValue() !== val) {
      model.setValue(val);
    }
  }
};

const updateEditorOptions = () => {
  if (!editor) return;
  editor.updateOptions({ readOnly: isReadonly.value });
  // 语言固定 json
  monaco.editor.setModelLanguage(editor.getModel()!, 'json');
  // 内容
  setEditorContent(currentText.value || '');
};

onMounted(() => {
  editor = monaco.editor.create(editorRef.value as HTMLElement, {
    value: currentText.value || '',
    language: 'json',
    theme: 'vs-dark',
    readOnly: isReadonly.value,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
  });

  editor.onDidChangeModelContent(() => {
    if (activeTab.value === 'response' && !isReadonly.value) {
      jsonContent.value = editor!.getValue();
      emit('update:content', jsonContent.value);
    }
  });
});

onBeforeUnmount(() => {
  editor?.dispose();
});

/* ---------- watch 更新 ---------- */
watch([currentText, isReadonly], () => {
  updateEditorOptions();
});

// 监听属性变化 (保持 currentText 同步)
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

watch([payloadContent, headerContent], () => {
  // 若非 response 页，更新输入框内容
  if (activeTab.value === 'payload' || activeTab.value === 'header') {
    // 触发重新渲染
  }
});

// 方法
const getActiveContent = () => {
  if (activeTab.value === 'payload') return payloadContent.value;
  if (activeTab.value === 'header') return headerContent.value;
  return jsonContent.value;
};

const handleCopyJson = async () => {
  const contentToCopy = getActiveContent();
  if (!contentToCopy) {
    ElMessage.warning('没有内容可复制');
    return;
  }
  messageToContent({
    type: 'copy_json',
    data: contentToCopy
  },(response) => {
    if(response.success){
      ElMessage.success('已复制到剪贴板');
    }else{
      ElMessage.error('复制失败，请手动复制');
    }
  });
};

const handleFormatJson = () => {
  const text = getActiveContent();
  if (!text) {
    ElMessage.warning('没有内容可格式化');
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    if (activeTab.value === 'response') {
      jsonContent.value = formatted;
    emit('update:content', jsonContent.value);
    } else {
      if (activeTab.value === 'payload') {
        // payload只读，直接更新引用值
        // 此处不发 update 事件，因只用于展示
        // 如果需保存可在此 emit
      } else {
        // header likewise
      }
    }
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
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .monaco-editor {
      flex: 1;
      min-height: 200px;
    }
    
    .json-editor-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      
    }
  }

  .json-tabs {
    border-bottom: 1px solid #ebeef5;
    .json-tabs-bar {
      padding: 0 12px;
    }
  }

  // .plain-content 已废弃
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