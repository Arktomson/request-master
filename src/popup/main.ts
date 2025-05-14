import { createApp } from "vue"
import App from './App.vue'

// 引入normalize.css重置样式
import 'normalize.css'

// 创建Vue应用实例
const app = createApp(App)

// 挂载应用
app.mount('#app')
