<template>
  <div 
    :class="[
      'resize-handle', 
      { 'active': isActive, 'horizontal': direction === 'horizontal' }
    ]" 
    ref="handleRef"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 定义属性 - 使用withDefaults设置默认值
const props = withDefaults(defineProps<{
  direction?: 'vertical' | 'horizontal';
}>(), {
  direction: 'vertical'
});

// 状态
const isActive = ref(false);
const handleRef = ref<HTMLElement | null>(null);

// 定义事件
const emit = defineEmits<{
  (e: 'resize', size: number): void;
}>();

// 方法
const initDrag = () => {
  const handle = handleRef.value;
  if (!handle) return;
  
  let startPos = 0;
  let initialSize = 0;
  const isHorizontal = props.direction === 'horizontal';
  
  const handleMouseDown = (e: MouseEvent) => {
    startPos = isHorizontal ? e.clientY : e.clientX;
    
    // 获取相邻元素的尺寸
    const resizeTarget = isHorizontal 
      ? handle.previousElementSibling as HTMLElement
      : handle.nextElementSibling as HTMLElement;
      
    if (!resizeTarget) return;
    
    initialSize = isHorizontal
      ? resizeTarget.getBoundingClientRect().height
      : resizeTarget.getBoundingClientRect().width;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = isHorizontal ? 'row-resize' : 'col-resize';
    isActive.value = true;
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    const currentPos = isHorizontal ? e.clientY : e.clientX;
    const delta = isHorizontal ? currentPos - startPos : startPos - currentPos;
    const newSize = isHorizontal 
      ? Math.max(100, initialSize + delta)
      : Math.max(250, initialSize + delta);
      
    emit('resize', newSize);
  };
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    isActive.value = false;
  };
  
  handle.addEventListener('mousedown', handleMouseDown);
};

// 生命周期钩子
onMounted(() => {
  initDrag();
});

// 暴露属性和方法
defineExpose({
  handleRef
});
</script>

<style scoped lang="scss">
.resize-handle {
  position: relative;
  z-index: 10;
  transition: background-color 0.2s;
  
  &:not(.horizontal) {
    width: 3px;
    background-color: #f2f2f2;
    cursor: col-resize;
    
    &:hover, &.active {
      background-color: #e0e0e0;
    }
    
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 30px;
      background-color: #c0c0c0;
      border-radius: 1px;
    }
  }
  
  &.horizontal {
    height: 3px;
    background-color: #f2f2f2;
    cursor: row-resize;
    
    &:hover, &.active {
      background-color: #e0e0e0;
    }
    
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 30px;
      height: 2px;
      background-color: #c0c0c0;
      border-radius: 1px;
    }
  }
}
</style> 