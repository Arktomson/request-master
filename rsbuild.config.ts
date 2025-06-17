import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    pluginVue(),
    pluginSass(),
  ],

  // 多入口配置
  source: {
    entry: {
      // 主应用入口 - sidebar
      'src/sidebar/index': resolve(__dirname, 'src/sidebar/index.ts'),
      // popup 入口 - 修改为 index 以匹配 manifest.json
      'src/popup/index': resolve(__dirname, 'src/popup/main.ts'),
      // options 入口 - 修改为 index 以匹配 manifest.json
      'src/options/index': resolve(__dirname, 'src/options/main.ts'),
      // background 入口
      'src/background/index': resolve(__dirname, 'src/background/index.ts'),
      // content scripts 入口
      'src/content/index': resolve(__dirname, 'src/content/index.ts'),
      'src/content/iframeSidebar': resolve(__dirname, 'src/content/iframeSidebar.ts'),
      // ajaxHook 入口 - 配置为IIFE格式
      'src/content/ajaxHook': {
        import: resolve(__dirname, 'src/content/ajaxHook.ts'),
        library: {
          type: 'iife',
          name: 'AjaxHook', // 可选：为IIFE指定全局变量名
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  output: {
    // 根据环境设置输出目录
    distPath: {
      root: process.env.NODE_ENV === 'production' ? 'dist-prod' : 'dist',
    },
    // 清理输出目录
    cleanDistPath: true,
    // 文件名配置 - 保持目录结构，JS 文件直接输出到对应 src 目录
    filename: {
      js: '[name].js',
      css: '[name].css',
    },
    // 资源文件名配置
    assetPrefix: './',
    // 生产环境压缩配置
    minify: process.env.NODE_ENV === 'production',
  },

  html: {
    template: ({ entryName }) => {
      // 为不同入口指定不同的 HTML 模板
      const templateMap: Record<string, string> = {
        'src/sidebar/index': './src/sidebar/index.html',
        'src/popup/index': './src/popup/index.html',
        'src/options/index': './src/options/index.html',
      };
      return templateMap[entryName];
    },
  },

  dev: {
    // 开发服务器配置
    hmr: true,
    liveReload: true,
  },

  server: {
    port: 3000,
    open: false,
  },

  tools: {
    htmlPlugin: (config, { entryName }) => {
      // 只为这些入口生成 HTML
      const htmlEntries = ['src/sidebar/index', 'src/popup/index', 'src/options/index'];
      if (!htmlEntries.includes(entryName)) {
        return false; // 不生成 HTML
      }
      // 禁用默认的多入口 HTML
      if (entryName === 'index') {
        return false;
      }
      return config;
    },
    rspack: (config: any) => {
      // 复制 manifest.json 和静态资源
      config.plugins.push(
        new (require('@rspack/core')).CopyRspackPlugin({
          patterns: [
            {
              from: 'manifest.json',
              to: 'manifest.json',
            },
            {
              from: 'src/assets',
              to: 'src/assets',
            },
          ],
        })
      );

      // 修改输出配置，让 JS 文件直接输出到 src 对应目录
      config.output = config.output || {};
      config.output.path = resolve(__dirname, process.env.NODE_ENV === 'production' ? 'dist-prod' : 'dist');
      config.output.filename = '[name].js';
      
      // 禁用默认的 static 目录分组
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      config.optimization.splitChunks.cacheGroups = {
        default: false,
        vendors: false,
        // 确保ajaxHook不被分割
        ajaxHook: {
          name: 'src/content/ajaxHook',
          test: /ajaxHook/,
          chunks: 'all',
          enforce: true,
          priority: 100,
        },
      };

      return config;
    },
  },

  performance: {
    // 禁用代码分割，确保文件直接输出到对应目录
    chunkSplit: {
      strategy: 'all-in-one',
    },
  },
}); 