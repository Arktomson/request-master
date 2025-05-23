import { createApp } from 'vue';
import App from './App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './styles/index.scss';

// 创建并挂载Vue应用
const app = createApp(App);

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 