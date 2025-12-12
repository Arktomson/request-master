import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'request-master',
    description: 'request master',
    homepage_url: 'https://github.com/Arktomson/request-master',
    permissions: [
      'storage',
      'tabs',
      'webRequest',
      'webNavigation',
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess',
      'declarativeNetRequestFeedback',
      'proxy',
      'debugger',
      'scripting',
      'clipboardWrite',
      'contextMenus',
      'alarms',
    ],
    host_permissions: ['http://*/*', 'https://*/*'],
    commands: {
      open_sidebar: {
        suggested_key: {
          default: 'Ctrl+H',
          mac: 'Ctrl+H',
          windows: 'Ctrl+Shift+H',
        },
        description: '打开 / 切换扩展侧栏',
      },
    },
    web_accessible_resources: [
      {
        resources: ['ajax-hook.js', 'sider.html'],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  },
});
