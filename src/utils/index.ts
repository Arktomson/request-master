import hashSum from "hash-sum";
import Storage from "./storage";
export const chromeLocalStorage = new Storage("local");
export const chromeSyncStorage = new Storage("sync");
export const chromeManagedStorage = new Storage("managed");
export const chromeSessionStorage = new Storage("session");
// 处理URL去除timestamp参数（如t, timestamp, _t等常见时间戳参数名）
export function normalizeUrl(url: string) {
  try {
    const urlObj = new window.URL(url);
    const searchParams = urlObj.searchParams;

    // 需要移除的时间戳参数名列表
    const timestampParams = [
      "t",
      "timestamp",
      "_t",
      "_timestamp",
      "time",
      "ts",
      "v",
      "_",
    ];

    // 移除时间戳参数
    timestampParams.forEach((param) => {
      searchParams.delete(param);
    });

    return urlObj.toString();
  } catch (error) {
    console.error("URL格式化失败:", error);
    return url; // 如果解析失败，返回原始URL
  }
}
export function generateCacheKey(
  url: string,
  params?: Record<string, any>,
  method?: string
): string {
  if (!params) {
    // 如果没有参数，直接对URL进行哈希
    return hashSum(url);
  }

  // 对参数对象的键进行排序，确保相同的参数不同顺序生成相同的键
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);

  // 将URL和排序后的参数组合并进行哈希
  return hashSum(`${url}|${JSON.stringify(sortedParams)}|${method}`);
}
export function generateCacheKeyFromQueryString(
  url: string,
  queryString?: string
): string {
  if (!queryString) {
    return hashSum(url);
  }

  // 将查询字符串解析为对象
  const params = queryString.split("&").reduce((result, param) => {
    const [key, value] = param.split("=");
    if (key) {
      result[key] = decodeURIComponent(value || "");
    }
    return result;
  }, {} as Record<string, string>);

  // 调用主函数生成键
  return generateCacheKey(url, params);
}
export { default as RequestCacheDB } from "./indexdb";
