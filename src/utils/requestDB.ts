// 基于 `idb` 的通用 IndexedDB 工具，集中管理请求记录与 Mock 规则
// 若未安装依赖，请执行：pnpm add idb  (或 npm i idb)

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { AjaxHookRequest } from '@/types/ajaxHook'

/* ---------- 类型声明 ---------- */
export interface RequestRecord {
  id?: number
  url: string
  method: string
  params?: any
  response?: any
  cacheKey?: string
  headers?: Record<string, string>
  time: number
  isMock?: boolean
  type?: AjaxHookRequest['type']
}

export interface MockRule {
  id?: number
  cacheKey: string
  response: any
  enabled: boolean
  url: string
  method: string
}

interface RCDB extends DBSchema {
  request_records: {
    key: number
    value: RequestRecord
    indexes: { by_time: number; by_cacheKey: string }
  }
  mock_rules: {
    key: number
    value: MockRule
    indexes: { by_cacheKey: string }
  }
}

/* ---------- 单例 DB ---------- */
let dbPromise: Promise<IDBPDatabase<RCDB>> | null = null

function getDB () {
  if (!dbPromise) {
    dbPromise = openDB<RCDB>('request-master-db', 1, {
      upgrade (db) {
        if (!db.objectStoreNames.contains('request_records')) {
          const r = db.createObjectStore('request_records', { keyPath: 'id', autoIncrement: true })
          r.createIndex('by_time', 'time')
          r.createIndex('by_cacheKey', 'cacheKey')
        }
        if (!db.objectStoreNames.contains('mock_rules')) {
          const m = db.createObjectStore('mock_rules', { keyPath: 'id', autoIncrement: true })
          m.createIndex('by_cacheKey', 'cacheKey')
        }
      }
    })
  }
  return dbPromise
}

/* ---------- API：请求记录 ---------- */
export const RequestTable = {
  async add (rec: Omit<RequestRecord, 'id'>) {
    return (await getDB()).add('request_records', {
      ...rec,
      time: rec.time ?? Date.now()
    })
  },

  async latest (limit = 100, offset = 0) {
    const db = await getDB()
    const tx = db.transaction('request_records')
    const idx = tx.store.index('by_time')
    const res: RequestRecord[] = []
    let skipped = 0
    for await (const cursor of idx.iterate(null, 'prev')) {
      if (skipped < offset) { skipped++; continue }
      if (res.length >= limit) break
      res.push(cursor.value)
    }
    await tx.done
    return res
  },

  getByCacheKey: async (key: string) =>
    (await getDB()).getFromIndex('request_records', 'by_cacheKey', key),

  clear: async () => (await getDB()).clear('request_records')
}

/* ---------- API：Mock 规则 ---------- */
export const MockTable = {
  add: async (m: Omit<MockRule, 'id'>) => (await getDB()).add('mock_rules', m),
  update: async (m: MockRule) => (await getDB()).put('mock_rules', m),
  delete: async (id: number) => (await getDB()).delete('mock_rules', id),
  findByCacheKey: async (key: string) =>
    (await getDB()).getFromIndex('mock_rules', 'by_cacheKey', key),
  all: async () => (await getDB()).getAll('mock_rules')
}

export default { getDB, RequestTable, MockTable } 