import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import fs from "fs";
// 导入manifest并使用类型声明
import manifestJson from "./manifest.json";

// 删除目录函数
function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  // 确保目录存在后清空目录内容
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = resolve(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      emptyDir(filePath);
      fs.rmdirSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  });
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isDev = mode === "development";
  const isProd = mode === "production";

  // 确定输出目录
  const outDir = isDev ? "dist" : "dist-prod";

  // 如果是构建命令，先手动清空目录
  if (command === "build") {
    console.log(`清空输出目录: ${outDir}`);
    emptyDir(resolve(__dirname, outDir));
  }

  return {
    plugins: [
      vue({
        // 为Vue SFC配置特定选项，禁用热更新
        template: {
          compilerOptions: {
            whitespace: "preserve",
          },
        },
      }),
      // 使用crx插件的配置
      crx({
        manifest: manifestJson,
        browser: "chrome",
      }),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    build: {
      // 根据环境设置输出目录
      outDir,
      // Vite自带的清空目录选项
      emptyOutDir: true,
      // 根据环境设置 sourcemap
      sourcemap: isDev, // 开发环境开启，生产环境关闭
      // 配置入口点
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "src/popup/index.html"),
          options: resolve(__dirname, "src/options/index.html"),
          background: resolve(__dirname, "src/background/index.ts"),
          content: resolve(__dirname, "src/content/index.ts"),
          inject: resolve(__dirname, "src/content/inject.ts"),
          "cache-viewer": resolve(__dirname, "src/cache-viewer/index.html"),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            // 为 inject.js 使用固定名称
            if (chunkInfo.name === 'inject') {
              return 'inject.js';
            }
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
        // 生产环境特定配置
        ...(isProd && {
          output: {
            manualChunks: {
              vue: ["vue"],
              vendor: ["@vue/runtime-core", "@vue/runtime-dom"],
            },
          },
        }),
      },
      // 开发环境特定配置
      ...(isDev && {
        minify: false,
        watch: {
          // 修改watch选项，使用轮询模式可能会更稳定
          clearScreen: false,
          exclude: ["node_modules/**", "dist/**", "dist-prod/**"],
        },
      }),
      // 或者更详细的配置
      ...(isDev && {
        sourcemap: true,
        minify: false,
        watch: {
          clearScreen: false,
          exclude: ["node_modules/**", "dist/**", "dist-prod/**"],
        },
      }),
      ...(isProd && {
        sourcemap: false, // 生产环境关闭
      }),
    },
    // 根据环境设置不同的变量
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
    },
    // 开发服务器配置
    server: {
      port: 5173,
      strictPort: true, // 指定端口被占用时直接退出而不是尝试下一个可用端口
      hmr: {
        // 热更新配置
        overlay: false, // 禁用错误遮罩
      },
      watch: {
        // 监视器配置
        usePolling: true, // 使用轮询，解决某些文件系统的监听问题
        interval: 1000, // 轮询间隔
      },
    },
  };
});
