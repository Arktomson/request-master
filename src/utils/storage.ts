// Storage类封装
class Storage {
  // 获取存储中的数据
  static get(
    keys: string | string[],
    callback?: (items: { [key: string]: any }) => void
  ): Promise<any> | void {
    if (callback) {
      chrome.storage.local.get(keys, callback)
      return;
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (items) => {
        if (Array.isArray(keys)) {
          resolve(items);
        } else {
          resolve(items[keys]);
        }
      });
    });
  }

  // 检查键是否存在
  static has(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        resolve(items[key] !== undefined);
      });
    });
  }

  // 设置存储中的数据
  static set(
    items: { [key: string]: any },
    callback?: () => void
  ): Promise<void> | void {
    if (callback) {
      chrome.storage.local.set(items, callback);
      return;
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    });
  }

  // 监听存储变化
  static onChange(
    callback: (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => void
  ) {
    chrome.storage.onChanged.addListener(callback);
  }
}

export default Storage;

