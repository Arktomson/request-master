<template>
  <div class="sidebar-container">
    <!-- 顶部标题区 -->
    <Header />

    <!-- 主体布局 -->
    <div class="main-layout">
      <!-- 左侧标签栏 -->

      <!-- 中间主要内容区 -->
      <div
        class="content-area"
        :class="{ 'bottom-layout': sidebarPosition === 'bottom' }"
      >
        <!-- 请求监测区域 -->
        <MonitorSection
          ref="monitorSectionRef"
          :requestList="requestList"
          :selectedRequestIndex="selectedRequestIndex"
          @select-request="selectRequest"
          @clear-requestList="handleClearRequests"
          @delete-request="deleteRequest"
          @add-to-mock="addRequestToMock"
          class="monitor-section"
        />

        <!-- 可拖拽分隔线(垂直方向) -->
        <ResizeHandle
          :direction="sidebarPosition === 'bottom' ? 'vertical' : 'horizontal'"
          @resize="handleHorizontalResize"
          class="resize-handle"
        />

        <!-- Mock列表区域 -->
        <MockSection
          ref="mockSectionRef"
          :mockList="mockList"
          :selectedMockIndex="selectedMockIndex"
          @select-mock="selectMock"
          @edit-mock="editMock"
          @delete-mock="deleteMock"
          @clear-all-mocks="handleClearAllMocks"
          @toggle-mock-item="handleToggleMockItem"
          @batch-toggle-mocks="handleBatchToggleMocks"
          class="mock-section"
        />
      </div>

      <!-- 可拖拽分隔线 -->
      <ResizeHandle @resize="handleVerticalResize" />

      <!-- 右侧JSON查看器 -->
      <JsonViewer
        ref="jsonViewerRef"
        :data="currentSelectedData"
        :type="currentSelectedType"
        @save-response="handleSaveResponse"
        @save-query="handleSaveQuery"
        @save-headers="handleSaveHeaders"
        @save-body="handleSaveBody"
      />
    </div>

    <!-- Mock弹窗 -->
    <MockDialog
      v-model="mockDialogVisible"
      :isEditMode="isEditMode"
      :currentMock="currentMock"
      @save="saveMock"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, toRaw, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  chromeLocalStorage,
  urlApart,
  messageToContent,
  generateCacheKey,
} from '@/utils';
// 导入组件
import Header from './components/Header.vue';
import MonitorSection from './components/MonitorSection.vue';
import MockSection from './components/MockSection.vue';
import JsonViewer from './components/JsonViewer.vue';
import MockDialog from './components/MockDialog.vue';
import ResizeHandle from './components/ResizeHandle.vue';
import { omit } from 'lodash-es';

// 状态
const mockList = ref<any[]>([]);
const requestList = ref<any[]>([]);
const selectedRequestIndex = ref(-1);
const selectedMockIndex = ref(-1);
const mockDialogVisible = ref(false);
const isEditMode = ref(false);
const editingIndex = ref(-1);
const sidebarPosition = ref<'right' | 'bottom'>('right');
const currentMock = ref({
  url: '',
  method: 'GET',
  enabled: true,
  response: '{}',
});

// DOM引用
const monitorSectionRef = ref();
const mockSectionRef = ref();
const jsonViewerRef = ref();

// 计算属性
const selectedRequest = computed(() => {
  const selIdx = selectedRequestIndex.value;
  return selIdx < 0 ? null : requestList.value[selIdx];
});

const selectedMock = computed(() => {
  const selIdx = selectedMockIndex.value;
  return selIdx < 0 ? null : mockList.value[selIdx];
});

// 当前选中的数据和类型
const currentSelectedData = computed(() => {
  if (selectedMock.value) {
    return selectedMock.value;
  }
  if (selectedRequest.value) {
    return selectedRequest.value;
  }
  return null;
});

const currentSelectedType = computed(() => {
  if (selectedMock.value) {
    return 'mock';
  }
  if (selectedRequest.value) {
    return 'request';
  }
  return null;
});

// 方法
const selectRequest = (index: number) => {
  selectedRequestIndex.value = index;
  selectedMockIndex.value = -1;
};

const selectMock = (index: number) => {
  selectedMockIndex.value = index;
  selectedRequestIndex.value = -1;
};

const editMock = (index: number) => {
  isEditMode.value = true;
  editingIndex.value = index;
  currentMock.value = { ...mockList.value[index] };

  // 格式化JSON响应数据
  if (currentMock.value.response) {
    try {
      // 如果response已经是对象，直接格式化
      if (typeof currentMock.value.response === 'object') {
        currentMock.value.response = JSON.stringify(
          currentMock.value.response,
          null,
          2
        );
      } else {
        // 如果是字符串，先解析再格式化
        const parsedResponse = JSON.parse(currentMock.value.response);
        currentMock.value.response = JSON.stringify(parsedResponse, null, 2);
      }
    } catch (e) {
      // 如果解析失败，保持原样（可能是非JSON字符串）
      // currentMock.value.response 保持不变
    }
  } else {
    // 如果没有response数据，设置默认值
    currentMock.value.response = '{}';
  }

  mockDialogVisible.value = true;
};

const saveMock = (mockData: any) => {
  // 确保mockList是数组
  if (!Array.isArray(mockList.value)) {
    mockList.value = [];
  }

  if (isEditMode.value) {
    // 编辑模式 - 检查索引是否有效
    if (editingIndex.value >= 0 && editingIndex.value < mockList.value.length) {
      mockList.value[editingIndex.value] = { ...mockData };
      // 如果当前选中的是被编辑的mock，更新显示
      if (selectedMockIndex.value === editingIndex.value) {
        selectMock(editingIndex.value);
      }
    } else {
      ElMessage.error('无效的编辑索引');
      return;
    }
  } else {
    // 添加模式
    mockList.value.push({ ...mockData });
  }

  // 保存到存储
  ElMessage.success(isEditMode.value ? 'Mock已更新' : 'Mock已添加');
};

const handleToggleMockItem = (index: number, enabled: boolean) => {
  if (index >= 0 && index < mockList.value.length) {
    mockList.value[index].enabled = enabled;
    chromeLocalStorage.set({ mockList: toRaw(mockList.value) });

    // 同步到ajaxHook
    messageToContent({
      type: 'mockList_change',
      data: toRaw(mockList.value),
    });
  }
};

// 批量切换Mock项状态
const handleBatchToggleMocks = (enabled: boolean) => {
  mockList.value.forEach((item) => {
    item.enabled = enabled;
  });

  chromeLocalStorage.set({ mockList: toRaw(mockList.value) });

  // 同步到ajaxHook
  messageToContent({
    type: 'mockList_change',
    data: toRaw(mockList.value),
  });
};

const addRequestToMock = async (index: number) => {
  const request = requestList.value[index];
  // 检查是否已存在相同URL和方法的Mock
  const existingMock = mockList.value.find(
    (mock) => mock.cacheKey === request.cacheKey
  );

  if (existingMock) {
    ElMessage.warning('该请求已存在Mock规则');
    return;
  }

  const { response } = request;
  // 创建新的Mock配置
  const newMock = {
    ...omit(request, ['isMock']),
    response: toRaw(response),
    enabled: true, // 默认启用新添加的Mock
  };

  // 添加到Mock列表
  mockList.value.push(newMock);
  ElMessage.success('已添加到Mock列表');
};

const deleteMock = async (index: number) => {
  selectedMockIndex.value = -1;
  mockList.value.splice(index, 1);
  ElMessage.success('删除成功');
};

const handleClearAllMocks = async () => {
  ElMessageBox.confirm('确定要清除所有Mock数据吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      selectedMockIndex.value = -1;
      mockList.value = [];
      ElMessage.success('已清除所有Mock数据');
    })
    .catch(() => {
      // 用户取消操作，不做任何处理
    });
};

const handleClearRequests = () => {
  requestList.value = [];
  selectedRequestIndex.value = -1;
  ElMessage.success('记录已清空!');
};

const deleteRequest = (index: number) => {
  // 如果删除的是当前选中的
  if (selectedRequestIndex.value === index) {
    selectedRequestIndex.value = -1;
  }
  requestList.value.splice(index, 1);
  ElMessage.success('请求已删除');
};

// 处理响应体保存
const handleSaveResponse = async (parseContent: any) => {
  // 只处理Mock的响应保存
  const mockIndex = selectedMockIndex.value;
  if (mockIndex >= 0 && mockIndex < mockList.value.length) {
    mockList.value[mockIndex].response = parseContent;
    chromeLocalStorage.set({ mockList: toRaw(mockList.value) });
    ElMessage.success('修改已保存!');
  }
};

// 处理Query参数保存
const handleSaveQuery = async (_content: string) => {
  // 功能暂未实现
};

// 处理Headers保存
const handleSaveHeaders = async (_content: string) => {
  // 功能暂未实现
};

const handleSaveBody = async (body: string) => {
  const mockItem = selectedMock.value;
  if (mockItem) {
    try {
      const parsedBody = JSON.parse(body);
      mockItem.params = parsedBody;
      mockItem.cacheKey = generateCacheKey(
        mockItem.url,
        parsedBody,
        mockItem.method
      );
      chromeLocalStorage.set({ mockList: toRaw(mockList.value) });
      ElMessage.success('修改已保存!');
    } catch (error) {
      ElMessage.error('JSON格式错误，请检查参数格式');
    }
  }
};

// 拖拽调整大小处理
const handleVerticalResize = (size: number) => {
  const container = document.querySelector('.main-layout') as HTMLElement;
  if (!container) return;

  const containerWidth = container.getBoundingClientRect().width;
  const contentArea = document.querySelector('.content-area') as HTMLElement;
  const jsonViewerArea = document.querySelector(
    '.json-viewer-area'
  ) as HTMLElement;

  if (!contentArea || !jsonViewerArea) return;

  // 确保调整后的宽度不超出合理范围
  const minWidth = 300;
  const maxWidth = containerWidth * 0.65; // 最大不超过容器的65%
  const newSize = Math.max(minWidth, Math.min(maxWidth, size));

  // 计算内容区宽度（减去ResizeHandle的4px宽度）
  const contentAreaWidth = containerWidth - newSize - 4;

  // 直接设置宽度，不使用flex
  contentArea.style.width = `${contentAreaWidth}px`;
  contentArea.style.flexShrink = '0';
  jsonViewerArea.style.width = `${newSize}px`;
  jsonViewerArea.style.flexShrink = '0';

  // 记忆化布局设置
  const verticalSplitRatio = newSize / containerWidth;
  chromeLocalStorage.set({
    jsonViewerWidth: newSize,
    verticalSplitRatio: verticalSplitRatio,
  });
};

const handleHorizontalResize = (size: number) => {
  const monitorSection = monitorSectionRef.value?.rootElement;
  const mockSection = mockSectionRef.value?.rootElement;
  const container = monitorSection?.parentElement;

  if (monitorSection && mockSection && container) {
    if (sidebarPosition.value === 'bottom') {
      // 底部布局：水平调整宽度
      const containerWidth = container.getBoundingClientRect().width;
      const minWidth = 300;
      const maxWidth = containerWidth - 250; // 保留足够空间给Mock区域
      const newSize = Math.max(minWidth, Math.min(maxWidth, size));

      const widthPercent = (newSize / containerWidth) * 100;

      monitorSection.style.width = `${widthPercent}%`;
      monitorSection.style.minWidth = `${minWidth}px`;
      monitorSection.style.height = '100%';
      mockSection.style.width = `calc(100% - ${widthPercent}% - 3px)`; // 减去分隔线的宽度
      mockSection.style.minWidth = '250px';
      mockSection.style.height = '100%';

      // 记忆化水平分割比例
      const horizontalSplitRatio = newSize / containerWidth;
      chromeLocalStorage.set({
        monitorSectionWidth: newSize,
        horizontalSplitRatio: horizontalSplitRatio,
      });
    } else {
      // 右侧布局：垂直调整高度
      const containerHeight = container.getBoundingClientRect().height;
      const minHeight = 100;
      const maxHeight = containerHeight - 120; // 保留足够空间给Mock区域
      const newSize = Math.max(minHeight, Math.min(maxHeight, size));

      const heightPercent = (newSize / containerHeight) * 100;

      monitorSection.style.height = `${heightPercent}%`;
      monitorSection.style.minHeight = `${minHeight}px`;
      monitorSection.style.width = '100%';
      mockSection.style.height = `calc(100% - ${heightPercent}% - 3px)`; // 减去分隔线的高度
      mockSection.style.minHeight = '100px';
      mockSection.style.width = '100%';

      // 记忆化垂直分割比例
      const horizontalSplitRatio = newSize / containerHeight;
      chromeLocalStorage.set({
        monitorSectionHeight: newSize,
        horizontalSplitRatio: horizontalSplitRatio,
      });
    }
  }
};

// 初始化布局大小
const initLayout = async () => {
  // 从存储中获取布局设置
  const {
    jsonViewerWidth = 400,
    verticalSplitRatio = 0.4,
    monitorSectionWidth = 400,
    monitorSectionHeight = 300,
    horizontalSplitRatio = 0.6,
  } = await chromeLocalStorage.get([
    'jsonViewerWidth',
    'verticalSplitRatio',
    'monitorSectionWidth',
    'monitorSectionHeight',
    'horizontalSplitRatio',
  ]);

  // 初始化垂直分割比例（左右分割）
  const container = document.querySelector('.main-layout') as HTMLElement;
  if (container) {
    const containerWidth = container.getBoundingClientRect().width;
    // 优先使用保存的宽度，如果不合理则使用比例计算
    let targetJsonViewerWidth = jsonViewerWidth;
    if (jsonViewerWidth < 300 || jsonViewerWidth > containerWidth * 0.65) {
      targetJsonViewerWidth = containerWidth * verticalSplitRatio;
    }
    handleVerticalResize(targetJsonViewerWidth);
  }

  // 初始化水平分割比例（上下分割）
  const contentArea = document.querySelector('.content-area') as HTMLElement;
  if (contentArea) {
    if (sidebarPosition.value === 'bottom') {
      // 底部布局：初始化水平分割（宽度）
      const contentWidth = contentArea.getBoundingClientRect().width;
      let targetMonitorWidth = monitorSectionWidth;
      if (
        monitorSectionWidth < 300 ||
        monitorSectionWidth > contentWidth - 250
      ) {
        targetMonitorWidth = contentWidth * horizontalSplitRatio;
      }
      handleHorizontalResize(targetMonitorWidth);
    } else {
      // 右侧布局：初始化垂直分割（高度）
      const contentHeight = contentArea.getBoundingClientRect().height;
      let targetMonitorHeight = monitorSectionHeight;
      if (
        monitorSectionHeight < 100 ||
        monitorSectionHeight > contentHeight - 120
      ) {
        targetMonitorHeight = contentHeight * horizontalSplitRatio;
      }
      handleHorizontalResize(targetMonitorHeight);
    }
  }
};

const preProcessRequestData = (data: any) => {
  return {
    ...data,
    ...urlApart(data.url),
  };
};

const onPageHide = () => {
  console.log('onPageHide');
  // 移除事件监听器
  window.removeEventListener('resize', async () => {
    await initLayout();
  });
  chromeLocalStorage.set({
    mockList: toRaw(mockList.value),
  });
};

// 设置消息监听
const setupMessageListener = () => {
  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    if (message.type === 'new_request_data') {
      requestList.value.push(preProcessRequestData(message.data));
    } else if (message.type === 'batch_request_data') {
      requestList.value = message.data.map(preProcessRequestData);
    }
    sendResponse({ success: true });
  });

  chromeLocalStorage.onChange(
    async (changes) => {
      if (
        changes.sidebarPosition &&
        changes.sidebarPosition.newValue !== sidebarPosition.value
      ) {
        sidebarPosition.value = changes.sidebarPosition.newValue;
        // 等待DOM更新后初始化布局
        setTimeout(async () => {
          await initLayout();
        }, 100);
      }
    },
    ['sidebarPosition']
  );

  window.addEventListener('pagehide', onPageHide);
};

const notifyMockList = (val: any) => {
  messageToContent({
    type: 'mockList_change',
    data: val,
  });
};

// 监听 mockList 深度变化，保持存储和注入脚本同步
watch(
  mockList,
  (val) => {
    notifyMockList(val);
  },
  { deep: true }
);

// 生命周期钩子
onMounted(async () => {
  // 加载Mock列表
  const {
    mockList: mockListData = [],
    sidebarPosition: sidebarPositionData = 'right',
  } = await chromeLocalStorage.get(['mockList', 'sidebarPosition']);
  mockList.value = mockListData;
  sidebarPosition.value = sidebarPositionData;

  // 等待DOM渲染完成后初始化布局
  setTimeout(async () => {
    await initLayout();
  }, 100);

  // 监听窗口大小变化，重新调整布局
  window.addEventListener('resize', async () => {
    await initLayout();
  });

  // 设置消息监听器
  setupMessageListener();

  messageToContent({
    type: 'sidebar_ready',
  });
});
</script>

<style scoped lang="scss">
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;

  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0; // 修复Flex布局中的溢出问题

    .content-area {
      flex: 1;
      min-width: 300px;
      // max-width: 70%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      // border-right: 1px solid #ebeef5;
      background-color: #fff;

      // 底部布局时改为水平排列
      &.bottom-layout {
        flex-direction: row;
        // max-width: none;

        // 在底部布局时，MonitorSection 和 MockSection 水平排列
        :deep(.monitor-section) {
          flex: 1;
          min-width: 300px;
          max-width: 60%;
          border-right: 1px solid #ebeef5;
          height: 100%;
          overflow: hidden;
        }

        :deep(.mock-section) {
          flex: 1;
          min-width: 250px;
          border-right: none;
          height: 100%;
          overflow: hidden;
        }

        // 调整 ResizeHandle 的方向
        :deep(.resize-handle) {
          width: 3px !important;
          height: 100% !important;
          cursor: col-resize !important;

          &.horizontal {
            width: 3px !important;
            height: 100% !important;
            cursor: col-resize !important;
          }
        }
      }
    }
    // ResizeHandle 样式
    > .resize-handle {
      flex-shrink: 0;
      width: 4px;
      background: #f0f0f0;
      cursor: col-resize;
      border-left: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;

      &:hover {
        background: #e0e0e0;
      }
    }

    // JsonViewer 样式 - 关键修复
    > .json-viewer-area {
      flex: 0 1 auto; // 允许收缩，根据内容调整
      width: 400px; // 默认宽度
      min-width: 300px;
      max-width: 65%; // 增加最大宽度限制
      height: 100%;
      background: #ffffff;
      overflow: hidden;
    }
  }
}

// 响应式调整
@media (max-width: 1200px) {
  .sidebar-container .main-layout {
    .content-area {
      min-width: 250px;
    }

    > .json-viewer-area {
      width: 350px;
      min-width: 250px;
      max-width: 50%;
    }
  }
}

@media (max-width: 768px) {
  .sidebar-container .main-layout {
    .content-area {
      min-width: 200px;
    }

    > .json-viewer-area {
      width: 300px;
      min-width: 200px;
      max-width: 45%;
    }
  }
}
</style>
