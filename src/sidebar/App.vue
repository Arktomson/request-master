<template>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <h1 class="sidebar-title">Mock工具</h1>
      <div class="sidebar-status">
        <span class="status-indicator" :class="{ 'active': isActive }"></span>
        <span>{{ isActive ? '已激活' : '未激活' }}</span>
        <el-switch v-model="isActive" @change="toggleActive" />
      </div>
    </div>

    <div @click="count++">{{ count }}</div>
    <div class="sidebar-tabs">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="Mock列表" name="mockList">
          <div class="mock-list">
            <div v-if="mockList.length === 0" class="empty-list">
              <el-empty description="暂无Mock数据" />
              <el-button type="primary" @click="showAddMockDialog">添加第一个Mock</el-button>
            </div>
            <template v-else>
              <div class="mock-list-header">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索Mock"
                  prefix-icon="el-icon-search"
                  clearable
                >
                </el-input>
                <el-button type="primary" size="small" @click="showAddMockDialog">
                  添加Mock
                </el-button>
              </div>
              <div class="mock-items">
                <div 
                  v-for="(item, index) in filteredMockList" 
                  :key="index" 
                  class="mock-item"
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
                        icon="el-icon-edit"
                        @click="editMock(index)"
                      >
                        编辑
                      </el-button>
                      <el-button 
                        type="text" 
                        icon="el-icon-delete"
                        @click="deleteMock(index)"
                      >
                        删除
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </el-tab-pane>
        <el-tab-pane label="设置" name="settings">
          <div class="settings-panel">
            <el-form label-position="top">
              <el-form-item label="默认延迟时间(ms)">
                <el-input-number v-model="settings.defaultDelay" :min="0" :max="10000" />
              </el-form-item>
              <el-form-item label="捕获请求方式">
                <el-select v-model="settings.captureMethod" style="width: 100%">
                  <el-option label="所有请求" value="all" />
                  <el-option label="仅Ajax请求" value="ajax" />
                  <el-option label="仅Fetch请求" value="fetch" />
                </el-select>
              </el-form-item>
            </el-form>
            <div class="settings-actions">
              <el-button type="primary" @click="saveSettings">保存设置</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Mock弹窗 -->
    <el-dialog
      v-model="mockDialogVisible"
      :title="isEditMode ? '编辑Mock' : '添加Mock'"
      width="90%"
    >
      <el-form label-position="top" :model="currentMock">
        <el-form-item label="URL模式">
          <el-input v-model="currentMock.url" placeholder="例如: /api/users/:id" />
        </el-form-item>
        <el-form-item label="请求方法">
          <el-select v-model="currentMock.method" style="width: 100%">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="延迟(ms)">
          <el-input-number v-model="currentMock.delay" :min="0" />
        </el-form-item>
        <el-form-item label="响应数据">
          <el-input
            v-model="currentMock.response"
            type="textarea"
            :rows="8"
            placeholder="输入JSON响应数据"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mockDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMock">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chromeLocalStorage } from '@/utils';

// 状态
const isActive = ref(false);
const activeTab = ref('mockList');
const mockList = ref<any[]>([]);
const searchQuery = ref('');
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
const count = ref(0);

// 计算属性
const filteredMockList = computed(() => {
  if (!searchQuery.value) return mockList.value;
  const query = searchQuery.value.toLowerCase();
  return mockList.value.filter(
    item => item.url.toLowerCase().includes(query) || 
            item.method.toLowerCase().includes(query)
  );
});

// 方法
const toggleActive = (value: boolean) => {
  isActive.value = value;
  chromeLocalStorage.set({ mockEnabled: value });
  ElMessage.success(value ? 'Mock功能已启用' : 'Mock功能已禁用');
};

const getMethodClass = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower === 'get') return 'method-get';
  if (methodLower === 'post') return 'method-post';
  if (methodLower === 'put') return 'method-put';
  if (methodLower === 'delete') return 'method-delete';
  return 'method-other';
};

const showAddMockDialog = () => {
  isEditMode.value = false;
  currentMock.value = {
    url: '',
    method: 'GET',
    enabled: true,
    delay: settings.value.defaultDelay,
    response: '{}'
  };
  mockDialogVisible.value = true;
};

const editMock = (index: number) => {
  isEditMode.value = true;
  editingIndex.value = index;
  currentMock.value = { ...mockList.value[index] };
  mockDialogVisible.value = true;
};

const saveMock = () => {
  // 检查URL是否为空
  if (!currentMock.value.url.trim()) {
    ElMessage.error('URL不能为空');
    return;
  }

  // 检查响应JSON格式
  try {
    JSON.parse(currentMock.value.response);
  } catch (e) {
    ElMessage.error('响应数据必须是有效的JSON格式');
    return;
  }

  if (isEditMode.value) {
    // 编辑模式
    mockList.value[editingIndex.value] = { ...currentMock.value };
  } else {
    // 添加模式
    mockList.value.push({ ...currentMock.value });
  }

  // 保存到存储
  saveMockListToStorage();
  mockDialogVisible.value = false;
  ElMessage.success(isEditMode.value ? 'Mock已更新' : 'Mock已添加');
};

const deleteMock = (index: number) => {
  ElMessageBox.confirm('确定要删除这个Mock吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    mockList.value.splice(index, 1);
    saveMockListToStorage();
    ElMessage.success('删除成功');
  }).catch(() => {});
};

const updateMockStatus = (index: number, enabled: boolean) => {
  mockList.value[index].enabled = enabled;
  saveMockListToStorage();
};

const saveMockListToStorage = () => {
  chromeLocalStorage.set({ mockList: mockList.value });
};

const saveSettings = () => {
  chromeLocalStorage.set({ mockSettings: settings.value });
  ElMessage.success('设置已保存');
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
});
</script>

<style scoped lang="scss">
.sidebar-container {
  padding: 12px;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 12px;
}

.sidebar-title {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: #303133;
}

.sidebar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #909399;
  
  &.active {
    background-color: #67c23a;
  }
}

.mock-list {
  height: calc(100vh - 150px);
  overflow-y: auto;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
  gap: 16px;
}

.mock-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mock-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 12px;
  background-color: #fff;
  transition: box-shadow 0.3s;
  
  &:hover {
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  }
}

.mock-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mock-item-url {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.mock-item-method {
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

.mock-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mock-item-actions {
  display: flex;
  gap: 8px;
}

.settings-panel {
  padding: 16px 0;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style> 