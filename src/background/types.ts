// 缓存配置接口
export interface CacheConfig {
  enabled: boolean; // 缓存功能是否启用
  maxCacheAge: number; // 最大缓存时间（毫秒）
  excludePatterns: string[]; // 排除的URL模式
  includePatterns: string[]; // 包含的URL模式
  cacheTypes: string[]; // 要缓存的资源类型 (如 'image', 'script', 'stylesheet', 'font' 等)

  // 域名匹配规则配置
  domainRules: {
    checkAll: boolean; // 是否检测所有域名
    rules: Array<{
      value: string; // 域名值
      type: "string" | "regex"; // 匹配类型：字符串或正则表达式
      matchType: "partial" | "exact"; // 匹配模式：部分匹配或完全匹配（仅对字符串类型有效）
    }>;
  };
}

// 缓存项接口
export interface CacheItem {
  url: string; // 请求URL
  response: any; // 响应内容
  headers: Record<string, string>; // 响应头
  timestamp: number; // 缓存时间戳
  contentType: string; // 内容类型
  size: number; // 大小（字节）
  status: number; // HTTP状态码
  isExpired?: boolean; // 是否已过期（但在错误时仍可使用）
}

// 临时响应信息接口
export interface TempResponseInfo {
  url: string;
  contentType: string;
  status: number;
  headers: Record<string, string>;
}

// 缓存统计接口
export interface CacheStats {
  hits: number; // 缓存命中次数
  misses: number; // 缓存未命中次数
  savedBytes: number; // 节省的流量（字节）
  savedTime: number; // 节省的时间（毫秒）
}

// 错误回退统计接口
export interface FallbackStats {
  errorFallbacks: number; // 使用缓存处理错误的次数
  expiredFallbacks: number; // 使用过期缓存处理错误的次数
}
