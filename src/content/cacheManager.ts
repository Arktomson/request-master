// CacheManager.ts
// ===================================================
type Value = unknown;
const KEY = 'request_cache_data';
const HARD_LIMIT = 4 * 1024 * 1024; // 4 MiB per origin  :contentReference[oaicite:7]{index=7}

export class CacheManager {
  /** Map 的迭代顺序 = 最近最少使用 (LRU) 顺序 */
  private map: Map<string, Value> = new Map();
  private maxEntries = 300;
  private dirty = false;
  private saveTimer: number | null = null;
  private saveDelay = 1200; // ms

  constructor() {
    this.restore();
    /** 跨标签页同步 */
    window.addEventListener('storage', this.onExternalChange);
  }

  /* ---------------- 公共 API --------------- */

  has(k: string) {
    return this.map.has(k);
  }

  get<T = Value>(k: string): T | null {
    if (!this.map.has(k)) return null;
    const v = this.map.get(k) as T;
    /** 触碰后移到队尾 */
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }

  set(k: string, v: Value) {
    if (this.map.has(k)) this.map.delete(k);
    /** 超限前先淘汰 */
    if (this.map.size >= this.maxEntries)
      this.evict(Math.ceil(this.maxEntries * 0.2));
    this.map.set(k, v);
    this.markDirty();
  }

  clear() {
    this.map.clear();
    localStorage.removeItem(KEY);
  }

  forceSave() {
    this.flush();
  }

  /* -------------- 内部实现 -------------- */

  private restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, Value>;
      Object.entries(obj).forEach(([k, v]) => this.map.set(k, v));
    } catch {
      /* Ignore corrupted data */
    }
  }

  private flush = () => {
    if (!this.dirty) return;
    this.saveTimer && clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      const json = JSON.stringify(Object.fromEntries(this.map));
      if (json.length > HARD_LIMIT) this.evict(Math.ceil(this.map.size * 0.3));
      console.debug('flush update data', json.length);
      localStorage.setItem(KEY, json);
      this.dirty = false;
    } catch (e) {
      console.error('💥 localStorage save failed:', e);
      /* 配额或序列化失败时再清 50 % */
      this.evict(Math.ceil(this.map.size * 0.5));
      this.flush();
    }
  };

  private markDirty() {
    this.dirty = true;
    this.saveTimer && clearTimeout(this.saveTimer);
    /* 防抖批量写 */
    this.saveTimer = window.setTimeout(this.flush, this.saveDelay);
  }

  private evict(n: number) {
    for (let i = 0; i < n; i++) {
      const oldest = this.map.keys().next().value;
      if (!oldest) break;
      this.map.delete(oldest);
    }
  }

  /** 监听外部 tab 修改 */
  private onExternalChange = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    if (e.newValue === null) {
      this.map.clear();
    } else {
      try {
        const obj = JSON.parse(e.newValue) as Record<string, Value>;
        this.map = new Map(Object.entries(obj));
      } catch {
        /* ignore */
      }
    }
  };
}

/* ---------- 导出单例并做页面卸载持久化 ---------- */
export const cacheManager = new CacheManager();
window.addEventListener('beforeunload', () => cacheManager.forceSave());
