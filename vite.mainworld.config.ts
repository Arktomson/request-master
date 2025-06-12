// vite.mainworld.config.ts
import { defineConfig } from 'vite';
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  return {
    build: {
      emptyOutDir: true,
      // 根据环境设置 sourcemap
      sourcemap: isDev, // 开发环境开启，生产环境关闭
      lib: {
        entry: 'src/content/ajaxHook.ts',
        name: '__ajaxHookerExtension',      // 随意
        formats: ['iife'],         // ⭐ 产物格式
        fileName: () => 'ajaxHook.js'
      },
      rollupOptions: {
        output: { inlineDynamicImports: true }  // ⭐ 把 import() 全塞进同文件
      },
      // 开发环境特定配置
      ...(isDev && {
        minify: false,
        sourcemap: true,
      }),
      // 生产环境特定配置
      ...(isProd && {
        sourcemap: false, // 生产环境关闭
        minify: 'terser', // 使用terser进行压缩
        terserOptions: {
          compress: {
            drop_console: true, // 移除console.log, console.error等
            drop_debugger: true, // 移除debugger
          },
        },
      }),
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
      extensions: [".ts", ".vue", ".js"],
    },
    // 根据环境设置不同的变量
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
  };
});
