import { defineConfig, type RsbuildConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { resolve } from 'path';
import ElementPlus from 'unplugin-element-plus/rspack';

export default (defineConfig(({ env, envMode, command }) => {
  const isDev = env === 'development';
  const isProd = env === 'production';

  console.log(env, envMode, command);
  return {
    plugins: [pluginVue(), pluginSass()],

    // 多入口配置
    source: {
      entry: {
        // 主应用入口 - sidebar
        'src/sidebar/index': resolve(__dirname, 'src/sidebar/index.ts'),
        // popup 入口 - 修改为 index 以匹配 manifest.json
        'src/popup/index': resolve(__dirname, 'src/popup/index.ts'),
        // options 入口 - 修改为 index 以匹配 manifest.json
        'src/options/index': resolve(__dirname, 'src/options/index.ts'),
        // background 入口
        'src/background/index': {
          import: resolve(__dirname, 'src/background/index.ts'),
          html: false,
        },
        // content scripts 入口
        'src/content/index': {
          import: resolve(__dirname, 'src/content/index.ts'),
          html: false,
        },
        'src/content/iframeSidebar': {
          import: resolve(__dirname, 'src/content/iframeSidebar.ts'),
          html: false,
        },
        // ajaxHook 入口 - 配置为IIFE格式（不暴露全局变量）
        'src/content/ajaxHook': {
          import: resolve(__dirname, 'src/content/ajaxHook.ts'),
          library: {
            type: 'iife',
            // 不设置 name，生成匿名 IIFE，不暴露全局变量
          },
          html: false,
        },
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
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
        root: isProd ? 'dist-prod' : 'dist',
      },
      // 清理输出目录
      cleanDistPath: true,
      // 文件名配置 - 保持目录结构，JS 文件直接输出到对应 src 目录
      filename: {
        js: '[name].js',
        css: '[name].css',
      },
      // 资源文件名配置 - 让构建工具自动处理路径
      // 生产环境压缩配置
      minify: isProd,
      assetPrefix: 'auto',
    },

    html: {
      template: ({ entryName }) => {
        // 为不同入口指定不同的 HTML 模板
        const templateMap: Record<string, string> = {
          'src/sidebar/index': './src/sidebar/index.html',
          'src/popup/index': './src/popup/index.html',
          'src/options/index': './src/options/index.html',
        };
        return templateMap[entryName] ?? null;
      },
    },

    dev: {
      // 开发服务器配置，浏览器插件环境，不开启热更新，直接写入磁盘
      hmr: false,
      liveReload: false,
      assetPrefix: 'auto',
      writeToDisk: true,
    },

    server: {
      port: 8100,
      open: false,
    },

    tools: {
      rspack: (config: any) => {
        // 复制 manifest.json 和静态资源
        config.plugins.push(
          new (require('@rspack/core').CopyRspackPlugin)({
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
          }),
          ElementPlus({
            include: [/\.vue$/, /\.vue\?vue/, /\.md$/, /\.vue\.[tj]sx?\?vue/],
          })
        );
        config.stats = {
          preset: 'normal', // 基础信息
          colors: true, // 彩色输出
          assets: true, // ⬅️ 关键：列出所有文件 + size
          modules: false, // 不列模块
          entrypoints: true, // 显示每个入口包含哪些文件
          performance: true, // 报告超过 performance.hints 阈值的文件
          assetFilter: (assetName) => !assetName.endsWith('.map'), // 可选：别把 .map 也打印
        };
        // 确保 content scripts 等特殊入口点能正确输出文件名
        config.output.filename = '[name].js';
        return config;
      },
    },

    performance: {
      // 禁用代码分割，确保文件直接输出到对应目录
      chunkSplit: {
        strategy: 'all-in-one',
      },
    },
  }
}) as RsbuildConfig);