/*
  Monaco Editor worker 初始化
  解决 "You must define MonacoEnvironment.getWorkerUrl or getWorker" 错误
  仅需在项目入口或使用 monaco 之前 import 一次即可
*/
// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      // JSON 语言 worker
      // @ts-ignore
      return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker?worker', import.meta.url), { type: 'module' });
    }
    // 默认编辑器 worker
    // @ts-ignore
    return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker?worker', import.meta.url), { type: 'module' });
  },
}; 