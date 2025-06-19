<template>
  <div class="monitor-section" ref="monitorSectionRef">
    <div class="section-header">
      <div class="section-title">监控记录</div>
      <div class="monitor-actions">
        <el-button type="primary" size="small" @click="emit('clear-requestList')">
          清空记录
        </el-button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="request-search">
      <el-input
        v-model="searchQuery"
        size="small"
        clearable
        :prefix-icon="Search"
        placeholder="搜索 URL (模糊匹配)"
      />
    </div>

    <!-- 请求列表头部 -->
    <div class="request-header">
      <div class="url-column">URL</div>
      <div class="time-column">时间</div>
      <div class="method-column">方法</div>
      <div class="action-column">操作</div>
    </div>

    <!-- 请求列表 -->
    <div class="request-list">
      <div
        v-for="(item, index) in filteredRequests"
        :key="index"
        class="request-item"
        :class="{
          selected: props.selectedRequestIndex === item.originalIndex,
          'is-mock': item.req.isMock === true,
        }"
        @click="emit('select-request', item.originalIndex)"
        @dblclick="emit('add-to-mock', item.originalIndex)"
      >
        <div class="url-column text-ellipsis">
          <el-tooltip
            effect="dark"
            :content="item.req.url"
            placement="top"
            :show-after="300"
          >
            <span>{{ item.req.path }}</span>
          </el-tooltip>
        </div>
        <div class="time-column">{{ formatTime(item.req.time) }}</div>
        <div class="method-column">
          <el-tag :type="getMethodType(item.req.method)" size="small">
            {{ item.req.method }}
          </el-tag>
        </div>
        <div class="action-column">
          <el-button
            type="danger"
            size="small"
            circle
            @click.stop="emit('delete-request', item.originalIndex)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElButton, ElInput, ElTag, ElTooltip, ElIcon } from 'element-plus';
import { Delete ,Search } from '@element-plus/icons-vue';
import { getMethodType } from '@/utils';


interface RequestWithIndex {
  req: any;
  originalIndex: number;
}

const props = defineProps<{
  requestList: any[];
  selectedRequestIndex: number;
}>();

const emit = defineEmits<{
  (e: 'select-request', index: number): void;
  (e: 'clear-requestList'): void;
  (e: 'delete-request', index: number): void;
  (e: 'add-to-mock', index: number): void;
}>();

// 搜索
const searchQuery = ref('');

const filteredRequests = computed<RequestWithIndex[]>(() => {
  const q = searchQuery.value.toLowerCase();
  return props.requestList.flatMap((req: any, i: number) => {
    if (!q || req.url?.toLowerCase().includes(q)) {
      return { req, originalIndex: i } as RequestWithIndex;
    }
    return [];
  });
});

// DOM引用
const monitorSectionRef = ref<HTMLElement | null>(null);

// 方法
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

// 暴露给父组件的方法和属性
defineExpose({
  rootElement: monitorSectionRef,
});
</script>

<style scoped lang="scss">
.monitor-section {
  height: 50%;
  display: flex;
  flex-direction: column;

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

    .monitor-actions {
      display: flex;
      gap: 8px;
    }
  }

  .request-search {
    padding: 6px 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .request-header {
    display: flex;
    padding: 8px 12px;
    background-color: #f5f7fa;
    font-weight: bold;
    font-size: 12px;
    color: #606266;
    border-bottom: 1px solid #ebeef5;

    .url-column {
      flex: 1;
    }

    .time-column {
      width: 70px;
      text-align: center;
    }

    .method-column {
      width: 70px;
      text-align: center;
    }

    .action-column {
      width: 60px;
      text-align: center;
    }
  }

  .request-list {
    flex: 1;
    overflow-y: auto;

    .request-item {
      display: flex;
      align-items: center;
      padding: 4px 6px;
      border-bottom: 1px solid #ebeef5;
      cursor: pointer;

      &:hover {
        background-color: #f5f7fa;
      }

      &.selected {
        background-color: #ecf5ff;
      }

      &.is-mock {
        background-color: #e8f5e8;
        border-left: 3px solid #67c23a;
        position: relative;

        &::before {
          content: 'MOCK';
          position: absolute;
          top: 2px;
          right: 4px;
          background-color: #67c23a;
          color: white;
          font-size: 8px;
          padding: 1px 4px;
          border-radius: 2px;
          font-weight: bold;
        }

        &.selected {
          background-color: #e1f3d8;
        }
      }

      .url-column {
        flex: 1;
        font-size: 12px;
      }

      .time-column {
        width: 70px;
        text-align: center;
        font-size: 12px;
        color: #909399;
      }

      .method-column {
        width: 70px;
        text-align: center;
      }

      .action-column {
        width: 60px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
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
