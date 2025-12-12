import * as monaco from 'monaco-editor';

// 自适应高度管理器
export class EditorHeightManager {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private container: HTMLElement;
  private minHeight: number;
  private maxHeight: number;
  private observer: MutationObserver | null = null;
  
  constructor(editor: monaco.editor.IStandaloneCodeEditor, minHeight = 60, maxHeight = 450) {
    this.editor = editor;
    this.container = editor.getDomNode()?.parentElement as HTMLElement;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
    this.setupHeightTracking();
  }
  
  private calculateHeightFromContent(): number {
    const model = this.editor.getModel();
    if (!model) return this.minHeight;
    
    const lineCount = model.getLineCount();
    const lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
    const padding = 20; // 上下padding
    
    const calculatedHeight = lineCount * lineHeight + padding;
    return Math.max(this.minHeight, Math.min(this.maxHeight, calculatedHeight));
  }
  
  private updateHeight(): void {
    const newHeight = this.calculateHeightFromContent();
    
    if (this.container) {
      this.container.style.height = `${newHeight}px`;
    }
    
    const editorDom = this.editor.getDomNode();
    if (editorDom) {
      editorDom.style.height = `${newHeight}px`;
    }
    
    // 重新布局编辑器
    requestAnimationFrame(() => {
      this.editor.layout({
        width: this.container.clientWidth,
        height: newHeight
      });
    });
  }
  
  private setupHeightTracking(): void {
    // 监听编辑器内容变化
    this.editor.onDidChangeModelContent(() => {
      setTimeout(() => this.updateHeight(), 50);
    });
    
    // 初始化高度
    setTimeout(() => this.updateHeight(), 200);
  }
  
  public forceUpdate(): void {
    this.updateHeight();
  }
  
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}