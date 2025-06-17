import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    pluginVue(),
    pluginSass(),
    // pluginTypeCheck(), // 暂时禁用类型检查
  ],

  // 多入口配置
  source: {
    entry: {
      // 主应用入口 - sidebar
      sidebar: resolve(__dirname, 'src/sidebar/index.ts'),
      // popup 入口
      popup: resolve(__dirname, 'src/popup/main.ts'),
      // options 入口
      options: resolve(__dirname, 'src/options/main.ts'),
      // background 入口
      background: resolve(__dirname, 'src/background/index.ts'),
      // content scripts 入口
      'content/index': resolve(__dirname, 'src/content/index.ts'),
      'content/iframeSidebar': resolve(__dirname, 'src/content/iframeSidebar.ts'),
      // ajaxHook 入口 - 配置为IIFE格式
      ajaxHook: {
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
    // 文件名配置
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
        sidebar: './src/sidebar/index.html',
        popup: './src/popup/index.html',
        options: './src/options/index.html',
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

      // 禁用ajaxHook的代码分割，确保它是一个独立的文件
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // 确保ajaxHook不被分割
        ajaxHook: {
          name: 'ajaxHook',
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
    // 代码分割配置
    chunkSplit: {
      strategy: 'split-by-experience',
      // 确保ajaxHook不被分包
      override: {
        cacheGroups: {
          ajaxHook: {
            test: /ajaxHook/,
            name: 'ajaxHook',
            chunks: 'all',
            enforce: true,
            priority: 100,
          },
        },
      },
    },
  },
}); 