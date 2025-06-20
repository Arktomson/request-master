// 通用单编辑器 Hook，用于在 Vue 组合式 API 中快速接入 Monaco Editor
// 用法示例：
// const { editorRef } = useMonacoEditor({
//   value: responseContent,
//   language: 'json',
//   readOnly,
//   debounceMs: 800,
//   onValidJson: (parsed) => emit('save-response', parsed),
// });

import { ref, watch, onMounted, onBeforeUnmount, Ref, ComputedRef } from 'vue';
import * as monaco from 'monaco-editor';
import { debounce } from 'lodash-es';
import '@/utils/monacoWorker';

export interface UseMonacoEditorOptions {
  /** 编辑器绑定值（外部响应式） */
  value: Ref<string> | ComputedRef<string>;
  /** 是否只读 */
  readOnly?: Ref<boolean> | ComputedRef<boolean>;
  /** 语言类型，默认 json */
  language?: string;
  /** 防抖毫秒，默认 1000 */
  debounceMs?: number;
  /** 当语言为 json 且内容可解析时触发 */
  onValidJson?: (parsed: any) => void;
  /** 通用内容变更回调（每次防抖后触发） */
  onChange?: (val: string) => void;
}

export function useMonacoEditor(options: UseMonacoEditorOptions) {
  const {
    value,
    readOnly,
    language = 'json',
    debounceMs = 1000,
    onValidJson,
    onChange,
  } = options;

  // 容器 DOM 引用
  const editorRef = ref<HTMLElement | null>(null);

  // Monaco 实例
  let editor: monaco.editor.IStandaloneCodeEditor | null = null;

  /** 创建编辑器 */
  const createEditor = () => {
    if (editor || !editorRef.value) return;

    editor = monaco.editor.create(editorRef.value, {
      value: value.value || '',
      language,
      theme: 'vs',
      readOnly: readOnly ? readOnly.value : false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // 内容变化（防抖）
    const handleChange = debounce(() => {
      if (!editor) return;
      const currentVal = editor.getValue();
      onChange?.(currentVal);

      if (language === 'json' && onValidJson) {
        try {
          const parsed = JSON.parse(currentVal);
          onValidJson(parsed);
        } catch {
          // ignore json parse error
        }
      }
    }, debounceMs);

    editor.onDidChangeModelContent((e) => {
      if (e.isFlush) return; // 忽略编程式 setValue
      handleChange();
    });
  };

  /** 销毁 */
  const disposeEditor = () => {
    editor?.dispose();
    editor = null;
  };

  // 外部 value -> 编辑器
  watch(value, (v) => {
    if (editor && editor.getValue() !== v) {
      editor.setValue(v);
    }
  });

  // 外部 readOnly -> 编辑器
  if (readOnly) {
    watch(readOnly, (ro) => {
      if (editor) {
        editor.updateOptions({ readOnly: ro });
      }
    });
  }

  onMounted(createEditor);
  onBeforeUnmount(disposeEditor);

  return {
    editorRef,
    createEditor,
    disposeEditor,
    /** 直接暴露 editor 供高级场景使用 */
    get editor() {
      return editor;
    },
  };
} 