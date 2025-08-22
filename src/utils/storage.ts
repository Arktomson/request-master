// Storage类封装
class Storage {
  public type: "local" | "sync" | "managed" | "session";
  constructor(type: "local" | "sync" | "managed" | "session") {
    this.type = type;
  }

  // 获取存储中的数据
  getAll(): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      chrome.storage[this.type].get(null, (items) => {
        resolve(items);
      });
    });
  }
  get(
    keys: string | string[],
    callback?: (items: { [key: string]: any }) => void
  ): Promise<any> | void {
    if (callback) {
      chrome.storage[this.type].get(keys, callback);
      return;
    }

    return new Promise((resolve) => {
      chrome.storage[this.type].get(keys, (items = {}) => {
        if (Array.isArray(keys)) {
          resolve(items);
        } else {
          resolve(items[keys]);
        }
      });
    });
  }

  // 检查键是否存在
  has(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage[this.type].get(key, (items) => {
        resolve(items[key] !== undefined);
      });
    });
  }

  // 设置存储中的数据
  set(
    items: { [key: string]: any },
    callback?: () => void
  ): Promise<void> | void {
    if (callback) {
      chrome.storage[this.type].set(items, callback);
      return;
    }

    return new Promise((resolve) => {
      chrome.storage[this.type].set(items, () => {
        resolve();
      });
    });
  }

  // 监听存储变化
  onChange(
    callback: (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => void,
    keys?: string | string[]
  ) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      // 如果指定了keys，则只在这些key变化时才调用回调
      if (keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        const filteredChanges: { [key: string]: chrome.storage.StorageChange } =
          {};
        let hasChanges = false;

        // 过滤出指定的key的变化
        for (const key of keysArray) {
          if (changes[key] && areaName === this.type) {
            filteredChanges[key] = changes[key];
            hasChanges = true;
          }
        }

        // 只有当有指定的key发生变化时才调用回调
        if (hasChanges) {
          callback(filteredChanges, areaName);
        }
      } else {
        // 如果没有指定keys，则监听所有变化（但仍然只在指定的存储类型中）
        if (areaName === this.type) {
          callback(changes, areaName);
        }
      }
    });
  }
}

export default Storage;
