<template>
  <div class="mock-section" ref="mockSectionRef">
    <div class="section-header">
      <div class="section-title">Mock列表</div>
      <div class="mock-actions">
        <span style="margin-right: 8px">Mock功能</span>
        <el-switch v-model="mockEnabled" @change="handleMockToggle" />
        <el-button type="danger" size="small" @click="emit('clear-all-mocks')">
          清除所有
        </el-button>
      </div>
    </div>

    <!-- Mock列表头部 -->
    <div class="mock-header">
      <div class="checkbox-column">
        <el-checkbox
          :model-value="selectAllState.checked"
          :indeterminate="selectAllState.indeterminate"
          @change="handleSelectAll"
          size="default"
        />
      </div>
      <div class="url-column">URL</div>
      <div class="method-column">方法</div>
      <div class="action-column">操作</div>
    </div>

    <!-- Mock列表 -->
    <div class="mock-list">
      <div v-if="mockList.length === 0" class="empty-list">
        <el-empty description="暂无Mock数据" :image-size="130" />
      </div>
      <template v-else>
        <div
          v-for="(item, index) in mockList"
          :key="index"
          class="mock-item"
          :class="{ selected: selectedMockIndex === index }"
          @click="emit('select-mock', index)"
        >
          <div class="checkbox-column" @click.stop>
            <el-checkbox
              :model-value="item.enabled !== false"
              @change="(checked: boolean) => handleMockItemToggle(index, checked)"
              size="default"
            />
          </div>
          <div class="url-column text-ellipsis">
            <el-tooltip
              effect="dark"
              :content="item.url"
              placement="top"
              :show-after="500"
            >
              <span>{{ item.path }}</span>
            </el-tooltip>
          </div>
          <div class="method-column">
            <el-tag :type="getMethodType(item.method)" size="small">
              {{ item.method }}
            </el-tag>
          </div>
          <div class="action-column">
            <el-button
              type="danger"
              size="small"
              circle
              @click.stop="emit('delete-mock', index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  ElMessage,
  ElSwitch,
  ElButton,
  ElTag,
  ElEmpty,
  ElTooltip,
  ElIcon,
  ElCheckbox,
} from 'element-plus';
import { chromeLocalStorage, getMethodType, messageToContent } from '@/utils';
import { Edit, Delete } from '@element-plus/icons-vue';

// 接收父组件传递的属性
const props = defineProps<{
  mockList: any[];
  selectedMockIndex: number;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'select-mock', index: number): void;
  (e: 'edit-mock', index: number): void;
  (e: 'delete-mock', index: number): void;
  (e: 'clear-all-mocks'): void;
  (e: 'toggle-mock-item', index: number, enabled: boolean): void;
  (e: 'batch-toggle-mocks', enabled: boolean): void;
}>();

// DOM引用
const mockSectionRef = ref<HTMLElement | null>(null);
const mockEnabled = ref(false);

// 计算全选状态
const selectAllState = computed(() => {
  if (props.mockList.length === 0) {
    return { checked: false, indeterminate: false };
  }

  const enabledCount = props.mockList.filter(
    (item) => item.enabled !== false
  ).length;

  if (enabledCount === 0) {
    return { checked: false, indeterminate: false };
  } else if (enabledCount === props.mockList.length) {
    return { checked: true, indeterminate: false };
  } else {
    return { checked: false, indeterminate: true };
  }
});

// 处理全选/取消全选
const handleSelectAll = (checked: boolean | string | number) => {
  const isChecked = Boolean(checked);
  emit('batch-toggle-mocks', isChecked);
  // ElMessage.success(isChecked ? '已全部启用Mock' : '已全部禁用Mock');
};

const handleMockItemToggle = (index: number, enabled: boolean) => {
  emit('toggle-mock-item', index, enabled);
  // ElMessage.success(enabled ? 'Mock已启用' : 'Mock已禁用');
};

const handleMockToggle = (enabled: boolean | string | number) => {
  messageToContent({
    type: 'mockEnabled_change',
    data: enabled,
  });
  chromeLocalStorage.set({ mockEnabled: enabled });
  ElMessage.success(enabled ? 'Mock已开启' : 'Mock已关闭');
};

// 初始化Mock开关状态
onMounted(async () => {
  const storedMockEnabled = await chromeLocalStorage.get('mockEnabled');
  mockEnabled.value = storedMockEnabled === true;
});

// 暴露给父组件的方法和属性
defineExpose({
  rootElement: mockSectionRef,
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

    .mock-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .mock-header {
    display: flex;
    background-color: #f5f7fa;
    font-weight: bold;
    font-size: 12px;
    color: #606266;
    border-bottom: 1px solid #ebeef5;
    align-items: center;

    .checkbox-column {
      width: 60px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .url-column {
      flex: 1;
      padding-left: 0;
    }

    .method-column {
      width: 70px;
      text-align: center;
    }

    .action-column {
      width: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .mock-list {
    flex: 1;
    overflow-y: auto;

    /* 只在内容溢出时显示滚动条 */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;

      &:hover {
        background-color: rgba(0, 0, 0, 0.3);
      }
    }

    /* 针对Firefox */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;

    .empty-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 0;
      :deep(.el-empty) {
        --el-empty-padding: 10px 0;
      }
    }

    .mock-item {
      display: flex;
      // padding: 4px 6px;
      align-items: center;
      border-bottom: 1px solid #ebeef5;
      cursor: pointer;
      min-height: 32px;

      &:hover {
        background-color: #f5f7fa;
      }

      &.selected {
        background-color: #ecf5ff;
      }

      .checkbox-column {
        width: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .url-column {
        flex: 1;
        font-size: 12px;
        padding-left: 0;
      }

      .method-column {
        width: 70px;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .action-column {
        width: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
    }
  }
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
