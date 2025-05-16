/**
 * IndexDB 操作封装
 */
class RequestCacheDB {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private storeName: string;
  private version: number;

  /**
   * 构造函数
   * @param dbName 数据库名称
   * @param storeName 对象仓库名称
   * @param version 数据库版本
   */
  constructor(
    dbName: string = "requestCacheDB",
    storeName: string = "requests",
    version: number = 1
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  /**
   * 打开数据库
   * @returns Promise<IDBDatabase>
   */
  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = () => {
        const db = request.result;

        // 如果对象仓库不存在，则创建
        if (!db.objectStoreNames.contains(this.storeName)) {
          // 创建对象仓库，使用自增键
          const store = db.createObjectStore(this.storeName, {
            keyPath: "id",
            autoIncrement: true,
          });

          // 创建索引方便查询
          store.createIndex("url", "url", { unique: false });
          store.createIndex("method", "method", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("contentType", "contentType", { unique: false });
          store.createIndex("domain", "domain", { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 添加拦截的请求数据
   * @param data 请求数据对象
   * @returns Promise<number> 返回添加的记录ID
   */
  async add(data: any): Promise<number> {
    const db = await this.open();

    // 添加时间戳
    const requestData = {
      ...data,
      timestamp: new Date().getTime(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(requestData);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 获取指定ID的请求数据
   * @param id 请求ID
   * @returns Promise<any>
   */
  async get(id: number): Promise<any> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 更新请求数据
   * @param data 请求数据对象
   * @returns Promise<void>
   */
  async update(data: any): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 删除指定ID的请求数据
   * @param id 请求ID
   * @returns Promise<void>
   */
  async delete(id: number): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据URL查询请求数据
   * @param url 请求URL
   * @returns Promise<any[]>
   */
  async queryByUrl(url: string): Promise<any[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("url");
      const request = index.getAll(IDBKeyRange.only(url));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据域名查询请求数据
   * @param domain 域名
   * @returns Promise<any[]>
   */
  async queryByDomain(domain: string): Promise<any[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      
      // 使用索引获取指定域名的所有记录
      const index = store.index("domain");
      const request = index.getAll(IDBKeyRange.only(domain));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有请求数据
   * @param limit 限制返回的数量，默认100条
   * @param offset 跳过的记录数，默认0
   * @returns Promise<any[]>
   */
  async getAll(limit: number = 100, offset: number = 0): Promise<any[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      // 使用时间戳索引并倒序排列，获取最新的记录
      const index = store.index("timestamp");
      const request = index.openCursor(null, "prev");

      const results: any[] = [];
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        // 如果有游标且还没到达限制数量
        if (cursor) {
          // 实现分页 - 跳过offset数量的记录
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }
          
          // 添加当前记录
          if (results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            // 已经获取足够的记录
            resolve(results);
          }
        } else {
          // 游标为空，已遍历所有记录
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 清空所有请求数据
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 获取数据库统计信息
   * @returns Promise<{count: number}>
   */
  async getStats(): Promise<{ count: number }> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        resolve({
          count: countRequest.result,
        });
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default RequestCacheDB;
