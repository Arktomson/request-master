import { CacheConfig, CacheStats } from './types';
import { currentConfig } from './config';

// 全局缓存统计数据
export let cacheStats: CacheStats = {
  hits: 0,      // 缓存命中次数
  misses: 0,    // 缓存未命中次数
  savedBytes: 0, // 节省的流量（字节）
  savedTime: 0   // 节省的时间（毫秒）
};

// 获取缓存统计信息
export async function getCacheStats(): Promise<CacheStats> {
  return cacheStats;
}

// 更新缓存统计
export function updateCacheStats(
  hit: boolean,
  size: number = 0,
  timeSaved: number = 0
): void {
  if (hit) {
    cacheStats.hits++;
    cacheStats.savedBytes += size;
    cacheStats.savedTime += timeSaved;
  } else {
    cacheStats.misses++;
  }

  // 每100次更新，保存一次统计数据
  if ((cacheStats.hits + cacheStats.misses) % 100 === 0) {
    chrome.storage.local.set({ cacheStats });
  }
}

// 判断一个URL是否应该被缓存
export function shouldCacheUrl(
  url: string,
  requestType: chrome.webRequest.ResourceType
): boolean {
  if (!currentConfig.enabled) return false;

  console.log(`[调试] 检查URL是否应该缓存: ${url}, 类型: ${requestType}`);

  // 特殊处理 - XMLHttpRequest也需要经过域名检查
  if (requestType === "xmlhttprequest") {
    console.log(`[调试] 检测到XHR请求，但仍需通过域名检查: ${url}`);
    // 不再直接返回true，继续进行域名检查
  }

  // 检查资源类型
  const isJsonOrApi = url.includes(".json") || url.includes("/api/");
  if (!currentConfig.cacheTypes.includes(requestType)) {
    // 特殊处理 - 如果是JSON内容类型但资源类型不匹配，先标记，稍后仍需通过域名检查
    if (isJsonOrApi) {
      console.log(
        `[调试] 资源类型 ${requestType} 不在配置列表中，但URL包含.json或/api/，继续检查域名`
      );
      // 不立即返回，继续检查域名规则
    } else {
      console.log(`[调试] 资源类型 ${requestType} 不在配置列表中，不缓存`);
      return false;
    }
  }

  // 检查域名匹配规则
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    if (!currentConfig.domainRules.checkAll) {
      // 如果不是检查所有域名，则需要匹配规则
      if (!Array.isArray(currentConfig.domainRules.rules) || currentConfig.domainRules.rules.length === 0) {
        console.log(
          `[调试] 未配置域名匹配规则且未启用全部检测，默认不缓存: ${url}`
        );
        return false;
      }

      let domainMatched = false;

      // 添加安全性检查
      const rules = Array.isArray(currentConfig.domainRules.rules) ? currentConfig.domainRules.rules : [];
      for (const rule of rules) {
        // 跳过无效的规则
        if (!rule || typeof rule !== 'object') continue;
        
        if (rule.type === "string") {
          // 字符串匹配
          if (rule.matchType === "exact") {
            // 完全匹配
            if (domain === rule.value) {
              domainMatched = true;
              console.log(
                `[调试] 域名完全匹配规则 "${rule.value}"，允许缓存: ${url}`
              );
              break;
            }
          } else {
            // 部分匹配
            if (domain.includes(rule.value)) {
              domainMatched = true;
              console.log(
                `[调试] 域名部分匹配规则 "${rule.value}"，允许缓存: ${url}`
              );
              break;
            }
          }
        } else {
          // 正则表达式匹配
          try {
            const regex = new RegExp(rule.value);
            if (regex.test(domain)) {
              domainMatched = true;
              console.log(
                `[调试] 域名匹配正则表达式 "${rule.value}"，允许缓存: ${url}`
              );
              break;
            }
          } catch (e) {
            console.error(`[调试] 正则表达式 "${rule.value}" 无效:`, e);
          }
        }
      }

      if (!domainMatched) {
        console.log(`[调试] 域名不匹配任何规则，不缓存: ${url}`);
        return false;
      }
    } else {
      console.log(`[调试] 已启用全部域名检测，继续检查其他规则: ${url}`);
    }
  } catch (e) {
    console.error(`[调试] 解析URL域名失败:`, e);
  }

  // 检查排除模式
  for (const pattern of currentConfig.excludePatterns) {
    if (new RegExp(pattern.replace(/\*/g, ".*")).test(url)) {
      console.log(`[调试] URL匹配排除模式 ${pattern}，不缓存`);
      return false;
    }
  }

  // 检查包含模式
  if (currentConfig.includePatterns.length > 0) {
    // 默认不包含，除非匹配某个包含模式
    let shouldInclude = false;

    // 特殊处理 - API请求路径通常不会以特定扩展名结尾，但我们想要缓存它们
    if (url.includes("/api/") || url.endsWith(".json")) {
      shouldInclude = true;
      console.log(`[调试] URL包含/api/或以.json结尾，符合包含条件`);
    } else {
      // 检查是否匹配任何包含模式
      for (const pattern of currentConfig.includePatterns) {
        if (new RegExp(pattern.replace(/\*/g, ".*")).test(url)) {
          shouldInclude = true;
          console.log(`[调试] URL匹配包含模式 ${pattern}`);
          break;
        }
      }
    }

    if (!shouldInclude) {
      console.log(`[调试] URL不匹配任何包含模式，不缓存`);
      return false;
    }
  }

  // 如果是JSON或API类型，且已通过域名检查，则允许缓存
  if (isJsonOrApi) {
    console.log(`[调试] URL是JSON或API类型且通过了域名检查，将被缓存: ${url}`);
    return true;
  }

  // 如果资源类型不在配置列表中且不是特殊类型，则不缓存
  if (!currentConfig.cacheTypes.includes(requestType)) {
    console.log(`[调试] 资源类型 ${requestType} 不在配置列表中，不缓存`);
    return false;
  }
  
  console.log(`[调试] URL将被缓存: ${url}`);
  return true;
}
