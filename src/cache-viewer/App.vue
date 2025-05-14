<template>
  <div class="cache-viewer">
    <div class="cache-viewer__header">
      <el-row :gutter="20">
        <el-col :span="16">
          <h1>请求缓存查看器</h1>
          <p>
            当前共有 {{ cacheItems.length }} 条缓存数据，总大小
            {{ formatTotalSize }}
          </p>
        </el-col>
        <el-col :span="8" class="text-right">
          <el-button type="primary" @click="refreshCache">刷新缓存</el-button>
          <el-button type="danger" @click="clearCache">清空缓存</el-button>
          <el-button type="success" @click="createTestCache">添加测试数据</el-button>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索URL..."
            prefix-icon="el-icon-search"
            clearable
          />
        </el-col>
        <el-col :span="8">
          <el-select
            v-model="groupByOption"
            placeholder="分组方式"
            style="width: 100%"
          >
            <el-option label="全部" value="none" />
            <el-option label="按域名分组" value="domain" />
            <el-option label="按内容类型分组" value="contentType" />
            <el-option label="按状态码分组" value="status" />
            <el-option label="按缓存日期分组" value="dateGroup" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select
            v-if="groupByOption !== 'none'"
            v-model="selectedGroup"
            placeholder="选择分组"
            style="width: 100%"
            clearable
            @change="onGroupChange"
          >
            <el-option
              v-for="group in availableGroups"
              :key="group.value"
              :label="group.label"
              :value="group.value"
            />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div v-if="cacheItems.length > 0">
      <el-table
        :data="paginatedItems"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'timestamp', order: 'descending' }"
        v-loading="loading"
      >
        <el-table-column type="expand">
          <template #default="props">
            <el-tabs type="border-card">
              <el-tab-pane label="响应数据">
                <div class="cache-item__content">
                  <pre
                    class="json-viewer"
                  ><code>{{ formatJson(props.row.response) }}</code></pre>
                </div>
              </el-tab-pane>
              <el-tab-pane label="响应头">
                <div class="cache-item__content">
                  <el-descriptions border :column="1">
                    <el-descriptions-item
                      v-for="(value, key) in props.row.headers"
                      :key="key"
                      :label="key"
                    >
                      {{ value }}
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-tab-pane>
            </el-tabs>
          </template>
        </el-table-column>
        <el-table-column
          prop="url"
          label="URL"
          min-width="300"
          :show-overflow-tooltip="true"
        />
        <el-table-column
          prop="domain"
          label="域名"
          width="150"
          :show-overflow-tooltip="true"
        />
        <el-table-column
          prop="contentType"
          label="内容类型"
          width="180"
          :show-overflow-tooltip="true"
        />
        <el-table-column prop="status" label="状态码" width="100" sortable />
        <el-table-column
          prop="size"
          label="大小"
          width="120"
          sortable
          :formatter="formatSize"
        />
        <el-table-column
          prop="timestamp"
          label="缓存时间"
          width="230"
          sortable
          :formatter="formatTimestamp"
        />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              type="danger"
              @click="deleteCache(scope.row.url)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        class="pagination-container"
        style="margin-top: 20px; text-align: center"
      >
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          :total="filteredAndGroupedItems.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    <div v-else class="empty-message">
      <el-empty description="没有缓存数据" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

interface CacheItem {
  url: string;
  response: any;
  headers: Record<string, string>;
  timestamp: number;
  contentType: string;
  size: number;
  status: number;
  isExpired?: boolean;
  domain: string;
  dateGroup: string;
}

export default defineComponent({
  name: "CacheViewer",
  setup() {
    const cacheItems = ref<CacheItem[]>([]);
    const searchQuery = ref("");
    const loading = ref(false);
    const groupByOption = ref("none");
    const selectedGroup = ref("");
    const availableGroups = ref([]);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const totalCacheSize = ref(0);
    // 添加防抖计时器标识
    let fetchDebounceTimer: number | null = null;
    // 添加标志位防止重复请求
    let isRequestInProgress = false;
    // 添加防止循环请求的计数器和时间戳
    let requestCount = 0;
    let lastRequestTime = 0;
    // 添加数据已加载标志
    let dataLoaded = false;

    // 获取所有缓存 (带防抖和安全保护)
    const fetchCacheItems = async () => {
      // 防止短时间内多次请求 - 防止循环调用
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      requestCount++;
      
      // 如果在2秒内发起了3次以上请求，可能是遇到了循环调用的问题
      if (timeSinceLastRequest < 2000 && requestCount > 3) {
        console.warn('检测到可能的循环请求，暂停获取数据操作...');
        // 重置请求计数但不执行请求
        requestCount = 0;
        lastRequestTime = now;
        return;
      }
      
      // 如果间隔超过5秒，重置计数器
      if (timeSinceLastRequest > 5000) {
        requestCount = 1;
      }
      
      // 更新最后请求时间
      lastRequestTime = now;
      
      // 如果已经有请求在进行中，不要发起新请求
      if (isRequestInProgress) {
        console.log('已有请求在进行中，忽略此次请求...');
        return;
      }
      
      // 如果数据已经加载过且当前有缓存项，不再重复加载
      if (dataLoaded && cacheItems.value.length > 0) {
        console.log('数据已加载，无需重复请求');
        return;
      }
      
      // 清除现有计时器
      if (fetchDebounceTimer !== null) {
        console.log('清除之前的请求计时器');
        clearTimeout(fetchDebounceTimer);
        fetchDebounceTimer = null;
      }
      // 设置防抖延迟
      fetchDebounceTimer = setTimeout(() => {
        // 标记请求开始
        isRequestInProgress = true;
        loading.value = true;
        console.log('正在请求缓存数据... (防抖后)');
        
        try {
          // 向后台发送消息获取所有缓存，添加唯一请求ID
          const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          chrome.runtime.sendMessage({ action: "getAllCache", _requestId: requestId }, (response) => {
            console.log(`收到缓存数据响应 [请求ID: ${requestId}]:`, response);
            
            // 确保在所有情况下都重置请求状态
            isRequestInProgress = false;
            loading.value = false;
            
            if (response && response.success) {
              console.log('缓存数据条数:', response.data?.length || 0);
              // 处理数据，提取域名信息
              if (Array.isArray(response.data)) {
                // 标记数据已加载
                dataLoaded = true;
                
                cacheItems.value = response.data.map((item: CacheItem) => {
                  try {
                    const url = new URL(item.url);
                    return {
                      ...item,
                      domain: url.hostname,
                      dateGroup: new Date(item.timestamp).toLocaleDateString(),
                    };
                  } catch (e) {
                    return {
                      ...item,
                      domain: "未知域名",
                      dateGroup: new Date(item.timestamp).toLocaleDateString(),
                    };
                  }
                });
                updateAvailableGroups();
                totalCacheSize.value = cacheItems.value.reduce(
                  (acc, item) => acc + (item.size || 0),
                  0
                );
              } else {
                console.error('接收到的数据不是数组:', response.data);
                ElMessage.warning('接收到非预期格式的缓存数据');
              }
            } else {
              console.error('获取缓存数据失败:', response?.error || '未知错误');
              ElMessage.error(
                "获取缓存数据失败：" + (response?.error || "未知错误")
              );
            }
          });
        } catch (error) {
          console.error("获取缓存失败:", error);
          ElMessage.error("获取缓存失败");
          loading.value = false;
          isRequestInProgress = false;
        }
      }, 500); // 增加到500ms防抖延迟
    };

    // 删除单个缓存
    const deleteCache = (url: string) => {
      ElMessageBox.confirm("确定要删除该缓存项吗?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          console.log('正在发送删除缓存请求:', url);
          chrome.runtime.sendMessage(
            { action: "deleteCache", url },
            (response) => {
              console.log('收到删除缓存响应:', response);
              if (response && response.success) {
                cacheItems.value = cacheItems.value.filter(
                  (item) => item.url !== url
                );
                totalCacheSize.value = cacheItems.value.reduce(
                  (acc, item) => acc + item.size,
                  0
                );
                ElMessage.success("缓存删除成功");
              } else {
                ElMessage.error(
                  "缓存删除失败：" + (response?.error || "未知错误")
                );
              }
            }
          );
        })
        .catch(() => {
          // 用户取消操作
        });
    };

    // 清空所有缓存
    const clearCache = () => {
      ElMessageBox.confirm("确定要清空所有缓存吗?", "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          console.log('正在发送清空缓存请求...');
          // 尝试同时使用新旧两种消息格式，确保兼容性
          chrome.runtime.sendMessage({ action: "clearCache", type: "CLEAR_CACHE" }, (response) => {
            console.log('收到清空缓存响应:', response);
            if (response && response.success) {
              cacheItems.value = [];
              totalCacheSize.value = 0;
              ElMessage.success("缓存已清空");
            } else {
              ElMessage.error(
                "清空缓存失败：" + (response?.error || "未知错误")
              );
            }
          });
        })
        .catch(() => {
          // 用户取消操作
        });
    };

    // 刷新缓存
    const refreshCache = () => {
      fetchCacheItems();
    };

    // 格式化JSON显示
    const formatJson = (json: any) => {
      if (!json) return "";
      try {
        if (typeof json === "string") {
          return JSON.stringify(JSON.parse(json), null, 2);
        }
        return JSON.stringify(json, null, 2);
      } catch (e) {
        return json;
      }
    };

    // 格式化文件大小
    const formatSize = (row: any) => {
      const size = row.size;
      if (size < 1024) {
        return size + " B";
      } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + " KB";
      } else {
        return (size / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    // 格式化时间戳
    const formatTimestamp = (row: any) => {
      const date = new Date(row.timestamp);

      // 格式化日期部分：YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      // 格式化时间部分：HH:MM:SS.mmm
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

      // 组合为完整格式
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    };

    // 格式化总缓存大小
    const formatTotalSize = computed(() => {
      return formatSize({ size: totalCacheSize.value });
    });

    // 过滤缓存项
    const filteredCacheItems = computed(() => {
      if (!searchQuery.value) return cacheItems.value;
      const query = searchQuery.value.toLowerCase();
      return cacheItems.value.filter(
        (item) =>
          item.url.toLowerCase().includes(query) ||
          item.contentType.toLowerCase().includes(query) ||
          item.domain.toLowerCase().includes(query)
      );
    });

    // 根据分组和筛选条件过滤项目
    const filteredAndGroupedItems = computed(() => {
      let items = filteredCacheItems.value;

      // 应用分组筛选
      if (groupByOption.value !== "none" && selectedGroup.value) {
        const fieldName =
          groupByOption.value === "date" ? "dateGroup" : groupByOption.value;
        items = items.filter(
          (item) => String(item[fieldName]) === selectedGroup.value
        );
      }

      return items;
    });

    // 计算分页后的项目
    const paginatedItems = computed(() => {
      const startIndex = (currentPage.value - 1) * pageSize.value;
      return filteredAndGroupedItems.value.slice(
        startIndex,
        startIndex + pageSize.value
      );
    });

    const handleSizeChange = (size: number) => {
      pageSize.value = size;
    };

    const handleCurrentChange = (page: number) => {
      currentPage.value = page;
    };

    const onGroupChange = () => {
      currentPage.value = 1; // 重置到第一页
    };

    // 更新可用的分组列表
    const updateAvailableGroups = () => {
      if (groupByOption.value === "none") {
        availableGroups.value = [];
        selectedGroup.value = "";
        return;
      }

      // 根据分组类型获取所有唯一值
      const groupFieldName =
        groupByOption.value === "date" ? "dateGroup" : groupByOption.value;
      const uniqueValues = new Set();

      cacheItems.value.forEach((item) => {
        let value = item[groupFieldName];
        if (value !== undefined && value !== null) {
          uniqueValues.add(value);
        }
      });

      // 转换为选项格式
      availableGroups.value = Array.from(uniqueValues)
        .map((value) => {
          let label = String(value);
          let count = cacheItems.value.filter(
            (item) => item[groupFieldName] === value
          ).length;

          return {
            value: label,
            label: `${label} (${count})`,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    };

    // 监听分组类型变化
    watch(groupByOption, () => {
      updateAvailableGroups();
      selectedGroup.value = ""; // 重置选中的分组
      currentPage.value = 1; // 重置页码
    });

    // 创建测试缓存数据（仅用于开发调试）
    const createTestCache = () => {
      console.log('添加测试缓存数据');
      // 模拟添加测试数据成功
      ElMessage.success('已添加测试缓存数据');
      // 刷新缓存列表
      setTimeout(() => fetchCacheItems(), 500);
    };
    
    onMounted(() => {
      console.log('Cache-viewer组件已挂载，即将获取缓存数据...');
      // 确保扩展已完全初始化且不会产生循环请求
      const initTimer = setTimeout(() => {
        // 只有首次加载时请求一次数据
        if (!isRequestInProgress && cacheItems.value.length === 0 && !dataLoaded) {
          console.log('首次加载请求缓存数据');
          fetchCacheItems();
        }
      }, 1000); // 延长到1000ms确保后台服务已准备好
      
      // 组件卸载时清理所有定时器
      return () => {
        if (fetchDebounceTimer !== null) {
          clearTimeout(fetchDebounceTimer);
          fetchDebounceTimer = null;
        }
        clearTimeout(initTimer);
        // 确保标记请求结束
        isRequestInProgress = false;
      };
    });

    return {
      cacheItems,
      searchQuery,
      loading,
      filteredCacheItems,
      deleteCache,
      clearCache,
      refreshCache,
      formatJson,
      formatSize,
      formatTimestamp,
      formatTotalSize,
      fetchCacheItems,
      groupByOption,
      selectedGroup,
      availableGroups,
      onGroupChange,
      paginatedItems,
      currentPage,
      pageSize,
      handleSizeChange,
      handleCurrentChange,
      filteredAndGroupedItems,
      createTestCache,
    };
  },
});
</script>

<style scoped>
.cache-viewer {
  padding: 20px;
  max-width: 100%;
}

.cache-viewer__header {
  margin-bottom: 20px;
}

.text-right {
  text-align: right;
}

.cache-item__content {
  padding: 10px;
  max-height: 500px;
  overflow: auto;
}

.json-viewer {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
  margin: 0;
  overflow-x: auto;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-message {
  margin-top: 50px;
  text-align: center;
}

.pagination-container {
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}
</style>
