<template>
  <el-dialog
    v-model="visible"
    :title="isEditMode ? '编辑Mock' : '添加Mock'"
    width="90%"
  >
    <el-form label-position="top" :model="mockData">
      <el-form-item label="URL模式">
        <el-input v-model="mockData.url" placeholder="例如: /api/users/:id" />
      </el-form-item>
      <el-form-item label="请求方法">
        <el-select v-model="mockData.method" style="width: 100%">
          <el-option label="GET" value="GET" />
          <el-option label="POST" value="POST" />
          <el-option label="PUT" value="PUT" />
          <el-option label="DELETE" value="DELETE" />
        </el-select>
      </el-form-item>
      <el-form-item label="延迟(ms)">
        <el-input-number v-model="mockData.delay" :min="0" />
      </el-form-item>
      <el-form-item label="响应数据">
        <el-input
          v-model="mockData.response"
          type="textarea"
          :rows="8"
          placeholder="输入JSON响应数据"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

// 定义Mock数据类型
interface MockData {
  url: string;
  method: string;
  enabled: boolean;
  delay: number;
  response: string;
}

// 定义属性
const props = defineProps<{
  modelValue: boolean;
  isEditMode: boolean;
  currentMock: MockData;
}>();

// 定义事件
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', mockData: MockData): void;
}>();

// 状态
const visible = ref(props.modelValue);
const mockData = ref<MockData>({
  url: '',
  method: 'GET',
  enabled: true,
  delay: 200,
  response: '{}'
});

// 监听属性变化
watch(() => props.modelValue, (newValue) => {
  visible.value = newValue;
});

watch(() => visible.value, (newValue) => {
  emit('update:modelValue', newValue);
});

watch(() => props.currentMock, (newValue) => {
  mockData.value = { ...newValue };
}, { deep: true });

// 方法
const handleCancel = () => {
  visible.value = false;
};

const handleSave = () => {
  // 检查URL是否为空
  if (!mockData.value.url.trim()) {
    ElMessage.error('URL不能为空');
    return;
  }

  // 检查响应JSON格式
  try {
    JSON.parse(mockData.value.response);
  } catch (e) {
    ElMessage.error('响应数据必须是有效的JSON格式');
    return;
  }

  // 尝试压缩JSON
  try {
    const parsed = JSON.parse(mockData.value.response);
    mockData.value.response = JSON.stringify(parsed);
  } catch (e) {
    // 失败时保持原样
  }

  // 发送保存事件
  emit('save', { ...mockData.value });
  visible.value = false;
};
</script> 