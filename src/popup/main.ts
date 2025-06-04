import { createApp } from "vue";
import App from "./App.vue";
// 引入normalize.css重置样式
import "normalize.css";
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';


// 创建Vue应用实例
const app = createApp(App);
app.use(ElementPlus);

// 挂载应用
app.mount("#app");
