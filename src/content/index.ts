// 内容脚本，在匹配的页面上运行
import { showCacheNotification, showCacheStats } from './cache-notification';

console.log('HTTP缓存扩展内容脚本已加载');

// 当前扩展状态
let isActive = false;

// 从存储中获取初始状态
chrome.storage.local.get(['isActive'], (result) => {
  isActive = result.isActive !== false; // 默认为true
  console.log('扩展活动状态:', isActive);
  
  if (isActive) {
    // initExtension();
  }
});

// // 监听来自popup或background的消息
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log('内容脚本收到消息:', message);
  
//   // 处理状态切换消息
//   if (message.type === 'TOGGLE_STATE') {
//     isActive = message.isActive;
    
//     if (isActive) {
//       initExtension();
//     } else {
//       removeExtensionElements();
//     }
    
//     sendResponse({ success: true });
//     return true;
//   }
  
//   // 处理使用缓存通知
//   if (message.type === 'CACHE_USED' && message.data) {
//     if (document.body) {
//       showCacheNotification(message.data.url, message.data.cacheAge);
//     }
//     sendResponse({ success: true });
//     return true;
//   }
  
//   // 处理统计数据更新
//   if (message.type === 'CACHE_STATS_UPDATE' && message.data) {
//     if (document.body) {
//       showCacheStats(message.data);
//     }
//     sendResponse({ success: true });
//     return true;
//   }
// });

// // 初始化扩展功能
// function initExtension() {
//   console.log('正在初始化HTTP缓存扩展功能');
  
//   // 请求当前缓存统计
//   chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }, (response) => {
//     if (response && response.success && response.data) {
//       showCacheStats(response.data);
//     }
//   });
  
//   // 添加样式
//   const style = document.createElement('style');
//   style.id = 'http-cache-extension-styles';
//   style.textContent = `
//     #http-cache-stats {
//       transition: opacity 0.3s ease;
//     }
//   `;
//   document.head.appendChild(style);
// }

// // 移除扩展添加的元素
// function removeExtensionElements() {
//   console.log('正在移除HTTP缓存扩展元素');
  
//   // 移除统计显示
//   const statsElement = document.getElementById('http-cache-stats');
//   if (statsElement) {
//     statsElement.remove();
//   }
  
//   // 移除样式
//   const style = document.getElementById('http-cache-extension-styles');
//   if (style) {
//     style.remove();
//   }
// }

// // 页面卸载时的清理工作
// window.addEventListener('unload', () => {
//   // 在页面卸载时执行清理工作
//   removeExtensionElements();
// });

export {};
