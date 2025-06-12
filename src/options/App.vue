<template>
  <div class="options-container">
    <header class="options-header">
      <h1>扩展选项设置</h1>
    </header>

    <main class="options-content">
      <section class="settings-section">
        <h2>高级设置</h2>
        <div class="form-group">
          <label for="rules">URL 匹配规则 (每行一个)：严格按照type domain格式(中间一个空格)，type可选值为regex、fully、include</label>
          <textarea class="rules-textarea" id="rules" v-model="rulesText" rows="10"
            placeholder="例如: regex .*zcy.*"></textarea>
          <div>
            <label style="display: inline-block;" for="sidebarIfCacheState">缓存时显示侧边栏：</label>
            <input type="checkbox" id="sidebarIfCacheState" v-model="sidebarIfCacheState"
              @change="debouncedSaveCache" />
          </div>
        </div>
      </section>

      <!-- <section class="settings-section">
        <h2>域名匹配规则</h2>

        <div class="form-group">
          <label for="checkAllDomains">检测所有域名：</label>
          <input type="checkbox" id="checkAllDomains" v-model="cacheConfig.domainRules.checkAll"
            @change="debouncedSaveCache" />
          <span class="form-help">启用后将检测所有域名，忽略下方规则</span>
          <button class="btn btn-danger" @click="resetConfig">重置配置</button>
        </div>

        <div v-if="!cacheConfig.domainRules.checkAll" class="domain-rules">
          <h3>域名匹配规则列表</h3>
          <p class="form-help">请添加需要缓存的域名匹配规则</p>

          <div v-for="(rule, index) in cacheConfig.domainRules.rules" :key="index" class="domain-rule-item">
            <div class="domain-rule-content">
              <div class="form-group rule-value">
                <input type="text" v-model="rule.value" placeholder="输入域名或正则表达式" class="domain-input"
                  @change="handleRuleChange" />
              </div>

              <div class="form-group rule-type">
                <label>匹配类型：</label>
                <select v-model="rule.type" @change="handleRuleChange">
                  <option value="string">字符串</option>
                  <option value="regex">正则表达式</option>
                </select>
              </div>

              <div class="form-group" v-if="rule.type === 'string'">
                <label>匹配模式：</label>
                <select v-model="rule.matchType" @change="handleRuleChange">
                  <option value="partial">部分匹配</option>
                  <option value="exact">完全匹配</option>
                </select>
              </div>
            </div>

            <button class="btn btn-danger remove-rule" @click="removeDomainRule(index)">
              删除
            </button>
          </div>

          <div class="actions">
            <button class="btn btn-primary add-rule-btn" @click="addDomainRule">
              添加规则
            </button>
          </div>
        </div>
      </section> -->

      <section class="actions-section">
        <button class="btn btn-primary" @click="saveSettings">保存设置</button>
        <button class="btn btn-secondary" @click="resetSettings">
          重置默认
        </button>
      </section>

      <div v-if="saveStatus" class="save-status" :class="{ success: saveStatus === 'success' }">
        {{ saveStatus === "success" ? "设置已保存" : "保存失败，请重试" }}
      </div>
    </main>

    <footer class="options-footer">
      <p>版本: {{ version }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { chromeLocalStorage } from "@/utils";
import { ref, reactive, onMounted, watch } from "vue";

// 定义域名规则类型接口
interface DomainRule {
  value: string;
  type: "string" | "regex";
  matchType: "partial" | "exact";
}

// 防抖函数
function debounce(fn: Function, delay: number) {
  let timer: number | null = null;
  return function (...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay) as unknown as number;
  };
}

// 默认设置
const DEFAULT_SETTINGS = {
  enabled: true,
  theme: "system",
  notifications: {
    enabled: true,
  },
  advanced: {
    checkInterval: 30,
    rules: ["*://*.example.com/*"],
  },
};

const DEFAULT_CACHE_CONFIG = {
  domainRules: {
    checkAll: true,
    rules: [] as DomainRule[],
  },
};

// 状态
const settings = reactive({ ...DEFAULT_SETTINGS });
const rulesText = ref("");
const saveStatus = ref("");
const version = ref("");
const cacheConfig = reactive({ ...DEFAULT_CACHE_CONFIG });
const sidebarIfCacheState = ref(false);

// 创建防抖保存函数
const debouncedSaveCache = debounce(async () => {
  try {
    await chrome.storage.sync.set({ cacheConfig });
    
  } catch (error) {
    console.error("保存缓存配置失败:", error);
  }
}, 500); // 500ms延迟

// 处理规则值变化
const handleRuleChange = () => {
  debouncedSaveCache();
};

// 加载设置
const loadSettings = async () => {
  try {
    const result = await chromeLocalStorage.getAll();
    const { allowToInjectOrigin } = result;
    const loadedSettings = result.settings || DEFAULT_SETTINGS;

    // 更新设置
    Object.assign(settings, loadedSettings);

    // 更新规则文本
    rulesText.value = allowToInjectOrigin
      .map((item: any) => `${item.type} ${item.domain}`)
      .join("\n");
  } catch (error) {
    console.error("加载设置失败:", error);
  }
};

// 加载缓存配置
const loadCacheConfig = async () => {
  try {
    const result = await chrome.storage.sync.get("cacheConfig");
    let loadedCacheConfig = result.cacheConfig;

    // 如果没有配置或配置不完整，使用默认配置
    if (!loadedCacheConfig) {
      
      loadedCacheConfig = JSON.parse(JSON.stringify(DEFAULT_CACHE_CONFIG));
    }

    // 确保domainRules结构完整
    if (!loadedCacheConfig.domainRules) {
      
      loadedCacheConfig.domainRules = {
        checkAll: true,
        rules: [] as DomainRule[],
      };
    }

    // 确保checkAll属性存在，并默认为true
    if (loadedCacheConfig.domainRules.checkAll === undefined) {
      
      loadedCacheConfig.domainRules.checkAll = true;
    }

    // 确保rules是一个数组
    if (!Array.isArray(loadedCacheConfig.domainRules.rules)) {
      loadedCacheConfig.domainRules.rules = [] as DomainRule[];
    } else {
      // 确保每个规则都有正确的属性
      loadedCacheConfig.domainRules.rules =
        loadedCacheConfig.domainRules.rules.map((rule) => {
          // 确保rule是对象
          if (!rule || typeof rule !== "object") {
            return {
              value: "",
              type: "string" as const,
              matchType: "partial" as const,
            };
          }

          // 确保必要属性存在
          return {
            value: typeof rule.value === "string" ? rule.value : "",
            type: rule.type === "regex" ? "regex" : "string",
            matchType: rule.matchType === "exact" ? "exact" : "partial",
          };
        });
    }

    // 更新缓存配置
    Object.assign(cacheConfig, loadedCacheConfig);
    
  } catch (error) {
    console.error("加载缓存配置失败:", error);
  }
};

// 保存设置
const saveSettings = async () => {
  try {
    await chromeLocalStorage.set({
      allowToInjectOrigin: rulesText.value
        .split("\n")
        .map((rule) => {
          const [type, domain] = rule.split(" ");
          return {
            type,
            domain,
          };
        })
        .filter((rule) => rule.type && rule.domain),
      sidebarIfCacheState: sidebarIfCacheState.value,
    });
    saveStatus.value = "success";

    // 3秒后清除状态消息
    setTimeout(() => {
      saveStatus.value = "";
    }, 2000);
  } catch (error) {
    console.error("保存设置失败:", error);
    saveStatus.value = "error";
  }
};

// 添加域名匹配规则
const addDomainRule = async () => {
  try {
    const newRule: DomainRule = {
      value: "",
      type: "string",
      matchType: "partial",
    };
    cacheConfig.domainRules.rules.push(newRule);
    await chrome.storage.sync.set({ cacheConfig });
    
  } catch (error) {
    console.error("[调试] 添加规则失败:", error);
  }
};

// 删除域名匹配规则
const removeDomainRule = async (index: number) => {
  try {
    cacheConfig.domainRules.rules.splice(index, 1);
    await chrome.storage.sync.set({ cacheConfig });
    
  } catch (error) {
    console.error("[调试] 删除规则失败:", error);
  }
};

// 更新规则
const updateRules = () => {
  // 按行分割并过滤空行
  settings.advanced.rules = rulesText.value
    .split("\n")
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0);

  saveSettings();
};

// 重置为默认设置
const resetSettings = () => {
  Object.assign(settings, DEFAULT_SETTINGS);
  rulesText.value = settings.advanced.rules.join("\n");
  saveSettings();
};

// 重置配置
const resetConfig = async () => {
  try {
    await chrome.storage.sync.remove("cacheConfig");
    Object.assign(cacheConfig, DEFAULT_CACHE_CONFIG);
    
  } catch (error) {
    console.error("重置配置失败:", error);
  }
};

// 监听规则变化
watch(
  () => settings.advanced.rules,
  (newRules) => {
    rulesText.value = newRules.join("\n");
  }
);

// 在组件挂载后执行
onMounted(async () => {
  try {
    
    // 强制设置默认状态
    cacheConfig.domainRules.checkAll = true;

    // 加载设置和缓存配置
    await loadSettings();
    await loadCacheConfig();

    // 获取版本
    const manifest = chrome.runtime.getManifest();
    version.value = manifest.version;

  } catch (err) {
    console.error("[调试] 初始化出错:", err);
  }
});
</script>

<style scoped lang="scss">
// 定义变量
$primary-color: #409eff;
$secondary-color: #909399;
$danger-color: #f56c6c;
$success-color: #67c23a;
$text-color: #333;
$title-color: #2c3e50;
$border-color: #eee;
$input-border: #dcdfe6;
$input-hover-border: #c0c4cc;
$box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
$small-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

.options-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: $text-color;

  .options-header {
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid $border-color;
  }

  .options-footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid $border-color;
    text-align: center;
    font-size: 12px;
    color: #888;
  }
}

h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: $title-color;
}

h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: $title-color;
}

.settings-section {
  margin-bottom: 32px;
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: $box-shadow;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
}

input {
  &[type="checkbox"] {
    margin-right: 8px;
  }

  &[type="text"],
  &[type="number"] {
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid $input-border;
    width: 100%;
    font-size: 14px;
  }
}

select,
textarea {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid $input-border;
  width: 100%;
  font-size: 14px;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.form-help {
  color: $secondary-color;
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 12px;
}

.actions-section {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;

  &-primary {
    background-color: $primary-color;
    color: white;

    &:hover {
      background-color: lighten($primary-color, 10%);
    }
  }

  &-secondary {
    background-color: $secondary-color;
    color: white;

    &:hover {
      background-color: lighten($secondary-color, 10%);
    }
  }

  &-danger {
    background-color: $danger-color;
    color: white;

    &:hover {
      background-color: lighten($danger-color, 10%);
    }
  }
}

.save-status {
  margin-top: 16px;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: $danger-color;
  color: white;

  &.success {
    background-color: $success-color;
  }
}

.domain-rules {
  margin-top: 16px;
  border: 1px solid $border-color;
  border-radius: 4px;
  padding: 16px;
  background-color: #f9f9f9;
}

.domain-rule-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  background-color: #fff;
  padding: 12px;
  border-radius: 4px;
  box-shadow: $small-shadow;
}

.domain-rule-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  .form-group {
    margin-bottom: 8px;
  }

  .rule-value {
    grid-column: 1 / -1;
  }

  label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    color: #606266;
  }

  select {
    width: 100%;
    padding: 8px;
    border: 1px solid $input-border;
    border-radius: 4px;
    background-color: #fff;
    font-size: 14px;
    color: #606266;
    appearance: none;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23606266" d="M0 0l6 6 6-6z"/></svg>');
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 24px;

    &:hover {
      border-color: $input-hover-border;
    }

    &:focus {
      outline: none;
      border-color: $primary-color;
    }
  }
}

.remove-rule {
  margin-left: 12px;
  white-space: nowrap;
}

.domain-input {
  width: 100%;
}

.actions {
  margin-top: 16px;
  text-align: center;

  .add-rule-btn {
    padding: 8px 24px;
    font-size: 14px;
  }
}

.rules-textarea {
  width: 80%;
  height: 300px;
}
</style>
