<template>
    <div class="setting-panel">
        <div class="setting-header">
            <h2>设置</h2>
            <p>配置你的请求监测工具</p>
        </div>
        
        <div class="setting-content">
            <div class="setting-section">
                <h3>界面设置</h3>
                <div class="setting-item">
                    <span class="setting-label">主题模式</span>
                    <el-switch v-model="darkMode" active-text="深色" inactive-text="浅色" />
                </div>
            </div>
            
            <div class="setting-section">
                <h3>功能设置</h3>
                <div class="setting-item">
                    <span class="setting-label">自动保存请求</span>
                    <el-switch v-model="autoSave" />
                </div>
                <div class="setting-item">
                    <span class="setting-label">显示请求时间</span>
                    <el-switch v-model="showTime" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElSwitch } from 'element-plus';

const darkMode = ref(false);
const autoSave = ref(true);
const showTime = ref(true);
</script>

<style scoped lang="scss">
.setting-panel {
    height: 100%;
    padding: 24px;
    background-color: #fff;
    overflow-y: auto;
    
    .setting-header {
        margin-bottom: 32px;
        border-bottom: 1px solid #e4e7ed;
        padding-bottom: 16px;
        
        h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 600;
            color: #303133;
        }
        
        p {
            margin: 0;
            color: #909399;
            font-size: 14px;
        }
    }
    
    .setting-content {
        .setting-section {
            margin-bottom: 32px;
            
            h3 {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
                color: #606266;
            }
            
            .setting-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #f0f0f0;
                
                &:last-child {
                    border-bottom: none;
                }
                
                .setting-label {
                    font-size: 14px;
                    color: #606266;
                    font-weight: 500;
                }
            }
        }
    }
}
</style>