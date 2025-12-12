import { createApp } from 'vue';
import App from './App.vue';
import MockPanel from './mockPanel/App.vue';
import SettingPanel from './settingPanel/App.vue';
import { createRouter, createWebHistory } from 'vue-router';
// import './styles/index.scss';

// 创建并挂载Vue应用
const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/monitor' },
    { path: '/monitor', component: MockPanel },
    {
      path: '/setting',
      component: SettingPanel,
    }
  ],
});
app.use(router);
// 挂载应用
app.mount('#app');
