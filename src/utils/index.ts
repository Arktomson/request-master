import hashSum from 'hash-sum';
import Storage from './storage';
import stringify from 'json-stable-stringify';

export const chromeLocalStorage = new Storage('local');
export const chromeSyncStorage = new Storage('sync');
export const chromeManagedStorage = new Storage('managed');
export const chromeSessionStorage = new Storage('session');
// 处理URL去除timestamp参数（如t, timestamp, _t等常见时间戳参数名）
export function normalizeUrl(url: string) {
  try {
    const urlObj = new window.URL(url);
    const searchParams = urlObj.searchParams;

    // 需要移除的时间戳参数名列表
    const timestampParams = [
      't',
      'timestamp',
      '_t',
      '_timestamp',
      'time',
      'ts',
      'v',
      '_',
    ];

    // 移除时间戳参数
    timestampParams.forEach((param) => {
      searchParams.delete(param);
    });

    return urlObj.toString();
  } catch (error) {
    console.error('URL格式化失败:', error);
    return url; // 如果解析失败，返回原始URL
  }
}
export function generateCacheKey(
  url: string,
  params: Record<string, unknown> = {},
  method: string = 'GET'
): string {
  // ① 规范化 URL（排序后的查询串）
  const u = new URL(url);
  u.searchParams.sort();
  if (!params) {
    return hashSum(`${u.toString()}|${method.toUpperCase()}`);
  } // 保证顺序一致

  // ② 深度稳定序列化参数
  const stableParams = stringify(params);

  // ③ 拼接后计算 64 位哈希，返回 16 位十六进制串
  const raw = `${u.toString()}|${stableParams}|${method.toUpperCase()}`;
  return hashSum(raw); // e.g. "1e0b5f7ec9c2d4ab"
}
export function generateCacheKeyFromQueryString(
  url: string,
  queryString?: string
): string {
  if (!queryString) {
    return hashSum(url);
  }

  // 将查询字符串解析为对象
  const params = queryString.split('&').reduce((result, param) => {
    const [key, value] = param.split('=');
    if (key) {
      result[key] = decodeURIComponent(value || '');
    }
    return result;
  }, {} as Record<string, string>);

  // 调用主函数生成键
  return generateCacheKey(url, params);
}
export function messageToContent(data: Record<string, any>, cb: (response: any) => void) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, data, cb)
    }
  });
}
export { default as RequestCacheDB } from './indexdb';
