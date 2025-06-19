<template>
  <div class="json-viewer-area" ref="jsonViewerAreaRef">
    <div class="viewer-header">
      <span style="font-size: 16px;">数据面板</span>
    </div>

    <!-- 面板控制区域 -->
    <div class="panel-controls">
      <el-checkbox v-model="showQueryPanel" label="显示Query参数" />
      <el-checkbox v-model="showHeaderPanel" label="显示Headers" />
    </div>

    <!-- Query参数面板 -->
    <div v-show="showQueryPanel && hasContent" class="info-panel">
      <div class="panel-header">
        <el-icon>
          <List />
        </el-icon>
        <span>Query参数</span>
        <div class="panel-actions">
          <el-button size="small" @click="handleCopyQuery">复制</el-button>
        </div>
      </div>
      <div class="panel-content">
        <div class="editor-container">
          <div ref="queryEditorRef" class="mini-editor" :style="{ height: queryEditorHeight + 'px' }" />
        </div>
      </div>
    </div>

    <!-- Headers面板 -->
    <div v-show="showHeaderPanel && hasContent" class="info-panel">
      <div class="panel-header">
        <el-icon>
          <Document />
        </el-icon>
        <span>响应Headers</span>
        <div class="panel-actions">
          <el-button size="small" @click="handleCopyHeaders">复制</el-button>
        </div>
      </div>
      <div class="panel-content">
        <div class="editor-container">
          <div ref="headersEditorRef" class="mini-editor" :style="{ height: headersEditorHeight + 'px' }" />
        </div>
      </div>
    </div>

    <!-- 响应体内容 -->
    <div class="json-content">
      <div class="response-header">
        <el-icon>
          <DocumentCopy />
        </el-icon>
        <span>响应体 (Response)</span>
        <div class="response-actions">
          <el-button size="small" type="primary" @click="handleCopyJson">复制</el-button>
          <el-button size="small" @click="handleFormatJson" v-if="isMockSelected">格式化</el-button>
        </div>
      </div>
      <div ref="editorRef" class="monaco-editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { ElMessage, ElButton, ElCheckbox, ElIcon } from 'element-plus';
import { List, Document, DocumentCopy } from '@element-plus/icons-vue';
import { messageToContent } from '@/utils';
import * as monaco from 'monaco-editor';
import '@/utils/monacoWorker';

// 定义属性
const props = defineProps<{
  data: any;  // 当前选中的数据项(request或mock)
  type: 'request' | 'mock' | null;  // 数据类型
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'save-response', value: string): void;
  (e: 'save-query', value: string): void;
  (e: 'save-headers', value: string): void;
}>();

// 状态
const jsonContent = ref('');
const jsonViewerAreaRef = ref<HTMLElement | null>(null);
const showQueryPanel = ref(true);
const showHeaderPanel = ref(true);

// 计算属性
const hasContent = computed(() => {
  return props.data !== null && props.type !== null;
});

const isMockSelected = computed(() => {
  return props.type === 'mock';
});

// 根据类型判断是否只读：mock可编辑，request只读
const isReadonly = computed(() => {
  return props.type !== 'mock';
});

// 从data中获取响应内容
const responseContent = computed(() => {
  if (!props.data) return '';
  const response = props.data.response;
  if (!response) return '';

  try {
    if (typeof response === 'object') {
      return JSON.stringify(response, null, 2);
    }
    return response;
  } catch (error) {
    return typeof response === 'string' ? response : JSON.stringify(response, null, 2);
  }
});

// 获取query参数内容（转换为对象格式）
const queryContent = computed(() => {
  const data = props.data;
  if (!data) return '{}';

  // 优先使用query字段（已被urlApart处理过）
  if (data.query) {
    // 如果是URL search格式，转换为对象
    if (data.query.startsWith('?')) {
      const searchParams = new URLSearchParams(data.query);
      const obj: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        obj[key] = value;
      });
      return JSON.stringify(obj, null, 2);
    }
    return data.query;
  }

  // 兼容旧的params字段
  if (data.params) {
    try {
      return typeof data.params === 'string' ? data.params : JSON.stringify(data.params, null, 2);
    } catch (e) {
      return String(data.params);
    }
  }

  return '{}';
});

// 获取headers内容（确保为JSON格式）
const headerContent = computed(() => {
  const data = props.data;
  if (!data || !data.headers) return '{}';

  try {
    return typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers, null, 2);
  } catch (e) {
    return String(data.headers);
  }
});

// 计算编辑器高度
const getEditorHeight = (content: string) => {
  const lines = content.split('\n').length;
  const minHeight = 60; // 最小高度
  const maxHeight = 150; // 最大高度
  const lineHeight = 18; // 每行高度
  const calculatedHeight = Math.min(Math.max(lines * lineHeight + 20, minHeight), maxHeight);
  return calculatedHeight;
};

const queryEditorHeight = computed(() => getEditorHeight(queryContent.value));
const headersEditorHeight = computed(() => getEditorHeight(headerContent.value));

// =============== Monaco Editor ===============
const editorRef = ref<HTMLElement | null>(null);
const queryEditorRef = ref<HTMLElement | null>(null);
const headersEditorRef = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let queryEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let headersEditor: monaco.editor.IStandaloneCodeEditor | null = null;

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
  setEditorContent(jsonContent.value || '');
};

// 创建编辑器的函数
const createEditors = async () => {

  // 创建主编辑器（响应体）
  if (editorRef.value && !editor) {
    editor = monaco.editor.create(editorRef.value as HTMLElement, {
      value: jsonContent.value || '',
      language: 'json',
      theme: "vs",
      readOnly: isReadonly.value,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 监听内容变化，实时更新
    editor.onDidChangeModelContent(() => {
      console.log('change', isReadonly.value)
      if (!isReadonly.value) {
        const newValue = editor!.getValue();
        jsonContent.value = newValue;
        
        // 如果是mock类型，自动保存
        if (props.type === 'mock') {
          try {
            JSON.parse(newValue);
            emit('save-response', newValue);
          } catch (error) {
            // JSON格式错误时不保存
          }
        }
      }
    });
  }

  // 创建Query编辑器
  if (queryEditorRef.value && !queryEditor && showQueryPanel.value && hasContent.value) {
    // 设置初始高度
    queryEditorRef.value.style.height = queryEditorHeight.value + 'px';

    queryEditor = monaco.editor.create(queryEditorRef.value, {
      value: queryContent.value || '{}',
      language: 'json',
      theme: 'vs',
      readOnly: props.type !== 'mock', // 根据类型设置只读状态
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 监听内容变化，自动保存（仅mock类型）
    queryEditor.onDidChangeModelContent(() => {
      if (props.type === 'mock') {
        const newValue = queryEditor!.getValue();
        try {
          JSON.parse(newValue);
          emit('save-query', newValue);
        } catch (error) {
          // JSON格式错误时不保存
        }
      }
    });
  }

  // 创建Headers编辑器
  if (headersEditorRef.value && !headersEditor && showHeaderPanel.value && hasContent.value) {
    // 设置初始高度
    headersEditorRef.value.style.height = headersEditorHeight.value + 'px';

    headersEditor = monaco.editor.create(headersEditorRef.value, {
      value: headerContent.value || '{}',
      language: 'json',
      theme: 'vs',
      readOnly: props.type !== 'mock', // 根据类型设置只读状态
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 监听内容变化，自动保存（仅mock类型）
    headersEditor.onDidChangeModelContent(() => {
      if (props.type === 'mock') {
        const newValue = headersEditor!.getValue();
        try {
          JSON.parse(newValue);
          emit('save-headers', newValue);
        } catch (error) {
          // JSON格式错误时不保存
        }
      }
    });
  }
};

onMounted(() => {
  createEditors();
  window.addEventListener('pagehide', () => {
    editor?.dispose();
    queryEditor?.dispose();
    headersEditor?.dispose();
  });
});
/* ---------- watch 更新 ---------- */
watch([jsonContent, isReadonly], () => {
  updateEditorOptions();
});

// 监听响应内容变化
watch(responseContent, (newValue) => {
  jsonContent.value = newValue;
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue);
  }
});

// 监听queryContent变化，同步到编辑器
watch(queryContent, (newValue) => {
  if (queryEditor && queryEditor.getValue() !== newValue) {
    queryEditor.setValue(newValue);
  }
});

// 监听headerContent变化，同步到编辑器
watch(headerContent, (newValue) => {
  if (headersEditor && headersEditor.getValue() !== newValue) {
    headersEditor.setValue(newValue);
  }
});

// 监听编辑器高度变化，触发布局更新
watch([queryEditorHeight, headersEditorHeight], () => {
  nextTick(() => {
    queryEditor?.layout();
    headersEditor?.layout();
  });
});

// 监听选择状态变化，更新编辑器只读状态
watch(() => props.type, (newType) => {
  // 更新编辑器只读状态
  if (queryEditor) {
    queryEditor.updateOptions({ readOnly: props.type !== 'mock' });
  }
  if (headersEditor) {
    headersEditor.updateOptions({ readOnly: props.type !== 'mock' });
  }
});

watch([hasContent, showQueryPanel, showHeaderPanel], () => {
  createEditors();
});

// 方法
const handleCopyJson = async () => {
  const contentToCopy = jsonContent.value;
  if (!contentToCopy) {
    ElMessage.warning('没有内容可复制');
    return;
  }
  messageToContent({
    type: 'copy_json',
    data: contentToCopy
  }, (response) => {
    if (response.success) {
      ElMessage.success('响应体已复制到剪贴板');
    } else {
      ElMessage.error('复制失败，请手动复制');
    }
  });
};

const handleCopyQuery = async () => {
  const contentToCopy = queryContent.value;
  if (!contentToCopy) {
    ElMessage.warning('没有Query参数可复制');
    return;
  }
  messageToContent({
    type: 'copy_json',
    data: contentToCopy
  }, (response) => {
    if (response.success) {
      ElMessage.success('Query参数已复制到剪贴板');
    } else {
      ElMessage.error('复制失败，请手动复制');
    }
  });
};

const handleCopyHeaders = async () => {
  const contentToCopy = headerContent.value;
  if (!contentToCopy) {
    ElMessage.warning('没有Headers可复制');
    return;
  }
  messageToContent({
    type: 'copy_json',
    data: contentToCopy
  }, (response) => {
    if (response.success) {
      ElMessage.success('Headers已复制到剪贴板');
    } else {
      ElMessage.error('复制失败，请手动复制');
    }
  });
};

const handleFormatJson = () => {
  const text = jsonContent.value;
  if (!text) {
    ElMessage.warning('没有内容可格式化');
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    jsonContent.value = formatted;
    if (editor) {
      editor.setValue(formatted);
    }
    ElMessage.success('格式化成功');
  } catch (error) {
    ElMessage.error('JSON格式无效，无法格式化');
  }
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
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #ebeef5;
    font-weight: bold;
  }

  .panel-controls {
    display: flex;
    gap: 16px;
    padding: 8px 12px;
    background-color: #f5f7fa;
    border-bottom: 1px solid #ebeef5;

    :deep(.el-checkbox) {
      margin-right: 0;
    }
  }

  .info-panel {
    border-bottom: 1px solid #ebeef5;

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #fafbfc;
      border-bottom: 1px solid #ebeef5;
      font-size: 14px;
      font-weight: 600;
      color: #606266;

      .el-icon {
        color: #409eff;
      }

      span {
        flex: 1;
      }

      .panel-actions {
        display: flex;
        gap: 8px;
      }
    }

    .panel-content {
      .editor-container {
        padding: 0;

        .mini-editor {
          border: 1px solid #e4e7ed;
          transition: height 0.2s ease;
        }
      }
    }
  }

  .json-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .response-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #fafbfc;
      border-bottom: 1px solid #ebeef5;
      font-size: 14px;
      font-weight: 600;
      color: #606266;

      .el-icon {
        color: #67c23a;
      }

      span {
        flex: 1;
      }

      .response-actions {
        display: flex;
        gap: 8px;
      }
    }

    .monaco-editor {
      flex: 1;
      min-height: 200px;
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