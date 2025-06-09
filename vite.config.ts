import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
// 导入manifest并使用类型声明
import manifestJson from './manifest.json';
import ElementPlus from 'unplugin-element-plus/vite';
// https://vitejs.dev/config/

function appendMainWorld() {
  return {
    name: 'append-main-world',
    writeBundle: {
      order: 'post' as const,
      handler(options, bundle) {
        const outDir = options.dir || 'dist';
        const manifestPath = path.join(outDir, 'manifest.json');

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
      },
    },
  };
}
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  // 确定输出目录
  const outDir = isDev ? 'dist' : 'dist-prod';
  return {
    plugins: [
      vue(),
      // 使用crx插件的配置
      crx({
        manifest: manifestJson,
        browser: 'chrome',
      }),
      ElementPlus(),
      viteCommonjs(),
      appendMainWorld(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
      extensions: ['.ts', '.vue', '.js'],
    },
    build: {
      // 根据环境设置输出目录
      outDir,
      // Vite自带的清空目录选项
      emptyOutDir: false,
      // 根据环境设置 sourcemap
      sourcemap: isDev, // 开发环境开启，生产环境关闭
      // 配置入口点
      rollupOptions: {
        input: {
          sidebar: resolve(__dirname, 'src/sidebar/index.html'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return '[name].js';
          },
          chunkFileNames: (chunkInfo) => {
            // 处理特殊文件名
            if (chunkInfo.name.startsWith('_')) {
              return `vendor-${Date.now()}.js`;
            }
            return '[name].js';
          },
          assetFileNames: (assetInfo) => {
            // 处理特殊文件名
            if (assetInfo.name.startsWith('_')) {
              return `vendor-${Date.now()}.[ext]`;
            }
            return '[name].[ext]';
          },
        },
      },
      // 开发环境特定配置
      ...(isDev && {
        minify: false,
        sourcemap: true,
        // watch: {
        //   // 修改watch选项，使用轮询模式可能会更稳定
        //   clearScreen: false,
        //   exclude: ["node_modules/**", "dist/**", "dist-prod/**"],
        // },
      }),
      ...(isProd && {
        sourcemap: false, // 生产环境关闭
      }),
    },
    // 根据环境设置不同的变量
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
  };
});
