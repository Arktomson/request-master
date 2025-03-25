<template>
  <div class="options-container">
    <header class="options-header">
      <h1>扩展选项设置</h1>
    </header>

    <main class="options-content">
      <section class="settings-section">
        <h2>基本设置</h2>

        <div class="form-group">
          <label for="enabled">启用扩展：</label>
          <input
            type="checkbox"
            id="enabled"
            v-model="settings.enabled"
            @change="saveSettings"
          />
        </div>

        <div class="form-group">
          <label for="notificationEnabled">启用通知：</label>
          <input
            type="checkbox"
            id="notificationEnabled"
            v-model="settings.notifications.enabled"
            @change="saveSettings"
          />
        </div>

        <div class="form-group">
          <label for="theme">主题选择：</label>
          <select id="theme" v-model="settings.theme" @change="saveSettings">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="system">跟随系统</option>
          </select>
        </div>
      </section>

      <section class="settings-section">
        <h2>高级设置</h2>

        <div class="form-group">
          <label for="interval">检查间隔 (秒)：</label>
          <input
            type="number"
            id="interval"
            v-model.number="settings.advanced.checkInterval"
            min="1"
            max="3600"
            @change="saveSettings"
          />
        </div>

        <div class="form-group">
          <label for="rules">URL 匹配规则 (每行一个)：</label>
          <textarea
            id="rules"
            v-model="rulesText"
            rows="5"
            placeholder="例如: *.example.com/*"
            @change="updateRules"
          ></textarea>
        </div>
      </section>

      <section class="settings-section">
        <h2>域名匹配规则</h2>

        <div class="form-group">
          <label for="checkAllDomains">检测所有域名：</label>
          <input
            type="checkbox"
            id="checkAllDomains"
            v-model="cacheConfig.domainRules.checkAll"
            @change="debouncedSaveCache"
          />
          <span class="form-help">启用后将检测所有域名，忽略下方规则</span>
          <button class="btn btn-danger" @click="resetConfig">重置配置</button>
        </div>

        <div v-if="!cacheConfig.domainRules.checkAll" class="domain-rules">
          <h3>域名匹配规则列表</h3>
          <p class="form-help">请添加需要缓存的域名匹配规则</p>

          <div
            v-for="(rule, index) in cacheConfig.domainRules.rules"
            :key="index"
            class="domain-rule-item"
          >
            <div class="domain-rule-content">
              <div class="form-group rule-value">
                <input
                  type="text"
                  v-model="rule.value"
                  placeholder="输入域名或正则表达式"
                  class="domain-input"
                  @change="handleRuleChange"
                />
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

            <button
              class="btn btn-danger remove-rule"
              @click="removeDomainRule(index)"
            >
              删除
            </button>
          </div>

          <div class="actions">
            <button class="btn btn-primary add-rule-btn" @click="addDomainRule">
              添加规则
            </button>
          </div>
        </div>
      </section>

      <section class="actions-section">
        <button class="btn btn-primary" @click="saveSettings">保存设置</button>
        <button class="btn btn-secondary" @click="resetSettings">
          重置默认
        </button>
      </section>

      <div
        v-if="saveStatus"
        class="save-status"
        :class="{ success: saveStatus === 'success' }"
      >
        {{ saveStatus === "success" ? "设置已保存" : "保存失败，请重试" }}
      </div>
    </main>

    <footer class="options-footer">
      <p>版本: {{ version }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
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

// 创建防抖保存函数
const debouncedSaveCache = debounce(async () => {
  try {
    await chrome.storage.sync.set({ cacheConfig });
    console.log("[调试] 缓存配置已保存(防抖):", cacheConfig);
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
    const result = await chrome.storage.sync.get("settings");
    const loadedSettings = result.settings || DEFAULT_SETTINGS;

    // 更新设置
    Object.assign(settings, loadedSettings);

    // 更新规则文本
    rulesText.value = settings.advanced.rules.join("\n");
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
      console.log("[调试] 未找到缓存配置，使用默认配置");
      loadedCacheConfig = JSON.parse(JSON.stringify(DEFAULT_CACHE_CONFIG));
    }

    // 确保domainRules结构完整
    if (!loadedCacheConfig.domainRules) {
      console.log("[调试] domainRules不存在，使用默认值");
      loadedCacheConfig.domainRules = {
        checkAll: true,
        rules: [] as DomainRule[],
      };
    }

    // 确保checkAll属性存在，并默认为true
    if (loadedCacheConfig.domainRules.checkAll === undefined) {
      console.log("[调试] checkAll未定义，设置为true");
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
    console.log("[调试] 加载的缓存配置:", cacheConfig);
  } catch (error) {
    console.error("加载缓存配置失败:", error);
  }
};

// 保存设置
const saveSettings = async () => {
  try {
    await chrome.storage.sync.set({ settings });
    saveStatus.value = "success";

    // 3秒后清除状态消息
    setTimeout(() => {
      saveStatus.value = "";
    }, 3000);
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
    console.log(
      "[调试] 已添加新规则，当前规则数:",
      cacheConfig.domainRules.rules.length
    );
  } catch (error) {
    console.error("[调试] 添加规则失败:", error);
  }
};

// 删除域名匹配规则
const removeDomainRule = async (index: number) => {
  try {
    cacheConfig.domainRules.rules.splice(index, 1);
    await chrome.storage.sync.set({ cacheConfig });
    console.log(
      "[调试] 已删除规则，当前规则数:",
      cacheConfig.domainRules.rules.length
    );
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
    console.log("[调试] 配置已重置");
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
    console.log("[调试] 组件挂载，初始化...");
    // 强制设置默认状态
    cacheConfig.domainRules.checkAll = true;

    // 加载设置和缓存配置
    await loadSettings();
    await loadCacheConfig();

    // 获取版本
    const manifest = chrome.runtime.getManifest();
    version.value = manifest.version;

    console.log("[调试] 初始状态:", {
      settings: { ...settings },
      cacheConfig: { ...cacheConfig },
    });
  } catch (err) {
    console.error("[调试] 初始化出错:", err);
  }
});
</script>

<style scoped>
.options-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

.options-header {
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #2c3e50;
}

h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2c3e50;
}

.settings-section {
  margin-bottom: 32px;
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input[type="checkbox"] {
  margin-right: 8px;
}

input[type="text"],
input[type="number"],
select,
textarea {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  width: 100%;
  font-size: 14px;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.form-help {
  color: #909399;
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
}

.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover {
  background-color: #66b1ff;
}

.btn-secondary {
  background-color: #909399;
  color: white;
}

.btn-secondary:hover {
  background-color: #a6a9ad;
}

.btn-danger {
  background-color: #f56c6c;
  color: white;
}

.btn-danger:hover {
  background-color: #f78989;
}

.save-status {
  margin-top: 16px;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #f56c6c;
  color: white;
}

.save-status.success {
  background-color: #67c23a;
}

.options-footer {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  text-align: center;
  font-size: 12px;
  color: #888;
}

.domain-rules {
  margin-top: 16px;
  border: 1px solid #eee;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.domain-rule-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .domain-rule-content {
    grid-template-columns: 1fr;
  }
}

.domain-rule-content .form-group {
  margin-bottom: 8px;
}

.domain-rule-content .rule-value {
  grid-column: 1 / -1;
}

.domain-rule-content label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #606266;
}

.domain-rule-content select {
  width: 100%;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  font-size: 14px;
  color: #606266;
  appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23606266" d="M0 0l6 6 6-6z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}

.domain-rule-content select:hover {
  border-color: #c0c4cc;
}

.domain-rule-content select:focus {
  outline: none;
  border-color: #409eff;
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
}

.add-rule-btn {
  padding: 8px 24px;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}
</style>
