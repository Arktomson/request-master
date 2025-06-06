// vite.mainworld.config.ts
import { defineConfig } from 'vite';
import { resolve } from "path";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/content/ajaxHook.ts',
      name: '__ajaxHookerExtension',      // 随意
      formats: ['iife'],         // ⭐ 产物格式
      fileName: () => 'ajaxHook.js'
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }  // ⭐ 把 import() 全塞进同文件
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
    extensions: [".ts", ".vue", ".js"],
  },
});
