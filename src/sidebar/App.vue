<template>
  <div class="sidebar-container">
    <!-- 顶部标题区 -->
    <Header />

    <!-- 主体布局 -->
    <div class="main-layout">
      <!-- 左侧标签栏 -->
      <SidebarMenu v-model:activeTab="activeTab" />

      <!-- 中间主要内容区 -->
      <div class="content-area">
        <!-- 请求监测区域 -->
        <MonitorSection
          ref="monitorSectionRef"
          :requests="requests"
          :selectedRequestIndex="selectedRequestIndex"
          @select-request="selectRequest"
          @clear-requests="handleClearRequests"
          @add-mock="showAddMockDialog"
          @delete-request="deleteRequest"
          @add-to-mock="addRequestToMock"
        />

        <!-- 可拖拽分隔线(垂直方向) -->
        <ResizeHandle direction="horizontal" @resize="handleHorizontalResize" />

        <!-- Mock列表区域 -->
        <MockSection
          ref="mockSectionRef"
          :mockList="mockList"
          :selectedMockIndex="selectedMockIndex"
          @select-mock="selectMock"
          @edit-mock="editMock"
          @delete-mock="deleteMock"
          @add-mock="showAddMockDialog"
          @mock-toggle="handleMockToggle"
          @clear-all-mocks="handleClearAllMocks"
        />
      </div>

      <!-- 可拖拽分隔线 -->
      <ResizeHandle @resize="handleVerticalResize" />

      <!-- 右侧JSON查看器 -->
      <JsonViewer
        ref="jsonViewerRef"
        :content="jsonContent"
        :payload="payloadContent"
        :headers="headersContent"
        :isSelected="!!selectedRequest"
        :isMockSelected="!!selectedMock"
        @update:content="(val) => (jsonContent = val)"
        @save="saveJsonContent"
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
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  toRaw,
  nextTick,
  watchEffect,
  watch,
  watchEffect,
} from 'vue';
import { ElMessage } from 'element-plus';
import {
  chromeLocalStorage,
  chromeSessionStorage,
  messageToContent,
} from '@/utils';
import stringify from 'json-stable-stringify';
// 导入组件
import Header from './components/Header.vue';
import SidebarMenu from './components/SidebarMenu.vue';
import MonitorSection from './components/MonitorSection.vue';
import MockSection from './components/MockSection.vue';
import JsonViewer from './components/JsonViewer.vue';
import MockDialog from './components/MockDialog.vue';
import ResizeHandle from './components/ResizeHandle.vue';

// 状态
const activeTab = ref('monitor');
const mockList = ref<any[]>([]);
const requests = ref<any[]>([]);
const selectedRequestIndex = ref(-1);
const selectedMockIndex = ref(-1);
const mockDialogVisible = ref(false);
const isEditMode = ref(false);
const editingIndex = ref(-1);
const currentMock = ref({
  url: '',
  method: 'GET',
  enabled: true,
  response: '{}',
});

const jsonContent = ref('');
const payloadContent = ref('');
const headersContent = ref('');

// DOM引用
const monitorSectionRef = ref();
const mockSectionRef = ref();
const jsonViewerRef = ref();

// 计算属性
const selectedRequest = computed(() => {
  if (
    selectedRequestIndex.value >= 0 &&
    requests.value.length > selectedRequestIndex.value
  ) {
    return requests.value[selectedRequestIndex.value];
  }
  return null;
});

const selectedMock = computed(() => {
  if (
    Array.isArray(mockList.value) &&
    selectedMockIndex.value >= 0 &&
    selectedMockIndex.value < mockList.value.length
  ) {
    return mockList.value[selectedMockIndex.value];
  }
  return null;
});

// 方法
const selectRequest = (index: number) => {
  selectedRequestIndex.value = index;
  selectedMockIndex.value = -1;
  const request = requests.value[index];
  const response = request.response;
  const params = request.params;
  const headers = request.headers;
  if (!response) {
    jsonContent.value = '';
    payloadContent.value = '';
    headersContent.value = '';
    return;
  }

  try {
    // 如果response已经是对象，直接格式化
    if (typeof response === 'object') {
      jsonContent.value = JSON.stringify(response, null, 2);
    }
  } catch (error) {
    // 如果解析失败，直接显示原内容
    jsonContent.value =
      typeof response === 'string'
        ? response
        : JSON.stringify(response, null, 2);
  }

  // 更新payload和headers
  if (params) {
    try {
      let paramsObj = typeof params === 'string' ? JSON.parse(params) : params;
      payloadContent.value = JSON.stringify(paramsObj, null, 2);
    } catch (e) {
      payloadContent.value = String(params);
    }
  } else {
    payloadContent.value = '';
  }

  if (headers) {
    try {
      let headersObj =
        typeof headers === 'string' ? JSON.parse(headers) : headers;
      headersContent.value = JSON.stringify(headersObj, null, 2);
    } catch (e) {
      headersContent.value = String(headers);
    }
  } else {
    headersContent.value = '';
  }
};

const selectMock = (index: number) => {
  // 检查索引是否有效
  if (index < 0 || index >= mockList.value.length) {
    return;
  }

  selectedMockIndex.value = index;
  selectedRequestIndex.value = -1;
  const mock = mockList.value[index];

  if (!mock || !mock.response) {
    jsonContent.value = '';
    payloadContent.value = '';
    headersContent.value = '';
    return;
  }
  const params = mock.params;
  const headers = mock.headers;
  try {
    // 如果response已经是对象，直接格式化
    if (typeof mock.response === 'object') {
      jsonContent.value = JSON.stringify(mock.response, null, 2);
    }
    if (params) {
      let paramsObj = typeof params === 'string' ? JSON.parse(params) : params;
      payloadContent.value = JSON.stringify(toRaw(paramsObj), null, 2);
    }
    if (headers) {
      let headersObj =
        typeof headers === 'string' ? JSON.parse(headers) : headers;
      headersContent.value = JSON.stringify(headersObj, null, 2);
    }
  } catch (error) {
    // 如果解析失败，直接显示原内容
    jsonContent.value =
      typeof mock.response === 'string'
        ? mock.response
        : JSON.stringify(mock.response, null, 2);
  }
};

const showAddMockDialog = () => {
  isEditMode.value = false;

  // 如果有选中的请求，使用它的信息预填
  if (selectedRequest.value) {
    const req = selectedRequest.value;

    // 处理响应数据
    let responseData = '{}';
    if (req.response) {
      if (typeof req.response === 'object') {
        responseData = JSON.stringify(req.response, null, 2);
      } else {
        responseData = req.response;
      }
    } else if (jsonContent.value) {
      responseData = jsonContent.value;
    }

    currentMock.value = {
      url: req.url,
      method: req.method,
      enabled: true,
      response: responseData,
    };
  } else {
    currentMock.value = {
      url: '',
      method: 'GET',
      enabled: true,
      response: '{}',
    };
  }

  mockDialogVisible.value = true;
};

const editMock = (index: number) => {
  // 确保mockList是数组
  if (!Array.isArray(mockList.value)) {
    mockList.value = [];
    return;
  }

  // 检查索引是否有效
  if (index < 0 || index >= mockList.value.length) {
    ElMessage.error('无效的索引');
    return;
  }

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

const addRequestToMock = async (index: number) => {
  const request = requests.value[index];
  if (!request) return;

  // 确保mockList是数组
  if (!Array.isArray(mockList.value)) {
    mockList.value = [];
  }

  // 检查是否已存在相同URL和方法的Mock
  const existingMock = mockList.value.find(
    (mock) => mock.cacheKey === request.cacheKey
  );

  if (existingMock) {
    ElMessage.warning('该请求已存在Mock规则');
    return;
  }

  const { response, cacheKey, url, method, params, headers } = request;
  // 创建新的Mock配置
  const newMock = {
    cacheKey: cacheKey,
    response: toRaw(response),
    url: url,
    method: method,
    params: params,
    headers: headers,
  };

  // 添加到Mock列表
  mockList.value.push(newMock);
  const curMockList = (await chromeLocalStorage.get('mockList')) || [];
  curMockList.push(newMock);
  chromeLocalStorage.set({ mockList: curMockList });
  ElMessage.success('已添加到Mock列表');
};

const deleteMock = async (cacheKey: string) => {
  selectedMockIndex.value = -1;
  jsonContent.value = '';
  payloadContent.value = '';
  headersContent.value = '';
  // 确保mockList是数组
  if (!Array.isArray(mockList.value)) {
    mockList.value = [];
    return;
  }

  const curMockList = (await chromeLocalStorage.get('mockList')) || [];
  const newMockList = curMockList.filter(
    (item: any) => item.cacheKey !== cacheKey
  );
  chromeLocalStorage.set({ mockList: newMockList });
  mockList.value = newMockList;
  ElMessage.success('删除成功');
};

const handleMockToggle = (enabled: boolean) => {
  // Mock总开关的处理逻辑已经在MockSection组件内部处理
  // 这里可以添加其他需要的逻辑，比如通知content script等
};

const handleClearAllMocks = async () => {
  // 清空选中状态和显示内容
  selectedMockIndex.value = -1;
  jsonContent.value = '';
  payloadContent.value = '';
  headersContent.value = '';

  // 清空 mock 列表
  mockList.value = [];

  // 清空存储
  await chromeLocalStorage.set({ mockList: [] });

  ElMessage.success('已清除所有Mock数据');
};

const handleClearRequests = () => {
  requests.value = [];
  selectedRequestIndex.value = -1;
  jsonContent.value = '';
  payloadContent.value = '';
  headersContent.value = '';

  // 清空两个存储位置的数据
  // chromeSessionStorage.set({
  //   curCacheData: [],
  // });

  ElMessage.success('记录已清空');
};

const deleteRequest = (index: number) => {
  // 如果删除的是当前选中的
  if (selectedRequestIndex.value === index) {
    selectedRequestIndex.value = -1;
    jsonContent.value = '';
    payloadContent.value = '';
    headersContent.value = '';
  }
  requests.value.splice(index, 1);
};

const saveJsonContent = async (content: string) => {
  // 如果是编辑mock的响应
  if (
    selectedMock.value &&
    Array.isArray(mockList.value) &&
    selectedMockIndex.value >= 0 &&
    selectedMockIndex.value < mockList.value.length
  ) {
    const parseContent = JSON.parse(content);
    const { cacheKey } = mockList.value[selectedMockIndex.value];
    const curMockList = (await chromeLocalStorage.get('mockList')) || [];
    curMockList.forEach((item: any) => {
      if (item.cacheKey === cacheKey) {
        item.response = parseContent;
      }
    });
    mockList.value[selectedMockIndex.value].response = parseContent;
    chromeLocalStorage.set({ mockList: curMockList });
  }
};

// 拖拽调整大小处理
const handleVerticalResize = (size: number) => {
  if (jsonViewerRef.value?.jsonViewerAreaRef) {
    const container = document.querySelector('.main-layout') as HTMLElement;
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    const contentArea = document.querySelector('.content-area') as HTMLElement;
    if (!contentArea) return;

    // 确保调整后的宽度不超出合理范围
    const minWidth = 300;
    const maxWidth = containerWidth * 0.75; // 最大不超过容器的75%
    const newSize = Math.max(minWidth, Math.min(maxWidth, size));

    // 计算内容区和JSON查看器的相对宽度
    const contentAreaWidth = containerWidth - newSize - 87; // 减去菜单宽度和分隔线宽度

    // 应用新宽度
    contentArea.style.width = `${contentAreaWidth}px`;
    contentArea.style.flex = '0 0 auto';
    jsonViewerRef.value.jsonViewerAreaRef.style.width = `${newSize}px`;
    jsonViewerRef.value.jsonViewerAreaRef.style.flex = '0 0 auto';
  }
};

const handleHorizontalResize = (size: number) => {
  const monitorSection = monitorSectionRef.value?.monitorSectionRef;
  const mockSection = mockSectionRef.value?.mockSectionRef;
  const container = monitorSection?.parentElement;

  if (monitorSection && mockSection && container) {
    const containerHeight = container.getBoundingClientRect().height;

    // 确保调整后的高度不超出合理范围
    const minHeight = 100;
    const maxHeight = containerHeight - 120; // 保留足够空间给Mock区域
    const newSize = Math.max(minHeight, Math.min(maxHeight, size));

    const heightPercent = (newSize / containerHeight) * 100;

    monitorSection.style.height = `${heightPercent}%`;
    monitorSection.style.minHeight = `${minHeight}px`;
    mockSection.style.height = `calc(100% - ${heightPercent}% - 3px)`; // 减去分隔线的高度
    mockSection.style.minHeight = `100px`;
  }
};

// 初始化布局大小
const initLayout = () => {
  // 初始化垂直分割比例
  const container = document.querySelector('.main-layout') as HTMLElement;
  if (container) {
    const containerWidth = container.getBoundingClientRect().width;
    const jsonViewerWidth = containerWidth * 0.4; // JSON查看器占40%
    handleVerticalResize(jsonViewerWidth);
  }

  // 初始化水平分割比例
  const contentArea = document.querySelector('.content-area') as HTMLElement;
  if (contentArea) {
    const contentHeight = contentArea.getBoundingClientRect().height;
    const monitorHeight = contentHeight * 0.6; // 监控区域占60%
    handleHorizontalResize(monitorHeight);
  }
};

// 设置消息监听
const setupMessageListener = () => {
  // 直接监听background发送的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'new_request_data') {
      // 直接添加新的请求数据
      requests.value.push(message.data);
    } else if (message.type === 'batch_request_data') {
      requests.value = message.data;
    }
  });
};

const notifyMockList = (val: any) => {
  messageToContent(
    {
      type: 'mockList_change',
      data: val,
    },
    () => {}
  );
};

// 监听 mockList 深度变化，保持存储和注入脚本同步
watch(
  mockList,
  (val) => {
    // chromeLocalStorage.set({ mockList: val });
    notifyMockList(val);
  },
  { deep: true }
);

// 生命周期钩子
onMounted(async () => {
  // 加载Mock列表
  const storedMockList = (await chromeLocalStorage.get('mockList')) || [];
  if (Array.isArray(storedMockList)) {
    mockList.value = storedMockList;
  } else {
    mockList.value = [];
  }

  // 等待DOM渲染完成后初始化布局
  setTimeout(initLayout, 100);

  // 监听窗口大小变化，重新调整布局
  window.addEventListener('resize', initLayout);

  // 设置消息监听器
  setupMessageListener();

  messageToContent({
    type: 'sidebar_ready',
  });
});

onUnmounted(() => {
  // 移除事件监听器
  window.removeEventListener('resize', initLayout);
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
      max-width: 70%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-right: 1px solid #ebeef5;
    }
  }
}

// 响应式调整
@media (max-width: 1200px) {
  .sidebar-container .main-layout .content-area {
    min-width: 250px;
    max-width: 60%;
  }
}

@media (max-width: 768px) {
  .sidebar-container .main-layout .content-area {
    min-width: 200px;
    max-width: 50%;
  }
}
</style>
