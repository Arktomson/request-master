<template>
  <div class="popup-container">
    <header class="popup-header">
      <div class="header-left">
        <img src="../assets/icon48.png" alt="Logo" class="logo" />
        <h1>HTTP缓存工具</h1>
      </div>
      <div class="header-right">
        <div class="switch-item">
          <span>监控开关</span>
          <el-switch
            v-model="isMonitorEnabled"
            @change="(enabled: boolean) => {
            chromeLocalStorage.set({ monitorEnabled: enabled })
          }"
          />
        </div>
        <div class="switch-item">
          <span>容灾开关</span>
          <el-switch
            v-model="isDisasterRecoveryProcessing"
            @change="(enabled: boolean) => {
            chromeLocalStorage.set({ disasterRecoveryProcessing: enabled })
          }"
          />
        </div>
      </div>
    </header>

    <main class="popup-content">
      <!-- 添加缓存数据展示部分 -->
      <div
        class="cache-data-section"
        v-if="curCacheData && curCacheData.length > 0"
      >
        <h2>缓存命中数据 ({{ curCacheData.length }})</h2>
        <div class="cache-list">
          <div
            v-for="(item, index) in curCacheData"
            :key="index"
            class="cache-item"
          >
            <div class="cache-header" @click="toggleItem(index)">
              <span
                class="method-badge"
                :class="getMethodClass(item?.method || 'GET')"
              >
                {{ item?.method || 'GET' }}
              </span>
              <el-tooltip :content="item?.url || '未知URL'" placement="top">
                <span class="url-text" :title="item?.url || '未知URL'">
                  {{ item?.url || '未知URL' }}
                </span>
              </el-tooltip>

              <span class="expand-icon">{{
                expandedItems.includes(index) ? '▼' : '▶'
              }}</span>
            </div>
            <div v-if="expandedItems.includes(index)" class="cache-detail">
              <div class="params-section" v-if="item?.params">
                <h3>请求参数</h3>
                <pre>{{ item?.params }}</pre>
              </div>
              <div class="response-section" v-if="item?.response">
                <div class="response-header">
                  <h3>响应数据</h3>
                  <button
                    class="edit-btn"
                    @click.stop="toggleEdit(index)"
                    :class="{ active: editingIndex === index }"
                  >
                    {{ editingIndex === index ? '取消' : '编辑' }}
                  </button>
                </div>

                <!-- 展示模式 -->
                <pre v-if="editingIndex !== index">{{
                  formatJson(item?.response)
                }}</pre>

                <!-- 编辑模式 -->
                <div v-else class="editor-container">
                  <textarea
                    v-model="editingContent"
                    class="json-editor"
                    :class="{ error: jsonError }"
                    @input="validateJsonInput"
                  ></textarea>
                  <div class="editor-footer">
                    <span class="error-message" v-if="jsonError">{{
                      jsonError
                    }}</span>
                    <div class="editor-actions">
                      <button
                        class="format-btn"
                        @click.stop="formatJsonContent()"
                        title="格式化JSON"
                      >
                        格式化
                      </button>
                      <button
                        class="save-btn"
                        @click.stop="saveEdit(index)"
                        :disabled="!!jsonError"
                      >
                        保存修改
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-cache">
        <p>暂无缓存命中数据</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  chromeLocalStorage,
  chromeSessionStorage,
  messageToContent,
} from '@/utils/index';
import { ref, onMounted, nextTick, toRaw, watch } from 'vue';
import { ElMessage, ElSwitch, ElTooltip } from 'element-plus';

const isDisasterRecoveryProcessing = ref(false);
const isMonitorEnabled = ref(false);
const curCacheData = ref<any[]>([]);
const expandedItems = ref<number[]>([]);
const editingIndex = ref<number | null>(null);
const editingContent = ref<string>('');
const jsonError = ref<string | null>(null);

// 切换展开状态
const toggleItem = (index: number) => {
  // 如果正在编辑，不允许折叠
  if (editingIndex.value === index) return;

  const position = expandedItems.value.indexOf(index);
  if (position > -1) {
    expandedItems.value.splice(position, 1);
  } else {
    expandedItems.value.push(index);
  }
};

watch(isDisasterRecoveryProcessing, (newVal) => {
  messageToContent(
    {
      type: 'disasterRecoveryProcessing_change',
      data: newVal,
    },
    () => {}
  );
});
watch(isMonitorEnabled, (newVal) => {
  messageToContent(
    {
      type: 'monitorEnabled_change',
      data: newVal,
    },
    () => {}
  );
});

// 格式化JSON数据
const formatJson = (data: any) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data || '');
  }
};

// 切换编辑模式
const toggleEdit = (index: number) => {
  if (editingIndex.value === index) {
    // 取消编辑
    editingIndex.value = null;
    editingContent.value = '';
    jsonError.value = null;
  } else {
    // 开始编辑
    editingIndex.value = index;
    editingContent.value = formatJson(curCacheData.value[index]?.response);
    jsonError.value = null;

    // 确保项目已展开
    if (!expandedItems.value.includes(index)) {
      expandedItems.value.push(index);
    }
  }
};

// 实时验证JSON格式
const validateJsonInput = () => {
  validateJson(editingContent.value);
};

// 验证JSON格式
const validateJson = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    jsonError.value = null;
    return true;
  } catch (e) {
    if (e instanceof Error) {
      // 提取更友好的错误信息
      const errorMessage = e.message;
      const position = errorMessage.match(/position (\d+)/);
      if (position && position[1]) {
        const pos = parseInt(position[1]);
        const lineNumber = jsonString.substring(0, pos).split('\n').length;
        jsonError.value = `第${lineNumber}行附近有JSON语法错误: ${errorMessage}`;
      } else {
        jsonError.value = `JSON格式错误: ${errorMessage}`;
      }
    } else {
      jsonError.value = 'JSON格式无效';
    }
    return false;
  }
};

// 格式化JSON内容
const formatJsonContent = () => {
  try {
    // 尝试解析当前内容
    const jsonObj = JSON.parse(editingContent.value);
    // 重新格式化
    editingContent.value = JSON.stringify(jsonObj, null, 2);
    // 清除错误
    jsonError.value = null;
  } catch (e) {
    // 如果解析失败，尝试修复简单错误
    try {
      // 使用一个简单的修复方法（如引号修复等）
      const fixedJson = editingContent.value
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // 修复键名引号
        .replace(/'/g, '"'); // 将单引号替换为双引号

      // 尝试解析修复后的内容
      JSON.parse(fixedJson);

      // 如果成功，更新内容并格式化
      editingContent.value = JSON.stringify(JSON.parse(fixedJson), null, 2);
      jsonError.value = null;
      ElMessage.success('JSON已自动修复格式');
    } catch (fixError) {
      // 如果自动修复失败，提示用户
      ElMessage.error('无法自动修复JSON格式');
    }
  }
};

// 保存编辑
const saveEdit = async (index: number) => {
  if (validateJson(editingContent.value)) {
    try {
      // 更新当前的缓存数据
      const updatedCacheData = [...curCacheData.value];
      updatedCacheData[index] = {
        ...updatedCacheData[index],
        response: JSON.parse(editingContent.value),
      };

      // 更新本地状态
      curCacheData.value = updatedCacheData;

      const val = JSON.parse(editingContent.value);

      // 更新存储中的数据
      await chromeSessionStorage.set({ curCacheData: toRaw(updatedCacheData) });
      messageToContent(
        {
          type: 'update_request_cache_data',
          data: {
            cacheKey: updatedCacheData[index].cacheKey,
            cacheResponse: val,
            cacheReqParams: updatedCacheData[index].params,
          },
        },
        (response: any) => {}
      );

      editingIndex.value = null;
      editingContent.value = '';

      ElMessage.success('JSON数据已更新');
    } catch (error) {
      ElMessage.error('保存失败，请重试');
      console.error('保存编辑失败:', error);
    }
  }
};

// 根据请求方法获取样式
const getMethodClass = (method: string) => {
  const methodLower = (method || '').toLowerCase();
  if (methodLower === 'get') return 'method-get';
  if (methodLower === 'post') return 'method-post';
  if (methodLower === 'put') return 'method-put';
  if (methodLower === 'delete') return 'method-delete';
  return 'method-other';
};

onMounted(async () => {
  // 获取当前激活状态
  const { disasterRecoveryProcessing, monitorEnabled } =
    await chromeLocalStorage.getAll();
  isDisasterRecoveryProcessing.value = disasterRecoveryProcessing;
  isMonitorEnabled.value = monitorEnabled;

  // 获取缓存数据
  const data = await chromeSessionStorage.get('curCacheData');
  if (data) curCacheData.value = Array.isArray(data) ? data : [data];

  // 监听缓存数据变化
  chromeSessionStorage.onChange((changes: any) => {
    if (changes.curCacheData && changes.curCacheData.newValue) {
      curCacheData.value = changes.curCacheData.newValue;
    }
  }, 'curCacheData');
});
</script>

<style scoped lang="scss">
.popup-container {
  width: 400px;
  min-height: 300px;
  background-color: #f9fafb;
  color: #1f2937;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 12px;
  display: flex;
  flex-direction: column;

  .popup {
    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .header-right {
        display: flex;
        gap: 16px;
      }

      .switch-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
      }

      h1 {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }
    }

    &-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  }

  .logo {
    width: 32px;
    height: 32px;
    margin-right: 12px;
  }

  .status {
    &-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #ffffff;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      p {
        margin: 0;
      }
    }

    &-badge {
      font-weight: 600;
      color: #ef4444;

      &.active {
        color: #10b981;
      }
    }
  }

  .toggle-btn {
    background-color: #ef4444;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &.active {
      background-color: #10b981;
    }

    &:hover {
      filter: brightness(1.1);
    }
  }

  .cache {
    &-data-section {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 12px;
      margin-top: 8px;

      h2 {
        font-size: 16px;
        margin: 0 0 12px 0;
        color: #374151;
      }
    }

    &-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }

    &-item {
      border-bottom: 1px solid #e5e7eb;

      &:last-child {
        border-bottom: none;
      }
    }

    &-header {
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      background-color: #f9fafb;

      &:hover {
        background-color: #f3f4f6;
      }
    }

    &-detail {
      padding: 12px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;

      h3 {
        font-size: 14px;
        margin: 0 0 8px 0;
        color: #4b5563;
      }
    }
  }

  .method {
    &-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
      text-transform: uppercase;
    }

    &-get {
      background-color: #3b82f6;
      color: white;
    }

    &-post {
      background-color: #10b981;
      color: white;
    }

    &-put {
      background-color: #f59e0b;
      color: white;
    }

    &-delete {
      background-color: #ef4444;
      color: white;
    }

    &-other {
      background-color: #8b5cf6;
      color: white;
    }
  }

  .url-text {
    flex: 1;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 280px;
    display: inline-block;
    vertical-align: middle;
  }

  .expand-icon {
    margin-left: 8px;
    color: #6b7280;
  }

  .params-section,
  .response-section {
    margin-bottom: 12px;

    pre {
      background-color: #f3f4f6;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }
  }

  .stats {
    &-section {
      background-color: #ffffff;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      h2 {
        font-size: 16px;
        margin: 0 0 12px 0;
        color: #374151;
      }
    }

    &-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      text-align: center;
    }
  }

  .response {
    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
  }

  .edit-btn {
    background-color: #4b5563;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #374151;
    }

    &.active {
      background-color: #ef4444;
    }
  }

  .editor-container {
    display: flex;
    flex-direction: column;
  }

  .json-editor {
    width: 95%;
    min-height: 200px;
    font-family: monospace;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    resize: vertical;

    &.error {
      border-color: #ef4444;
      background-color: #fee2e2;
    }
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
  }

  .error-message {
    color: #ef4444;
    font-size: 12px;
    flex: 1;
  }

  .editor-actions {
    display: flex;
    gap: 8px;
  }

  .format-btn {
    background-color: #6366f1;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #4f46e5;
    }
  }

  .save-btn {
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover:not(:disabled) {
      background-color: #059669;
    }

    &:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
  }
}
</style>
