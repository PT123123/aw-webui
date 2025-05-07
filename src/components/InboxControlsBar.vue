<template>
  <div :class="[styles['controls'], { [styles['dark-mode']]: isDarkMode }]">
    <slot name="status-icon" />
    <div class="sort-options">
      <button
        @click="toggleSortMethod"
        class="sort-toggle-btn"
        :data-icon="sortMethod === 'created' ? '⏱' : '🔄'"
      >
        {{ sortMethod === 'created' ? '⏱ 创建时间' : '🔄 修改时间' }}
      </button>
    </div>
    <button
      @click="() => $emit('refresh-data')"
      data-testid="refresh-btn"
      :class="[styles['refresh-btn'], { [styles['dark-mode']]: isDarkMode }]"
    >
      刷新
    </button>
  </div>
</template>

<script>
export default {
  name: 'InboxControlsBar',
  props: {
    sortMethod: String,
    isDarkMode: Boolean,
    styles: Object
  },
  methods: {
    toggleSortMethod() {
      console.log('[InboxControlsBar] toggleSortMethod called. Current sortMethod prop:', this.sortMethod);
      const newSortMethod = this.sortMethod === 'created' ? 'updated' : 'created';
      console.log('[InboxControlsBar] Emitting event "sort-by" with value:', newSortMethod);
      this.$emit('sort-by', newSortMethod);
    }
  }
};
</script>

<style scoped>
.sort-toggle-btn {
  padding: 8px 15px;
  background-color: #333333; /* 深灰色背景 */
  color: #ffffff; /* 白色文字 */
  border: 1px solid #555555; /* 边框颜色调整 */
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  min-width: 120px;
  text-align: center;
}

.sort-toggle-btn:hover {
  background-color: #444444; /* 悬停时稍亮一些的深灰色 */
  border-color: #666666;
}

.sort-toggle-btn:active {
  background-color: #222222; /* 点击时更深的灰色 */
  border-color: #444444;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

/* 深色模式样式 */
:global(.dark-mode) .sort-toggle-btn {
  background-color: #282a36; /* 暗黑模式下的背景色，可以根据您的主题调整 */
  color: #f0f0f0;
  border: 1px solid #44475a;
}

:global(.dark-mode) .sort-toggle-btn:hover {
  background-color: #3a3c4a; /* 暗黑模式悬停颜色 */
  border-color: #505362;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .sort-toggle-btn {
    min-width: auto;
    padding: 6px 10px;
    font-size: 13px;
  }
  
  /* 在小屏幕上只显示图标，隐藏文字 */
  .sort-toggle-btn {
    font-size: 0;
  }
  
  .sort-toggle-btn::before {
    content: attr(data-icon);
    font-size: 16px;
  }
}
</style>
