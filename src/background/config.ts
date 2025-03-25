import { CacheConfig } from './types';

// 默认配置
export const defaultConfig: CacheConfig = {
  enabled: true,
  maxCacheAge: 24 * 60 * 60 * 1000, // 24小时
  excludePatterns: ["*://localhost:*/*", "*/login*", "*/auth*"],
  includePatterns: [
    "*.jpg",
    "*.jpeg",
    "*.png",
    "*.gif",
    "*.webp",
    "*.svg",
    "*.css",
    "*.js",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.json",
  ],
  cacheTypes: [
    "image",
    "font",
    "script",
    "stylesheet",
    "xmlhttprequest",
    "fetch",
    "other",
  ],
  domainRules: {
    checkAll: true,
    rules: [],
  },
};

// 当前配置
export let currentConfig: CacheConfig = { ...defaultConfig };

// 初始化配置
export function initConfig(): void {
  console.log("[调试] 初始化配置...");

  // 从存储中加载配置
  chrome.storage.sync.get(["settings", "cacheConfig"], (result) => {
    // 合并设置
    if (result.settings) {
      console.log("[调试] 从存储加载扩展设置:", result.settings);

      // 合并配置
      if (result.settings.enabled !== undefined) {
        currentConfig.enabled = result.settings.enabled;
      }
    }

    // 合并缓存配置
    if (result.cacheConfig?.domainRules) {
      console.log(
        "[调试] 从存储加载域名匹配规则:",
        result.cacheConfig.domainRules
      );
      // 确保domainRules和rules属性存在且是正确的类型
      currentConfig.domainRules = {
        checkAll: result.cacheConfig.domainRules.checkAll !== false, // 默认为true，除非明确设置为false
        rules: Array.isArray(result.cacheConfig.domainRules.rules) 
          ? result.cacheConfig.domainRules.rules 
          : []
      };
    } else {
      // 确保domainRules有默认值
      currentConfig.domainRules = {
        checkAll: true,
        rules: []
      };
    }

    console.log("[调试] 初始化配置完成:", currentConfig);
  });

  // 监听配置变化
  chrome.storage.onChanged.addListener((changes) => {
    console.log("[调试] 存储变化:", changes);

    // 更新设置
    if (changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings && newSettings.enabled !== undefined) {
        currentConfig.enabled = newSettings.enabled;
        console.log(
          `[调试] 缓存功能 ${currentConfig.enabled ? "启用" : "禁用"}`
        );
      }
    }

    // 更新缓存配置
    if (changes.cacheConfig) {
      const newCacheConfig = changes.cacheConfig.newValue;
      if (newCacheConfig && newCacheConfig.domainRules) {
        currentConfig.domainRules = {
          checkAll: newCacheConfig.domainRules.checkAll !== false, // 默认为true，除非明确设置为false
          rules: Array.isArray(newCacheConfig.domainRules.rules) 
            ? newCacheConfig.domainRules.rules 
            : []
        };
        console.log(`[调试] 域名匹配规则已更新:`, currentConfig.domainRules);
      }
    }
  });
}
