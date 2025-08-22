import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Request Master",
  description: "Chrome扩展 - Ajax请求拦截与Mock工具",
  lang: 'zh-CN',
  base: '/request-master/',
  
  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/ajax-hook' },
      { text: '示例', link: '/examples/usage-examples' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装配置', link: '/guide/installation' },
            { text: '基本配置', link: '/guide/configuration' },
            { text: '功能特性', link: '/guide/features' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 文档',
          items: [
            { text: 'Ajax Hook', link: '/api/ajax-hook' },
            { text: 'Mock Panel', link: '/api/mock-panel' },
            { text: '事件系统', link: '/api/events' },
            { text: '缓存管理', link: '/api/cache-manager' }
          ]
        }
      ],
      '/examples/': [
        {
          text: '使用示例',
          items: [
            { text: '基础用法', link: '/examples/usage-examples' },
            { text: '高级配置', link: '/examples/advanced-config' },
            { text: '常见问题', link: '/examples/faq' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/request-master' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Request Master'
    },

    // 中文化配置
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    
    outline: {
      label: '页面导航'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    }
  },

  markdown: {
    lineNumbers: true
  }
})
