<template>
  <div class="sidebar-container">
    <!-- 顶部标题区 -->
    <Header v-model:isActive="isActive" />

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
        />

        <!-- 可拖拽分隔线(垂直方向) -->
        <ResizeHandle 
          direction="horizontal" 
          @resize="handleHorizontalResize"
        />

        <!-- Mock列表区域 -->
        <MockSection
          ref="mockSectionRef"
          :mockList="mockList"
          :selectedMockIndex="selectedMockIndex"
          @select-mock="selectMock"
          @update-mock-status="updateMockStatus"
          @edit-mock="editMock"
          @delete-mock="deleteMock"
          @add-mock="showAddMockDialog"
        />
      </div>

      <!-- 可拖拽分隔线 -->
      <ResizeHandle @resize="handleVerticalResize" />

      <!-- 右侧JSON查看器 -->
      <JsonViewer
        ref="jsonViewerRef"
        :content="jsonContent"
        :isSelected="!!selectedRequest"
        :isMockSelected="!!selectedMock"
        @update:content="(val) => jsonContent = val"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chromeLocalStorage, chromeSessionStorage } from '@/utils';

// 导入组件
import Header from './components/Header.vue';
import SidebarMenu from './components/SidebarMenu.vue';
import MonitorSection from './components/MonitorSection.vue';
import MockSection from './components/MockSection.vue';
import JsonViewer from './components/JsonViewer.vue';
import MockDialog from './components/MockDialog.vue';
import ResizeHandle from './components/ResizeHandle.vue';

// 状态
const isActive = ref(false);
const activeTab = ref('1');
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
  delay: 200,
  response: '{}'
});
const settings = ref({
  defaultDelay: 200,
  captureMethod: 'all'
});
const jsonContent = ref('');

// DOM引用
const monitorSectionRef = ref();
const mockSectionRef = ref();
const jsonViewerRef = ref();

// 计算属性
const selectedRequest = computed(() => {
  if (selectedRequestIndex.value >= 0 && requests.value.length > selectedRequestIndex.value) {
    return requests.value[selectedRequestIndex.value];
  }
  return null;
});

const selectedMock = computed(() => {
  if (selectedMockIndex.value >= 0 && mockList.value.length > selectedMockIndex.value) {
    return mockList.value[selectedMockIndex.value];
  }
  return null;
});

// 方法
const selectRequest = (index: number) => {
  selectedRequestIndex.value = index;
  selectedMockIndex.value = -1;
  const request = requests.value[index];
  
  try {
    // 显示响应数据
    if (request.response) {
      const responseData = typeof request.response === 'string' 
        ? JSON.parse(request.response) 
        : request.response;
      jsonContent.value = JSON.stringify(responseData, null, 2);
    } else {
      jsonContent.value = '';
    }
  } catch (error) {
    jsonContent.value = request.response || '';
  }
};

const selectMock = (index: number) => {
  selectedMockIndex.value = index;
  selectedRequestIndex.value = -1;
  const mock = mockList.value[index];
  
  try {
    jsonContent.value = JSON.stringify(JSON.parse(mock.response), null, 2);
  } catch (error) {
    jsonContent.value = mock.response || '';
  }
};

const showAddMockDialog = () => {
  isEditMode.value = false;
  
  // 如果有选中的请求，使用它的信息预填
  if (selectedRequest.value) {
    const req = selectedRequest.value;
    currentMock.value = {
      url: req.url,
      method: req.method,
      enabled: true,
      delay: settings.value.defaultDelay,
      response: jsonContent.value || '{}'
    };
  } else {
    currentMock.value = {
      url: '',
      method: 'GET',
      enabled: true,
      delay: settings.value.defaultDelay,
      response: '{}'
    };
  }
  
  mockDialogVisible.value = true;
};

const editMock = (index: number) => {
  isEditMode.value = true;
  editingIndex.value = index;
  currentMock.value = { ...mockList.value[index] };
  
  // 格式化JSON
  try {
    const formattedResponse = JSON.stringify(JSON.parse(currentMock.value.response), null, 2);
    currentMock.value.response = formattedResponse;
  } catch (e) {
    // 保持原样
  }
  
  mockDialogVisible.value = true;
};

const saveMock = (mockData: any) => {
  if (isEditMode.value) {
    // 编辑模式
    mockList.value[editingIndex.value] = { ...mockData };
    // 如果当前选中的是被编辑的mock，更新显示
    if (selectedMockIndex.value === editingIndex.value) {
      selectMock(editingIndex.value);
    }
  } else {
    // 添加模式
    mockList.value.push({ ...mockData });
  }

  // 保存到存储
  saveMockListToStorage();
  ElMessage.success(isEditMode.value ? 'Mock已更新' : 'Mock已添加');
};

const deleteMock = (index: number) => {
  // 如果删除的是当前选中的
  if (selectedMockIndex.value === index) {
    selectedMockIndex.value = -1;
    jsonContent.value = '';
  }
  
  mockList.value.splice(index, 1);
  saveMockListToStorage();
  ElMessage.success('删除成功');
};

const updateMockStatus = (index: number, enabled: boolean) => {
  mockList.value[index].enabled = enabled;
  saveMockListToStorage();
};

const saveMockListToStorage = async () => {
  await chromeLocalStorage.set({ mockList: mockList.value });
  // 配置更新后通知content script
  notifyConfigUpdate();
};

const saveSettings = () => {
  chromeLocalStorage.set({ mockSettings: settings.value });
  ElMessage.success('设置已保存');
};

const handleClearRequests = () => {
  requests.value = [];
  selectedRequestIndex.value = -1;
  jsonContent.value = '';
  chromeSessionStorage.set({ curCacheData: [] });
  ElMessage.success('记录已清空');
};

const saveJsonContent = (content: string) => {
  // 如果是编辑mock的响应
  if (selectedMock.value) {
    mockList.value[selectedMockIndex.value].response = content;
    saveMockListToStorage();
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
    mockSection.style.height = `calc(100% - ${heightPercent}% - 3px)`;  // 减去分隔线的高度
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
  chromeSessionStorage.onChange(({curMonitorData}) => {
    if(curMonitorData){
      requests.value = curMonitorData.newValue;
      console.log('init receive changes', curMonitorData.newValue);
    }
  },'curMonitorData');
  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //   console.log('侧边栏收到消息:', message);
    
  //   // 处理来自content script的消息
  //   if (message.type === 'update_current_request') {
  //     const { data } = message;
  //     // handleNewRequest(data);
  //     console.log('update_current_request', data);
  //     // switch (action) {
  //     //   case 'update_current_request':
  //     //     // 处理新请求
  //     //     handleNewRequest(data);
  //     //     break;
          
  //     //   case 'update_mock_status':
  //     //     // 更新Mock状态
  //     //     isActive.value = message.data.enabled;
  //     //     break;
          
  //     //   // 其他消息类型...
  //     //   default:
  //     //     console.log('未知的消息类型:', action);
  //     // }
  //   }
    
  //   // 返回true表示异步处理消息
  //   return true;
  // });
};

// 处理新请求数据
const handleNewRequest = (requestData: any) => {
  // 将新请求添加到列表中
  requests.value = [...requests.value, requestData];
  // 如果需要，可以自动选择新请求
  // selectRequest(requests.value.length - 1);
};

// 向content script发送消息的函数
const sendMessageToContent = (data: any) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const activeTabId = tabs[0]?.id;
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, {
        type: 'from_sidebar',
        data: data
      });
    }
  });
};

// 监听存储更新通知
const setupStorageListener = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "storage_updated") {
      // 从存储中获取更新的数据
      loadUpdatedData(message.key);
    }
    return true;
  });
};

// 加载更新的数据
const loadUpdatedData = async (key: string) => {
  if (key === 'curCacheData') {
    // 加载新的请求记录
    const requestData = await chromeSessionStorage.get('curCacheData');
    if (requestData && Array.isArray(requestData)) {
      requests.value = requestData;
    }
  } else if (key === 'mockList') {
    // 加载新的Mock列表
    const storedMockList = await chromeLocalStorage.get('mockList');
    if (storedMockList) {
      mockList.value = storedMockList;
    }
  }
  // ... 其他类型的数据更新处理
};

// 通知content script配置已更新
const notifyConfigUpdate = () => {
  chrome.runtime.sendMessage({
    type: "from_sidebar",
    data: {
      action: "mock_updated"
    }
  });
};

// 生命周期钩子
onMounted(async () => {
  // 从存储中加载状态
  const storedMockEnabled = await chromeLocalStorage.get('mockEnabled');
  isActive.value = storedMockEnabled === true;

  // 加载Mock列表
  const storedMockList = await chromeLocalStorage.get('mockList');
  if (storedMockList) {
    mockList.value = storedMockList;
  }

  // 加载设置
  const storedSettings = await chromeLocalStorage.get('mockSettings');
  if (storedSettings) {
    settings.value = storedSettings;
  }
  
  // 加载请求记录
  const requestData = await chromeSessionStorage.get('curCacheData');
  if (requestData && Array.isArray(requestData)) {
    requests.value = requestData;
  }
  
  // 等待DOM渲染完成后初始化布局
  setTimeout(initLayout, 100);
  
  // 监听窗口大小变化，重新调整布局
  window.addEventListener('resize', initLayout);
  
  // 设置消息监听器
  setupMessageListener();
  
  // 设置存储监听器
  setupStorageListener();

  const curMonitorData = await chromeSessionStorage.get('curMonitorData');
  requests.value = curMonitorData;
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