// CacheManager.ts - 简化版
// ===================================================
import localforage from 'localforage';

type Value = unknown;

const STORE_NAME = 'request_cache_store';

export class CacheManager {
  /** 内存中的缓存映射 */
  private memoryCache: Map<string, Value> = new Map();
  private maxEntries = 1000; // IndexedDB 可以存储更多
  private pendingOperations = new Set<Promise<any>>(); // 跟踪待处理操作
  private store: LocalForage;

  constructor() {
    // 初始化 localForage 实例
    this.store = localforage.createInstance({
      name: 'request-master',
      storeName: STORE_NAME,
      driver: [
        localforage.INDEXEDDB,
        localforage.WEBSQL,
        localforage.LOCALSTORAGE
      ],
      description: 'Request cache data storage'
    });
    
    this.restore();
    this.setupCrossTabSync();
  }

  /* ---------------- 公共 API --------------- */

  has(k: string): boolean {
    return this.memoryCache.has(k);
  }

  get<T = Value>(k: string): T | null {
    if (!this.memoryCache.has(k)) return null;
    return this.memoryCache.get(k) as T;
  }

  set(k: string, v: Value): void {
    // 检查容量并淘汰
    if (this.memoryCache.size >= this.maxEntries) {
      this.evict(Math.ceil(this.maxEntries * 0.2));
    }
    
    // 更新内存缓存
    this.memoryCache.set(k, v);
    
    // 异步保存到 IndexedDB
    const saveOperation = this.saveItem(k, v);
    this.pendingOperations.add(saveOperation);
    
    saveOperation.finally(() => {
      this.pendingOperations.delete(saveOperation);
    });
  }

  async clear(): Promise<void> {
    // 等待所有待处理操作完成
    await Promise.all(this.pendingOperations);
    
    // 清空内存缓存
    this.memoryCache.clear();
    
    try {
      // 清空 IndexedDB
      await this.store.clear();
      this.broadcastUpdate('clear');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async forceSave(): Promise<void> {
    // 等待所有待处理操作完成
    await Promise.all(this.pendingOperations);
  }

  /* -------------- 内部实现 -------------- */

  private async restore(): Promise<void> {
    try {
      // 获取所有键
      const keys = await this.store.keys();
      
      if (keys.length === 0) {
        // 没有缓存数据，尝试从 localStorage 迁移
        await this.migrateFromLocalStorage();
        return;
      }
      
      // 并行加载所有缓存项
      const loadPromises = keys.map(async (key) => {
        try {
          const value = await this.store.getItem(key);
          if (value !== null && value !== undefined) {
            this.memoryCache.set(key, value);
          }
        } catch (error) {
          console.error(`Failed to load cache item ${key}:`, error);
        }
      });
      
      await Promise.all(loadPromises);
      console.log(`Restored ${this.memoryCache.size} cache items`);
    } catch (error) {
      console.error('Failed to restore cache:', error);
    }
  }
  
  /** 从 localStorage 迁移数据到 IndexedDB */
  private async migrateFromLocalStorage(): Promise<void> {
    try {
      const raw = localStorage.getItem('request_cache_data');
      if (!raw) return;
      
      console.log('Migrating cache data from localStorage to IndexedDB...');
      const obj = JSON.parse(raw) as Record<string, any>;
      
      // 将每个项单独保存
      const savePromises = Object.entries(obj).map(async ([key, value]) => {
        await this.store.setItem(key, value);
        this.memoryCache.set(key, value);
      });
      
      await Promise.all(savePromises);
      
      // 删除 localStorage 中的旧数据
      localStorage.removeItem('request_cache_data');
      console.log(`Migration completed: ${Object.keys(obj).length} items`);
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
    }
  }

  /** 保存单个项到 IndexedDB */
  private async saveItem(key: string, value: Value): Promise<void> {
    try {
      await this.store.setItem(key, value);
      this.broadcastUpdate('set', key);
    } catch (error) {
      console.error(`Failed to save cache item ${key}:`, error);
      throw error;
    }
  }
  
  /** 删除单个项 */
  private async removeItem(key: string): Promise<void> {
    try {
      await this.store.removeItem(key);
      this.memoryCache.delete(key);
      this.broadcastUpdate('delete', key);
    } catch (error) {
      console.error(`Failed to remove cache item ${key}:`, error);
    }
  }

  /** 淘汰最旧的缓存项（基于 Map 的插入顺序，FIFO） */
  private evict(n: number): void {
    const keysToRemove: string[] = [];
    let count = 0;
    
    // Map 的迭代器按插入顺序返回键
    for (const key of this.memoryCache.keys()) {
      if (count >= n) break;
      keysToRemove.push(key);
      count++;
    }
    
    // 删除这些项
    keysToRemove.forEach(key => {
      this.memoryCache.delete(key);
      // 异步删除 IndexedDB 中的项
      this.removeItem(key);
    });
    
    console.log(`Evicted ${keysToRemove.length} cache items`);
  }

  /** 设置跨标签页同步 */
  private setupCrossTabSync(): void {
    // 使用 BroadcastChannel 进行跨标签页通信
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('request-cache-sync');
      
      channel.onmessage = async (event) => {
        if (event.data.type === 'cache-updated') {
          const { action, key } = event.data;
          
          switch (action) {
            case 'set':
              // 加载特定项
              if (key) {
                try {
                  const value = await this.store.getItem(key);
                  if (value !== null && value !== undefined) {
                    this.memoryCache.set(key, value);
                  }
                } catch (error) {
                  console.error(`Failed to sync cache item ${key}:`, error);
                }
              }
              break;
              
            case 'delete':
              // 删除特定项
              if (key) {
                this.memoryCache.delete(key);
              }
              break;
              
            case 'clear':
              // 清空所有
              this.memoryCache.clear();
              break;
          }
        }
      };
    }
  }
  
  /** 广播缓存更新 */
  private broadcastUpdate(action: 'set' | 'delete' | 'clear', key?: string): void {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('request-cache-sync');
      channel.postMessage({ 
        type: 'cache-updated',
        action,
        key 
      });
      channel.close();
    }
  }
}

/* ---------- 导出单例并做页面卸载持久化 ---------- */
export const cacheManager = new CacheManager();
window.addEventListener('beforeunload', () => {
  cacheManager.forceSave();
});

