// vite.config.ts
import { defineConfig } from "file:///Users/zcy/Desktop/Project/Company/%E5%9F%BA%E5%BB%BA/request-cache/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/zcy/Desktop/Project/Company/%E5%9F%BA%E5%BB%BA/request-cache/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { crx } from "file:///Users/zcy/Desktop/Project/Company/%E5%9F%BA%E5%BB%BA/request-cache/node_modules/@crxjs/vite-plugin/dist/index.mjs";
import { resolve } from "path";

// manifest.json
var manifest_default = {
  manifest_version: 3,
  name: "request-cache",
  version: "0.0.1",
  description: "request cache",
  permissions: [
    "storage",
    "tabs",
    "webRequest",
    "webNavigation",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "declarativeNetRequestFeedback",
    "proxy",
    "debugger",
    "scripting"
  ],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "src/assets/icon16.png",
      "48": "src/assets/icon48.png",
      "128": "src/assets/icon128.png"
    }
  },
  options_page: "src/options/index.html",
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_start",
      all_frames: true
    }
  ],
  web_accessible_resources: [
    {
      resources: ["assets/*", "ajaxHook.js"],
      matches: ["<all_urls>"]
    }
  ],
  icons: {
    "16": "src/assets/icon16.png",
    "48": "src/assets/icon48.png",
    "128": "src/assets/icon128.png"
  }
};

// vite.config.ts
var __vite_injected_original_dirname = "/Users/zcy/Desktop/Project/Company/\u57FA\u5EFA/request-cache";
var vite_config_default = defineConfig(({ mode, command }) => {
  const isDev = mode === "development";
  const isProd = mode === "production";
  const outDir = isDev ? "dist" : "dist-prod";
  return {
    plugins: [
      vue(),
      // 使用crx插件的配置
      crx({
        manifest: manifest_default,
        browser: "chrome"
      })
    ],
    resolve: {
      alias: {
        "@": resolve(__vite_injected_original_dirname, "src")
      },
      extensions: [".ts", ".vue"]
    },
    build: {
      // 根据环境设置输出目录
      outDir,
      // Vite自带的清空目录选项
      emptyOutDir: true,
      // 根据环境设置 sourcemap
      sourcemap: isDev,
      // 开发环境开启，生产环境关闭
      // 配置入口点
      rollupOptions: {
        input: {
          popup: resolve(__vite_injected_original_dirname, "src/popup/index.html"),
          options: resolve(__vite_injected_original_dirname, "src/options/index.html"),
          background: resolve(__vite_injected_original_dirname, "src/background/index.ts"),
          content: resolve(__vite_injected_original_dirname, "src/content/index.ts"),
          ajaxHook: resolve(__vite_injected_original_dirname, "src/content/ajaxHook.ts"),
          "cache-viewer": resolve(__vite_injected_original_dirname, "src/cache-viewer/index.html")
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "inject") {
              return "inject.js";
            }
            return "[name].js";
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name.startsWith("_")) {
              return `vendor-${Date.now()}.js`;
            }
            return "[name].js";
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.startsWith("_")) {
              return `vendor-${Date.now()}.[ext]`;
            }
            return "[name].[ext]";
          }
        }
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
      ...isDev && {
        minify: false,
        watch: {
          // 修改watch选项，使用轮询模式可能会更稳定
          clearScreen: false,
          exclude: ["node_modules/**", "dist/**", "dist-prod/**"]
        }
      },
      ...isProd && {
        sourcemap: false
        // 生产环境关闭
      }
    },
    // 根据环境设置不同的变量
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.VITE_BUILD_TIME": JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAibWFuaWZlc3QuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy96Y3kvRGVza3RvcC9Qcm9qZWN0L0NvbXBhbnkvXHU1N0ZBXHU1RUZBL3JlcXVlc3QtY2FjaGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy96Y3kvRGVza3RvcC9Qcm9qZWN0L0NvbXBhbnkvXHU1N0ZBXHU1RUZBL3JlcXVlc3QtY2FjaGUvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3pjeS9EZXNrdG9wL1Byb2plY3QvQ29tcGFueS8lRTUlOUYlQkElRTUlQkIlQkEvcmVxdWVzdC1jYWNoZS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgdnVlIGZyb20gXCJAdml0ZWpzL3BsdWdpbi12dWVcIjtcbmltcG9ydCB7IGNyeCB9IGZyb20gXCJAY3J4anMvdml0ZS1wbHVnaW5cIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuLy8gXHU1QkZDXHU1MTY1bWFuaWZlc3RcdTVFNzZcdTRGN0ZcdTc1MjhcdTdDN0JcdTU3OEJcdTU4RjBcdTY2MEVcbmltcG9ydCBtYW5pZmVzdEpzb24gZnJvbSBcIi4vbWFuaWZlc3QuanNvblwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUsIGNvbW1hbmQgfSkgPT4ge1xuICBjb25zdCBpc0RldiA9IG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIjtcbiAgY29uc3QgaXNQcm9kID0gbW9kZSA9PT0gXCJwcm9kdWN0aW9uXCI7XG5cbiAgLy8gXHU3ODZFXHU1QjlBXHU4RjkzXHU1MUZBXHU3NkVFXHU1RjU1XG4gIGNvbnN0IG91dERpciA9IGlzRGV2ID8gXCJkaXN0XCIgOiBcImRpc3QtcHJvZFwiO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgdnVlKCksXG4gICAgICAvLyBcdTRGN0ZcdTc1MjhjcnhcdTYzRDJcdTRFRjZcdTc2ODRcdTkxNERcdTdGNkVcbiAgICAgIGNyeCh7XG4gICAgICAgIG1hbmlmZXN0OiBtYW5pZmVzdEpzb24sXG4gICAgICAgIGJyb3dzZXI6IFwiY2hyb21lXCIsXG4gICAgICB9KSxcbiAgICBdLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmNcIiksXG4gICAgICB9LFxuICAgICAgZXh0ZW5zaW9uczogW1wiLnRzXCIsXCIudnVlXCJdXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgLy8gXHU2ODM5XHU2MzZFXHU3M0FGXHU1ODgzXHU4QkJFXHU3RjZFXHU4RjkzXHU1MUZBXHU3NkVFXHU1RjU1XG4gICAgICBvdXREaXIsXG4gICAgICAvLyBWaXRlXHU4MUVBXHU1RTI2XHU3Njg0XHU2RTA1XHU3QTdBXHU3NkVFXHU1RjU1XHU5MDA5XHU5ODc5XG4gICAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICAgIC8vIFx1NjgzOVx1NjM2RVx1NzNBRlx1NTg4M1x1OEJCRVx1N0Y2RSBzb3VyY2VtYXBcbiAgICAgIHNvdXJjZW1hcDogaXNEZXYsIC8vIFx1NUYwMFx1NTNEMVx1NzNBRlx1NTg4M1x1NUYwMFx1NTQyRlx1RkYwQ1x1NzUxRlx1NEVBN1x1NzNBRlx1NTg4M1x1NTE3M1x1OTVFRFxuICAgICAgLy8gXHU5MTREXHU3RjZFXHU1MTY1XHU1M0UzXHU3MEI5XG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgcG9wdXA6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9wb3B1cC9pbmRleC5odG1sXCIpLFxuICAgICAgICAgIG9wdGlvbnM6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9vcHRpb25zL2luZGV4Lmh0bWxcIiksXG4gICAgICAgICAgYmFja2dyb3VuZDogcmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjL2JhY2tncm91bmQvaW5kZXgudHNcIiksXG4gICAgICAgICAgY29udGVudDogcmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjL2NvbnRlbnQvaW5kZXgudHNcIiksXG4gICAgICAgICAgYWpheEhvb2s6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9jb250ZW50L2FqYXhIb29rLnRzXCIpLFxuICAgICAgICAgIFwiY2FjaGUtdmlld2VyXCI6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy9jYWNoZS12aWV3ZXIvaW5kZXguaHRtbFwiKSxcbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6IChjaHVua0luZm8pID0+IHtcbiAgICAgICAgICAgIC8vIFx1NEUzQSBpbmplY3QuanMgXHU0RjdGXHU3NTI4XHU1NkZBXHU1QjlBXHU1NDBEXHU3OUYwXG4gICAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09IFwiaW5qZWN0XCIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiaW5qZWN0LmpzXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gXCJbbmFtZV0uanNcIjtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAoY2h1bmtJbmZvKSA9PiB7XG4gICAgICAgICAgICAvLyBcdTU5MDRcdTc0MDZcdTcyNzlcdTZCOEFcdTY1ODdcdTRFRjZcdTU0MERcbiAgICAgICAgICAgIGlmIChjaHVua0luZm8ubmFtZS5zdGFydHNXaXRoKFwiX1wiKSkge1xuICAgICAgICAgICAgICByZXR1cm4gYHZlbmRvci0ke0RhdGUubm93KCl9LmpzYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBcIltuYW1lXS5qc1wiO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAgIC8vIFx1NTkwNFx1NzQwNlx1NzI3OVx1NkI4QVx1NjU4N1x1NEVGNlx1NTQwRFxuICAgICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lLnN0YXJ0c1dpdGgoXCJfXCIpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBgdmVuZG9yLSR7RGF0ZS5ub3coKX0uW2V4dF1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFwiW25hbWVdLltleHRdXCI7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gLy8gXHU3NTFGXHU0RUE3XHU3M0FGXHU1ODgzXHU3Mjc5XHU1QjlBXHU5MTREXHU3RjZFXG4gICAgICAgIC8vIC4uLihpc1Byb2QgJiYge1xuICAgICAgICAvLyAgIG91dHB1dDoge1xuICAgICAgICAvLyAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgIC8vICAgICAgIHZ1ZTogW1widnVlXCJdLFxuICAgICAgICAvLyAgICAgICB2ZW5kb3I6IFtcIkB2dWUvcnVudGltZS1jb3JlXCIsIFwiQHZ1ZS9ydW50aW1lLWRvbVwiXSxcbiAgICAgICAgLy8gICAgIH0sXG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gfSksXG4gICAgICB9LFxuICAgICAgLy8gXHU1RjAwXHU1M0QxXHU3M0FGXHU1ODgzXHU3Mjc5XHU1QjlBXHU5MTREXHU3RjZFXG4gICAgICAuLi4oaXNEZXYgJiYge1xuICAgICAgICBtaW5pZnk6IGZhbHNlLFxuICAgICAgICB3YXRjaDoge1xuICAgICAgICAgIC8vIFx1NEZFRVx1NjUzOXdhdGNoXHU5MDA5XHU5ODc5XHVGRjBDXHU0RjdGXHU3NTI4XHU4RjZFXHU4QkUyXHU2QTIxXHU1RjBGXHU1M0VGXHU4MEZEXHU0RjFBXHU2NkY0XHU3QTMzXHU1QjlBXG4gICAgICAgICAgY2xlYXJTY3JlZW46IGZhbHNlLFxuICAgICAgICAgIGV4Y2x1ZGU6IFtcIm5vZGVfbW9kdWxlcy8qKlwiLCBcImRpc3QvKipcIiwgXCJkaXN0LXByb2QvKipcIl0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIC4uLihpc1Byb2QgJiYge1xuICAgICAgICBzb3VyY2VtYXA6IGZhbHNlLCAvLyBcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTUxNzNcdTk1RURcbiAgICAgIH0pLFxuICAgIH0sXG4gICAgLy8gXHU2ODM5XHU2MzZFXHU3M0FGXHU1ODgzXHU4QkJFXHU3RjZFXHU0RTBEXHU1NDBDXHU3Njg0XHU1M0Q4XHU5MUNGXG4gICAgZGVmaW5lOiB7XG4gICAgICBcInByb2Nlc3MuZW52Lk5PREVfRU5WXCI6IEpTT04uc3RyaW5naWZ5KG1vZGUpLFxuICAgICAgXCJwcm9jZXNzLmVudi5WSVRFX0JVSUxEX1RJTUVcIjogSlNPTi5zdHJpbmdpZnkobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxcbiAgICB9LFxuICB9O1xufSk7XG4iLCAie1xuICBcIm1hbmlmZXN0X3ZlcnNpb25cIjogMyxcbiAgXCJuYW1lXCI6IFwicmVxdWVzdC1jYWNoZVwiLFxuICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwicmVxdWVzdCBjYWNoZVwiLFxuICBcInBlcm1pc3Npb25zXCI6IFtcbiAgICBcInN0b3JhZ2VcIixcbiAgICBcInRhYnNcIixcbiAgICBcIndlYlJlcXVlc3RcIixcbiAgICBcIndlYk5hdmlnYXRpb25cIixcbiAgICBcImRlY2xhcmF0aXZlTmV0UmVxdWVzdFwiLFxuICAgIFwiZGVjbGFyYXRpdmVOZXRSZXF1ZXN0V2l0aEhvc3RBY2Nlc3NcIixcbiAgICBcImRlY2xhcmF0aXZlTmV0UmVxdWVzdEZlZWRiYWNrXCIsXG4gICAgXCJwcm94eVwiLFxuICAgIFwiZGVidWdnZXJcIixcbiAgICBcInNjcmlwdGluZ1wiXG4gIF0sXG4gIFwiaG9zdF9wZXJtaXNzaW9uc1wiOiBbXCI8YWxsX3VybHM+XCJdLFxuICBcImJhY2tncm91bmRcIjoge1xuICAgIFwic2VydmljZV93b3JrZXJcIjogXCJzcmMvYmFja2dyb3VuZC9pbmRleC50c1wiLFxuICAgIFwidHlwZVwiOiBcIm1vZHVsZVwiXG4gIH0sXG4gIFwiYWN0aW9uXCI6IHtcbiAgICBcImRlZmF1bHRfcG9wdXBcIjogXCJzcmMvcG9wdXAvaW5kZXguaHRtbFwiLFxuICAgIFwiZGVmYXVsdF9pY29uXCI6IHtcbiAgICAgIFwiMTZcIjogXCJzcmMvYXNzZXRzL2ljb24xNi5wbmdcIixcbiAgICAgIFwiNDhcIjogXCJzcmMvYXNzZXRzL2ljb240OC5wbmdcIixcbiAgICAgIFwiMTI4XCI6IFwic3JjL2Fzc2V0cy9pY29uMTI4LnBuZ1wiXG4gICAgfVxuICB9LFxuICBcIm9wdGlvbnNfcGFnZVwiOiBcInNyYy9vcHRpb25zL2luZGV4Lmh0bWxcIixcbiAgXCJjb250ZW50X3NjcmlwdHNcIjogW1xuICAgIHtcbiAgICAgIFwibWF0Y2hlc1wiOiBbXCI8YWxsX3VybHM+XCJdLFxuICAgICAgXCJqc1wiOiBbXCJzcmMvY29udGVudC9pbmRleC50c1wiXSxcbiAgICAgIFwicnVuX2F0XCI6IFwiZG9jdW1lbnRfc3RhcnRcIixcbiAgICAgIFwiYWxsX2ZyYW1lc1wiOiB0cnVlXG4gICAgfVxuICBdLFxuICBcIndlYl9hY2Nlc3NpYmxlX3Jlc291cmNlc1wiOiBbXG4gICAge1xuICAgICAgXCJyZXNvdXJjZXNcIjogW1wiYXNzZXRzLypcIiwgXCJhamF4SG9vay5qc1wiXSxcbiAgICAgIFwibWF0Y2hlc1wiOiBbXCI8YWxsX3VybHM+XCJdXG4gICAgfVxuICBdLFxuICBcImljb25zXCI6IHtcbiAgICBcIjE2XCI6IFwic3JjL2Fzc2V0cy9pY29uMTYucG5nXCIsXG4gICAgXCI0OFwiOiBcInNyYy9hc3NldHMvaWNvbjQ4LnBuZ1wiLFxu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
