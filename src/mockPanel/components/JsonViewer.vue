<template>
  <div class="json-viewer-area" ref="jsonViewerAreaRef">
    <div class="viewer-header">
      <span style="font-size: 16px;">数据面板</span>
    </div>

    <!-- 面板控制区域 -->
    <div class="panel-controls">
      <el-checkbox v-model="showQueryPanel" label="显示Query参数" />
      <el-checkbox v-model="showHeaderPanel" label="显示Headers" />
      <el-checkbox v-model="showBodyPanel" label="显示Body参数" />
      <el-checkbox v-model="isPathMatch" label="仅path匹配" />
      <el-checkbox v-model="mockResponse" label="mock响应" />
      <el-checkbox v-model="mockRequestBody" label="mock请求体"/>
    </div>

    <!-- Query参数面板 -->
    <div v-show="showQueryPanel && queryContent" class="info-panel">
      <div class="panel-header">
        <el-icon>
          <List />
        </el-icon>
        <span>Query参数</span>
        <div class="panel-actions">
          <el-button size="small" @click="handleCopyQuery">复制</el-button>
        </div>
      </div>
      <div ref="queryEditorRef" class="monaco-editor" />
    </div>

    <!-- Headers面板 -->
    <div v-show="showHeaderPanel && headerContent" class="info-panel">
      <div class="panel-header">
        <el-icon>
          <Document />
        </el-icon>
        <span>请求Headers</span>
        <div class="panel-actions">
          <el-button size="small" @click="handleCopyHeaders">复制</el-button>
        </div>
      </div>
      <div ref="headersEditorRef" class="monaco-editor" />
    </div>

    <!-- Body参数面板 -->
    <div v-show="showBodyPanel && bodyContent" class="info-panel">
      <div class="panel-header">
        <el-icon>
          <Document />
        </el-icon>
        <span>请求体 (Body)</span>
        <div class="panel-actions">
          <el-button size="small" @click="handleCopyBody">复制</el-button>
        </div>
      </div>
      <div ref="bodyEditorRef" class="monaco-editor" />
    </div>

    <!-- 响应体内容 -->
    <div class="resp-content">
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
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElButton, ElCheckbox, ElIcon } from 'element-plus';
import { List, Document, DocumentCopy } from '@element-plus/icons-vue';
import { chromeLocalStorage, messageToContent } from '@/utils';
import * as monaco from 'monaco-editor';
import { debounce } from 'lodash-es';

// 定义属性
const props = defineProps<{
  data: any;  // 当前选中的数据项(request或mock)
  type: 'request' | 'mock' | null;  // 数据类型
}>();

// 状态
const showQueryPanel = ref(true);
const showHeaderPanel = ref(true);
const showBodyPanel = ref(true);
const isPathMatch = ref(false);
const mockResponse = ref(true);
const mockRequestBody = ref(false);
// 面板区域ref
const jsonViewerAreaRef = ref<HTMLElement | null>(null);


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
  const d = props.data;
  if (!d?.query) return '';

  const q = d.query;
  // ?a=1&b=2 形式
  if (q.startsWith('?')) {
    console.log('queryContent', q)
    const searchParams = new URLSearchParams(q);
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => (obj[key] = value));
    return JSON.stringify(obj, null, 2);
  }
  return ''
});

// 获取headers内容（确保为JSON格式）
const headerContent = computed(() => {
  const data = props.data;
  if (!data || !data.headers) return '';

  try {
    return typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers, null, 2);
  } catch (e) {
    return String(data.headers);
  }
});

// 获取body参数内容（确保为JSON格式）
const bodyContent = computed(() => {
  const d = props.data;
  if (!d || !d.params) return '';
  try {
    if (typeof d.params === 'string') {
      try {
        return JSON.stringify(JSON.parse(d.params), null, 2);
      } catch (_) {
        return d.params;
      }
    }
    return JSON.stringify(d.params, null, 2);
  } catch (_) {
    return String(d.params);
  }
});


// =============== Monaco Editor ===============
const editorRef = ref<HTMLElement | null>(null);
const queryEditorRef = ref<HTMLElement | null>(null);
const headersEditorRef = ref<HTMLElement | null>(null);
const bodyEditorRef = ref<HTMLElement | null>(null);

let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let queryEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let headersEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let bodyEditor: monaco.editor.IStandaloneCodeEditor | null = null;



// 创建编辑器的函数
const createEditors = async () => {
  // 创建主编辑器（响应体）
  if (!editor) {
    editor = monaco.editor.create(editorRef.value as HTMLElement, {
      value: responseContent.value || '',
      language: 'json',
      theme: "vs",
      readOnly: isReadonly.value,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,

    });
    // 监听内容变化，使用节流函数减少高频触发
    const handleRespChange = debounce(() => {
      if (!isReadonly.value) {
        const newValue = editor!.getValue();
        try {
          const parseContent = JSON.parse(newValue);
          emit('save-response', parseContent);
        } catch (error) {
        }
      }
    }, 1000); // 1500ms 防抖间隔，可根据需要调整

    // 仅在用户实际修改（非 setValue 触发的 isFlush 事件）时才调用
    editor.onDidChangeModelContent((e) => {
      if (e.isFlush) return; // 忽略初始化/编程式更新
      handleRespChange();
    });
  }



  // 创建Query编辑器
  if (!queryEditor && showQueryPanel.value && queryContent.value) {
    console.log('queryContent', queryContent.value)

    queryEditor = monaco.editor.create(queryEditorRef.value as HTMLElement, {
      value: queryContent.value,
      language: 'json',
      theme: 'vs',
      readOnly: isReadonly.value, // 根据类型设置只读状态
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 监听内容变化，自动保存（仅mock类型）
    queryEditor.onDidChangeModelContent((e) => {
      if (e.isFlush) return;
      if (!isReadonly.value) {
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
  if (!headersEditor && showHeaderPanel.value && headerContent.value) {

    headersEditor = monaco.editor.create(headersEditorRef.value as HTMLElement, {
      value: headerContent.value,
      language: 'json',
      theme: 'vs',
      readOnly: isReadonly.value, // 根据类型设置只读状态
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 监听内容变化，自动保存（仅mock类型）
    headersEditor.onDidChangeModelContent((e) => {
      if (e.isFlush) return;
      if (!isReadonly.value) {
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

  // 创建Body编辑器
  if (!bodyEditor && showBodyPanel.value && bodyContent.value) {

    bodyEditor = monaco.editor.create(bodyEditorRef.value as HTMLElement, {
      value: bodyContent.value,
      language: 'json',
      theme: 'vs',
      readOnly: isReadonly.value, // 根据类型设置只读状态
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 监听内容变化，自动保存（仅mock类型）
    bodyEditor.onDidChangeModelContent((e) => {
      if (e.isFlush) return;
      if (!isReadonly.value) {
        const newValue = bodyEditor!.getValue();
        try {
          JSON.parse(newValue);
          emit('save-body', newValue);
        } catch (error) {
          // JSON格式错误时不保存
        }
      }
    });
  }
};

const onPageHide = () => {
  console.log('onPageHide1');
  editor?.dispose();
  queryEditor?.dispose();
  headersEditor?.dispose();
  bodyEditor?.dispose();

  chromeLocalStorage.set({
    queryPanelVisible: showQueryPanel.value,
    headersPanelVisible: showHeaderPanel.value,
    bodyPanelVisible: showBodyPanel.value,
    isPathMatch: isPathMatch.value,
    mockResponse: mockResponse.value,
    mockRequestBody: mockRequestBody.value,
  });
  console.log('执行')
};
onMounted(async () => {
  const { queryPanelVisible, headersPanelVisible, bodyPanelVisible, isPathMatch: isPathMatchInit, mockResponse: mockResponseInit, mockRequestBody: mockRequestBodyInit } = await chromeLocalStorage.get(['queryPanelVisible', 'headersPanelVisible', 'bodyPanelVisible', 'isPathMatch', 'mockResponse', 'mockRequestBody']);

  showQueryPanel.value = queryPanelVisible ?? false;
  showHeaderPanel.value = headersPanelVisible ?? false;
  showBodyPanel.value = bodyPanelVisible ?? false;
  isPathMatch.value = isPathMatchInit ?? false;
  mockResponse.value = mockResponseInit ?? false;
  mockRequestBody.value = mockRequestBodyInit ?? false;
  createEditors();
  window.addEventListener('pagehide', onPageHide);
});
/* ---------- watch 更新 ---------- */
watch(isReadonly, (newVal) => {
  editor?.updateOptions({ readOnly: newVal });
  queryEditor?.updateOptions({ readOnly: newVal });
  headersEditor?.updateOptions({ readOnly: newVal });
  bodyEditor?.updateOptions({ readOnly: newVal });
});

// 监听响应内容变化
watch(responseContent, (newValue) => {
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

// 监听bodyContent变化，同步到编辑器
watch(bodyContent, (newValue) => {
  if (bodyEditor && bodyEditor.getValue() !== newValue) {
    bodyEditor.setValue(newValue);
  }
});


watch([showQueryPanel, showHeaderPanel, showBodyPanel, queryContent, headerContent, bodyContent], () => {
  createEditors();
});

// 方法
const handleCopyJson = async () => {
  const contentToCopy = responseContent.value;
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

const handleCopyBody = async () => {
  const contentToCopy = bodyContent.value;
  if (!contentToCopy) {
    ElMessage.warning('没有Body参数可复制');
    return;
  }
  messageToContent({
    type: 'copy_json',
    data: contentToCopy
  }, (response) => {
    if (response.success) {
      ElMessage.success('Body参数已复制到剪贴板');
    } else {
      ElMessage.error('复制失败，请手动复制');
    }
  });
};

const handleFormatJson = () => {
  const text = responseContent.value;
  if (!text) {
    ElMessage.warning('没有内容可格式化');
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
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

const emit = defineEmits<{
  (e: 'save-response', value: string): void;
  (e: 'save-query', value: string): void;
  (e: 'save-headers', value: string): void;
  (e: 'save-body', value: string): void;
}>();
</script>

<style scoped lang="scss">
.json-viewer-area {
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
    flex-wrap: wrap;
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
    flex: 0.4;
    display: flex;
    flex-direction: column;

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

    .monaco-editor {
      flex: 1;
    }
  }

  .resp-content {
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