import { createApp } from 'vue';
import App from './App.vue';
import MockPanel from './mockPanel/App.vue';
import SettingPanel from './settingPanel/App.vue';
import { createRouter, createWebHistory } from 'vue-router';

const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/monitor' },
    { path: '/monitor', component: MockPanel },
    { path: '/setting', component: SettingPanel },
  ],
});
app.use(router);
app.mount('#app');
