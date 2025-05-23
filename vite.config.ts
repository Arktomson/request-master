import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import fs from "fs";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
// 导入manifest并使用类型声明
import manifestJson from "./manifest.json";
import ElementPlus from "unplugin-element-plus/vite";
// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isDev = mode === "development";
  const isProd = mode === "production";

  // 确定输出目录
  const outDir = isDev ? "dist" : "dist-prod";

  return {
    plugins: [
      vue(),
      // 使用crx插件的配置
      crx({
        manifest: manifestJson,
        browser: "chrome",
      }),
      ElementPlus(),
      viteCommonjs(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
      extensions: [".ts", ".vue", ".js"],
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
          ajaxHook: resolve(__dirname, "src/content/ajaxHook.ts"),
          "cache-viewer": resolve(__dirname, "src/cache-viewer/index.html"),
          sidebar: resolve(__dirname, "src/sidebar/index.html"),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return "[name].js";
          },
          chunkFileNames: (chunkInfo) => {
            // 处理特殊文件名
            if (chunkInfo.name.startsWith("_")) {
              return `vendor-${Date.now()}.js`;
            }
            return "[name].js";
          },
          assetFileNames: (assetInfo) => {
            // 处理特殊文件名
            if (assetInfo.name.startsWith("_")) {
              return `vendor-${Date.now()}.[ext]`;
            }
            return "[name].[ext]";
          },
          manualChunks: (id, { getModuleInfo }) => {
            // 对ajaxHook入口相关的依赖不做代码分割，强制内联到同一文件
            // if (
            //   id.includes("src/content/ajaxHook") ||
            //   getModuleInfo(id)?.importers.some((i) =>
            //     i.includes("src/content/ajaxHook")
            //   )
            // ) {
            //   return "ajaxHook";
            // }
          },
        },
        // // 生产环境特定配置
        // ...(isProd && {
        //   output: {
        //     manualChunks: {
        //       vue: ["vue"],
        //       vendor: ["@vue/runtime-core", "@vue/runtime-dom"],
        //     },
        //   },
        // }),
      },
      // 开发环境特定配置
      ...(isDev && {
        minify: false,
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
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
    },
  };
});
