import { defineConfig, type RsbuildConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { resolve } from 'path';
import ElementPlus from 'unplugin-element-plus/rspack';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import express from 'express';
const SSEStream = require('ssestream').default;


class ChromePluginHMR {

  injectHMRCode({
    compilation,
    compiler,
    assetName,
    hmrClientCode,
    judgeHMRCode,
  }: {
    compilation: any;
    compiler: any;
    assetName: string;
    hmrClientCode: string;
    judgeHMRCode: string;
  }) {
    const asset = compilation.assets[assetName];
    if (!asset) return;
    const originalSource = asset.source();
    if (originalSource.includes(judgeHMRCode)) return;
    const newSource = originalSource + '\n' + hmrClientCode;
    compilation.assets[assetName] = new compiler.webpack.sources.RawSource(newSource);
  }
  static compiler: any = null;
  apply(compiler: any) {
    // 保存compiler实例
    ChromePluginHMR.compiler = compiler;

    compiler.hooks.emit.tap('ChromePluginHMR', (compilation: any) => {
      // 只在开发模式下注入，并且确保只注入一次
      if (compiler.options.mode === 'development') {
          const backgroundHmrClientCode = `
// HMR 客户端代码 - 由插件注入
(function() {
  let eventSource = null;
  function initHMRConnection() {
    console.log('🔥 HMR: Initializing SSE connection...');
    
    eventSource = new EventSource('http://localhost:8100/hmr-sse');
    
    eventSource.onerror = () => {
      console.log('🔥 HMR: SSE connection error');
      eventSource.close();
      // initHMRConnection();
    }

  
    eventSource.addEventListener('compiled successfully', () => {
      chrome.runtime.reload();
    });
  }
  chrome.alarms.create('periodicAlarm', { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodicAlarm') {
      console.log('pre eventSource', eventSource);
      if(eventSource.readyState === EventSource.OPEN) {
        eventSource.close();
      }
      console.log('🔥 HMR: Periodic alarm triggered');
      initHMRConnection();
    }
  });
  // 启动热更新连接
  try {
    initHMRConnection();
  } catch (error) {
    console.error('🔥 HMR: Failed to initialize HMR connection:', error);
  }
})();
          `;
          this.injectHMRCode({
            compilation,
            compiler,
            assetName: 'src/background/index.js',
            hmrClientCode: backgroundHmrClientCode,
            judgeHMRCode: '// HMR 客户端代码 - 由插件注入',
          });
        }
          // 检查是否已经包含HMR代码，避免重复注入
          const contentHmrClientCode = `
// HMR 客户端代码 - 由插件注入
// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   if (message.type === 'reload') {
//     await chrome.runtime.reload();
//     sendResponse({ success: true });
//   }
// });
`;

          // 将HMR代码添加到background脚本的末尾
          this.injectHMRCode({
            compilation,
            compiler,
            assetName: 'src/content/index.js',
            hmrClientCode: contentHmrClientCode,
            judgeHMRCode: '// HMR 客户端代码 - 由插件注入',
          });

        },
    );
  }
}

export default defineConfig(({ env, envMode, command }) => {
  const isDev = env === 'development';
  const isProd = env === 'production';

  console.log(env, envMode, command);
  return {
    plugins: [pluginVue(), pluginSass()],

    // 多入口配置
    source: {
      entry: {
        // 主应用入口 - mockPanel
        'src/mockPanel/index': resolve(__dirname, 'src/mockPanel/index.ts'),
        'src/sider/index': resolve(__dirname, 'src/sider/index.ts'),
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
      sourceMap: isDev,
      // 根据环境设置输出目录
      distPath: {
        root: isProd ? 'request-master-prod' : 'request-master-dev',
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
          'src/mockPanel/index': './src/mockPanel/index.html',
          'src/sider/index': './src/sider/index.html',
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
      setupMiddlewares: (middlewares, _server) => {
        const app = express();
        const savedCompiler = ChromePluginHMR.compiler;
        let currentSSEStream: any = null;
         let hooksRegistered = false; // 防止重复注册hooks
        
        // 处理OPTIONS预检请求
        app.options('/hmr-sse', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
          res.setHeader('Access-Control-Allow-Credentials', 'false');
          res.status(200).end();
        });
        
        
        app.get('/hmr-sse', (req, res, next) => {
          console.log('🔥 HMR: New SSE connection');
          
          // 设置CORS头部，允许跨域访问  
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
          res.setHeader('Access-Control-Allow-Credentials', 'false');
          
          const sseStream = new SSEStream(req);
          sseStream.pipe(res);

          // 替换当前连接（确保只有一个活跃连接）
          if (currentSSEStream) {
            console.log('🔥 HMR: Replacing existing SSE connection');
            try {
              currentSSEStream.unpipe();
            } catch (e) {
              // 忽略清理错误
            }
          }
          currentSSEStream = sseStream;

          // 只注册一次compiler hooks
          if (!hooksRegistered && savedCompiler) {
            savedCompiler.hooks.done.tap('ChromeHMRReload', () => {
              console.log('🔥 HMR: Build completed, notifying client...');
              if (currentSSEStream) {
                try {
                  currentSSEStream.write(
                    {
                      event: 'compiled successfully',
                      data: {
                        type: 'reload',
                        message: 'reload extension',
                      },
                    },
                    'utf-8',
                    (err) => {
                      if (err) {
                        console.error('🔥 HMR: Failed to send reload signal:', err);
                        currentSSEStream = null;
                      }
                    }
                  );
                } catch (error) {
                  console.error('🔥 HMR: SSE write error:', error);
                  currentSSEStream = null;
                }
              }
            });
            hooksRegistered = true;
            console.log('🔥 HMR: Compiler hooks registered');
          }

          res.on('close', () => {
            console.log('🔥 HMR: SSE connection closed');
            if (currentSSEStream === sseStream) {
              currentSSEStream = null;
            }
            sseStream.unpipe(res);
          });

          res.on('error', (error: any) => {
            console.error('🔥 HMR: SSE connection error:', error);
            if (currentSSEStream === sseStream) {
              currentSSEStream = null;
            }
          });
        });

        middlewares.unshift(app);
      },
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
          }),
          new MonacoWebpackPlugin({
            // 可选：只打包需要的语言和功能，减小体积
            languages: ['json'],
          }),
          // 添加我们的HMR插件
          new ChromePluginHMR()
        );
        config.stats = {
          preset: 'normal', // 基础信息
          colors: true, // 彩色输出
          assets: true, // ⬅️ 关键：列出所有文件 + size
          modules: false, // 不列模块
          entrypoints: true, // 显示每个入口包含哪些文件
          performance: true, // 报告超过 performance.hints 阈值的文件
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
      removeConsole: isProd,
    },
  };
}) as RsbuildConfig;
