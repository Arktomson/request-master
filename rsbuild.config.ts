import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// 修改 manifest 的插件
function appendMainWorldPlugin() {
  return {
    name: 'append-main-world',
    setup(api: any) {
      api.onAfterBuild(() => {
        const outputPath = api.context.distPath;
        const manifestPath = path.join(outputPath, 'manifest.json');

        try {
          if (fs.existsSync(manifestPath)) {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            manifest.content_scripts = manifest.content_scripts || [];
            manifest.content_scripts.push({
              matches: ['<all_urls>'],
              js: ['ajaxHook.js'],
              run_at: 'document_start',
              all_frames: false,
              world: 'MAIN',
            });

            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.debug('✅ 成功修改 manifest.json');
          } else {
            console.warn('⚠️ manifest.json 文件不存在于:', manifestPath);
          }
        } catch (error) {
          console.error('❌ 修改 manifest.json 失败:', error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    pluginVue(),
    pluginSass(),
    // pluginTypeCheck(), // 暂时禁用类型检查
    appendMainWorldPlugin(),
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
      // ajaxHook 入口 (来自 vite.mainworld.config.ts)
      ajaxHook: resolve(__dirname, 'src/content/ajaxHook.ts'),
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

      // ajaxHook 的特殊处理 - 输出为 IIFE 格式且不进行代码分割
      config.output.filename = (pathData: any) => {
        if (pathData.chunk && pathData.chunk.name === 'ajaxHook') {
          return 'ajaxHook.js';
        }
        return '[name].js';
      };

      // 为 ajaxHook 设置特殊的库输出格式
      if (config.optimization?.splitChunks) {
        config.optimization.splitChunks.cacheGroups = {
          ...config.optimization.splitChunks.cacheGroups,
          ajaxHook: {
            name: 'ajaxHook',
            test: /ajaxHook/,
            chunks: 'all',
            enforce: true,
            reuseExistingChunk: false,
          },
        };
      }

      return config;
    },
  },

  performance: {
    // 代码分割配置
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
}); 