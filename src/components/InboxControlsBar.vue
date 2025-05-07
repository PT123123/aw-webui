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
      @click="() => $emit('copy-notes')"
      data-testid="copy-btn"
      class="copy-btn"
      :class="{ 'dark-mode': isDarkMode }"
      title="复制所有笔记"
    >
      📋 复制
    </button>
    <button
      @click="() => $emit('refresh-data')"
      data-testid="refresh-btn"
      :class="[styles['refresh-btn'], { [styles['dark-mode']]: isDarkMode }]"
    >
      刷新
    </button>
    <!-- Search Button and Input -->
    <div :class="[styles['search-container'], { [styles['dark-mode']]: isDarkMode }]">
      <!-- 搜索输入框，只在showSearchInput为true时显示 -->
      <div v-if="showSearchInput" class="search-input-group">
        <input
          type="text"
          v-model="searchTerm"
          placeholder="搜索笔记..."
          @keyup.enter="onSearch"
          ref="searchInput"
          :class="[styles['search-input'], { [styles['dark-mode']]: isDarkMode }]"
        />
        <button
          @click="onSearch"
          :class="[styles['search-button'], { [styles['dark-mode']]: isDarkMode }]"
          title="搜索"
        >
          🔍
        </button>
        <button
          @click="cancelSearch"
          :class="[styles['cancel-button'], { [styles['dark-mode']]: isDarkMode }]"
          title="取消搜索"
        >
          ✖
        </button>
      </div>
      <!-- 搜索图标按钮，点击后显示搜索输入框 -->
      <button
        v-else
        @click="toggleSearchInput"
        :class="[styles['search-icon-button'], { [styles['dark-mode']]: isDarkMode }]"
        title="搜索"
      >
        🔍
      </button>
    </div>
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
  data() {
    return {
      searchTerm: '',
      showSearchInput: false, // 控制搜索输入框的显示状态
    };
  },
  methods: {
    toggleSortMethod() {
      console.log('[InboxControlsBar] toggleSortMethod called. Current sortMethod prop:', this.sortMethod);
      const newSortMethod = this.sortMethod === 'created' ? 'updated' : 'created';
      console.log('[InboxControlsBar] Emitting event "sort-by" with value:', newSortMethod);
      this.$emit('sort-by', newSortMethod);
    },
    toggleSearchInput() {
      this.showSearchInput = true;
      // 在下一个DOM更新周期后聚焦输入框
      this.$nextTick(() => {
        if (this.$refs.searchInput) {
          this.$refs.searchInput.focus();
        }
      });
    },
    onSearch() {
      if (this.searchTerm.trim()) {
        this.$emit('search-notes', this.searchTerm);
      }
    },
    cancelSearch() {
      this.searchTerm = '';
      this.showSearchInput = false;
      // 如果当前有搜索词，触发一个空搜索来清除搜索结果
      this.$emit('search-notes', '');
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

.copy-btn {
  padding: 8px 15px;
  background-color: #1e88e5; /* 蓝色背景 */
  color: #ffffff; /* 白色文字 */
  border: 1px solid #0d47a1; /* 深蓝色边框 */
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 10px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.copy-btn:hover {
  background-color: #1976d2; /* 悬停时稍深的蓝色 */
  border-color: #0d47a1;
}

.copy-btn.dark-mode {
  background-color: #2979ff; /* 暗黑模式下的蓝色 */
  color: #f0f0f0;
  border: 1px solid #1565c0;
}

.copy-btn.dark-mode:hover {
  background-color: #2962ff; /* 暗黑模式悬停颜色 */
  border-color: #0d47a1;
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

/* Search specific styles */
.search-container {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.search-input-group {
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 5px;
  font-size: 14px;
  width: 200px;
  transition: width 0.3s ease;
}

.search-input.dark-mode {
  background-color: #282a36;
  color: #f0f0f0;
  border-color: #44475a;
}

.search-button, .search-icon-button, .cancel-button {
  padding: 8px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 5px;
}

.search-button, .search-icon-button {
  background-color: #4CAF50;
  color: white;
}

.cancel-button {
  background-color: #f44336;
  color: white;
}

.search-button.dark-mode, .search-icon-button.dark-mode {
  background-color: #388e3c;
}

.cancel-button.dark-mode {
  background-color: #d32f2f;
}

.search-button:hover, .search-icon-button:hover {
  background-color: #45a049;
}

.cancel-button:hover {
  background-color: #e53935;
}

.search-button.dark-mode:hover, .search-icon-button.dark-mode:hover {
  background-color: #2e7d32;
}

.cancel-button.dark-mode:hover {
  background-color: #c62828;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .sort-toggle-btn,
  .copy-btn {
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
  
  .copy-btn {
    font-size: 0;
  }
  
  .copy-btn::before {
    content: "📋";
    font-size: 16px;
  }
  
  /* Adjust search for small screens */
  .search-container {
    margin-left: 5px; /* Reduce margin */
  }
  .search-input {
    padding: 6px 8px;
    font-size: 13px;
    max-width: 100px; /* Limit width to prevent overflow */
  }
  .search-button {
    padding: 6px 8px;
    font-size: 13px;
  }
}
</style>
