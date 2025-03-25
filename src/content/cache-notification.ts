// 缓存通知模块
// 用于在页面上显示使用缓存的通知

/**
 * 显示缓存使用通知
 * @param url 缓存的URL
 * @param cacheAge 缓存时间（毫秒）
 */
export function showCacheNotification(url: string, cacheAge: number): void {
  // 创建通知元素
  const notification = document.createElement('div');
  
  // 设置样式
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: '2147483647',
    fontSize: '14px',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    opacity: '1',
    transition: 'opacity 0.5s ease'
  });
  
  // 格式化URL显示
  const urlDisplay = url.length > 50 ? url.substring(0, 47) + '...' : url;
  
  // 格式化缓存时间
  let ageText = '';
  if (cacheAge < 60000) {
    ageText = `${Math.round(cacheAge / 1000)}秒前`;
  } else if (cacheAge < 3600000) {
    ageText = `${Math.round(cacheAge / 60000)}分钟前`;
  } else if (cacheAge < 86400000) {
    ageText = `${Math.round(cacheAge / 3600000)}小时前`;
  } else {
    ageText = `${Math.round(cacheAge / 86400000)}天前`;
  }
  
  // 设置通知内容
  notification.innerHTML = `
    <div style="font-weight: bold;">使用缓存加载</div>
    <div style="font-size: 12px; word-break: break-all;">${urlDisplay}</div>
    <div style="font-size: 12px;">缓存时间: ${ageText}</div>
  `;
  
  // 添加到文档
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

/**
 * 显示缓存统计信息
 * @param stats 缓存统计数据
 */
export function showCacheStats(stats: { hits: number, savedBytes: number, savedTime: number }): void {
  let statsElement = document.getElementById('http-cache-stats');
  
  if (!statsElement) {
    // 创建统计显示元素
    statsElement = document.createElement('div');
    statsElement.id = 'http-cache-stats';
    
    // 设置样式
    Object.assign(statsElement.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: '2147483646',
      pointerEvents: 'none',
      opacity: '0.8',
      transition: 'opacity 0.3s ease'
    });
    
    document.body.appendChild(statsElement);
  }
  
  // 计算节省的流量
  let sizeText = '';
  if (stats.savedBytes < 1024) {
    sizeText = `${stats.savedBytes} B`;
  } else if (stats.savedBytes < 1048576) {
    sizeText = `${(stats.savedBytes / 1024).toFixed(1)} KB`;
  } else {
    sizeText = `${(stats.savedBytes / 1048576).toFixed(1)} MB`;
  }
  
  // 更新统计内容
  statsElement.innerHTML = `
    <div>缓存命中: ${stats.hits}次</div>
    <div>节省流量: ${sizeText}</div>
    <div>节省时间: ${(stats.savedTime / 1000).toFixed(1)}秒</div>
  `;
}
