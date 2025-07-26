<template>
  <div 
    :class="[
      'resize-handle', 
      { 'active': isActive, 'horizontal': direction === 'horizontal' }
    ]" 
    ref="handleRef"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';

// 定义属性 - 使用withDefaults设置默认值
const props = withDefaults(defineProps<{
  direction?: 'vertical' | 'horizontal';
}>(), {
  direction: 'vertical'
});

// 状态
const isActive = ref(false);
const handleRef = ref<HTMLElement | null>(null);
let hoverTween: gsap.core.Tween | null = null;

// 定义事件
const emit = defineEmits<{
  (e: 'resize', size: number): void;
}>();

// GSAP动画方法
const onMouseEnter = () => {
  if (!handleRef.value) return;
  
  // 停止之前的动画
  if (hoverTween) hoverTween.kill();
  
  // 创建悬停动画
  hoverTween = gsap.to(handleRef.value, {
    backgroundColor: '#e0e0e0',
    duration: 0.2,
    ease: 'power2.out'
  });
  
  // 为伪元素添加微妙的缩放效果
  gsap.to(`${handleRef.value.className.includes('horizontal') ? '.horizontal' : '.resize-handle:not(.horizontal)'}::after`, {
    scale: 1.1,
    duration: 0.2,
    ease: 'power2.out'
  });
};

const onMouseLeave = () => {
  if (!handleRef.value || isActive.value) return;
  
  // 停止之前的动画
  if (hoverTween) hoverTween.kill();
  
  // 创建离开动画
  hoverTween = gsap.to(handleRef.value, {
    backgroundColor: '#f2f2f2',
    duration: 0.2,
    ease: 'power2.out'
  });
  
  // 恢复伪元素缩放
  gsap.to(`${handleRef.value.className.includes('horizontal') ? '.horizontal' : '.resize-handle:not(.horizontal)'}::after`, {
    scale: 1,
    duration: 0.2,
    ease: 'power2.out'
  });
};

const setActiveState = (active: boolean) => {
  if (!handleRef.value) return;
  
  isActive.value = active;
  
  if (active) {
    // 激活状态动画
    gsap.to(handleRef.value, {
      backgroundColor: '#d0d0d0',
      duration: 0.1,
      ease: 'power2.out'
    });
  } else if (!handleRef.value.matches(':hover')) {
    // 非激活且非悬停状态
    gsap.to(handleRef.value, {
      backgroundColor: '#f2f2f2',
      duration: 0.3,
      ease: 'power2.out'
    });
  }
};

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
    setActiveState(true);
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
    setActiveState(false);
  };
  
  handle.addEventListener('mousedown', handleMouseDown);
};

// 生命周期钩子
onMounted(() => {
  initDrag();
});

onUnmounted(() => {
  // 清理动画
  if (hoverTween) hoverTween.kill();
  gsap.killTweensOf(handleRef.value);
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
  // 移除CSS transition，改用GSAP
  
  &:not(.horizontal) {
    width: 3px;
    background-color: #f2f2f2;
    cursor: col-resize;
    
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
      transition: transform 0.2s ease; // 保留伪元素的transform动画
    }
  }
  
  &.horizontal {
    height: 3px;
    background-color: #f2f2f2;
    cursor: row-resize;
    
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
      transition: transform 0.2s ease; // 保留伪元素的transform动画
    }
  }
}
</style> 