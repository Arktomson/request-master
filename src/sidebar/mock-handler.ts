import { chromeLocalStorage } from '@/utils';

interface MockItem {
  url: string;
  method: string;
  enabled: boolean;
  delay: number;
  response: string;
}

interface MockSettings {
  defaultDelay: number;
  captureMethod: 'all' | 'ajax' | 'fetch';
}

/**
 * 检查URL是否匹配模式
 * 支持基本通配符和路径参数
 */
export function isUrlMatch(pattern: string, url: string): boolean {
  // 转换为正则表达式安全的字符串
  const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  
  // 替换:param为任意值匹配
  const regexPattern = escapedPattern
    .replace(/(:\\w+)/g, '([^/]+)') // 转换 :param 为 ([^/]+)
    .replace(/\*/g, '.*');          // 转换 * 为 .*
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}

/**
 * 获取所有Mock配置
 */
export async function getMocks(): Promise<MockItem[]> {
  const mockList = await chromeLocalStorage.get('mockList');
  return mockList || [];
}

/**
 * 获取设置
 */
export async function getSettings(): Promise<MockSettings> {
  const settings = await chromeLocalStorage.get('mockSettings');
  return settings || { defaultDelay: 200, captureMethod: 'all' };
}

/**
 * 匹配请求URL是否有对应的Mock
 */
export async function findMatchingMock(url: string, method: string): Promise<MockItem | null> {
  const mockList = await getMocks();
  const mockEnabled = await chromeLocalStorage.get('mockEnabled');
  
  if (!mockEnabled) {
    return null;
  }
  
  const matchedMock = mockList.find(mock => 
    mock.enabled && 
    mock.method.toUpperCase() === method.toUpperCase() && 
    isUrlMatch(mock.url, url)
  );
  
  return matchedMock || null;
}

/**
 * 执行Mock请求，返回模拟的响应
 */
export function executeMock(mock: MockItem): Promise<any> {
  return new Promise((resolve) => {
    try {
      const responseData = JSON.parse(mock.response);
      // 模拟网络延迟
      setTimeout(() => {
        resolve(responseData);
      }, mock.delay);
    } catch (e) {
      resolve({ error: 'Invalid JSON in mock response' });
    }
  });
} 