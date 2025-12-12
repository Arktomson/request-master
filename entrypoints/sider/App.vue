<template>
    <div class="sidebar-app">
        <SidebarMenu v-model:activeTab="activeTab" />
        <div class="content-wrapper">
            <router-view />
        </div>
    </div>
</template>

<script setup lang="ts">
import SidebarMenu from './components/SidebarMenu.vue';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
const activeTab = ref('monitor');
const router = useRouter();
watch(activeTab, (newVal) => {
    router.push(`/${newVal}`);
},{
    immediate: true,
});
</script>

<style scoped lang="scss">
.sidebar-app {
    height: 100vh;
    display: flex;
    background-color: #f5f7fa;
    
    .content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: #fff;
    }
}
</style>