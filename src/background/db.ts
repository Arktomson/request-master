import { CacheItem } from './types';

// 存储缓存对象，使用IndexedDB索引数据库接口
export const cacheDb = {
  name: "httpCacheExtension",
  version: 1,
  storeName: "httpCache",
  db: null as IDBDatabase | null,

  // 初始化数据库
  init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.name, this.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // 创建对象存储并设置索引
          const store = db.createObjectStore(this.storeName, {
            keyPath: "url",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("contentType", "contentType", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log("缓存数据库初始化成功");
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error(
          "缓存数据库初始化失败:",
          (event.target as IDBOpenDBRequest).error
        );
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  // 存储缓存项
  async set(item: CacheItem): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        console.log(`缓存已保存: ${item.url}`);
        resolve();
      };

      request.onerror = (event) => {
        console.error("缓存保存失败:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  },

  // 获取缓存项
  async get(url: string): Promise<CacheItem | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as CacheItem;
        resolve(result || null);
      };

      request.onerror = (event) => {
        console.error("缓存读取失败:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  },

  // 删除缓存项
  async delete(url: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);

      request.onsuccess = () => {
        console.log(`缓存已删除: ${url}`);
        resolve();
      };

      request.onerror = (event) => {
        console.error("缓存删除失败:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  },

  // 清除所有缓存
  async clear(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log("所有缓存已清除");
        resolve();
      };

      request.onerror = (event) => {
        console.error("缓存清除失败:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  },

  // 获取所有缓存
  async getAll(): Promise<CacheItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as CacheItem[]);
      };

      request.onerror = (event) => {
        console.error("获取所有缓存失败:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  },
};
