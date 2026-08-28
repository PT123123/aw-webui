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
  min-width: 120px;
  text-align: center;
}
.copy-btn, .sort-toggle-btn {
  padding: 6px 14px;
  background-color: #fff;
  color: #555;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}
.copy-btn {
  margin-right: 10px;
}
.copy-btn:hover, .sort-toggle-btn:hover {
  background-color: #f5f4f0;
}
.copy-btn.dark-mode {
  background-color: #2a2a3e;
  color: #b0b0b0;
  border-color: #3a3a50;
}
.copy-btn.dark-mode:hover {
  background-color: #353550;
}
.sort-toggle-btn:hover {
  background-color: #f5f4f0;
}
.sort-toggle-btn:active {
  background-color: #eee9e2;
}
:global(.dark-mode) .sort-toggle-btn {
  background-color: #2a2a3e;
  color: #b0b0b0;
  border: 1px solid #3a3a50;
}
:global(.dark-mode) .sort-toggle-btn:hover {
  background-color: #353550;
}

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
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  margin-right: 5px;
  font-size: 13px;
  width: 200px;
  transition: width 0.3s ease;
  background-color: #fff;
  color: #333;
}

.search-input.dark-mode {
  background-color: #2a2a3e;
  color: #e0e0e0;
  border-color: #3a3a50;
}

.search-button, .search-icon-button, .cancel-button {
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  margin-right: 5px;
  transition: all 0.2s ease;
}

.search-button, .search-icon-button {
  background-color: #fff;
  color: #555;
}

.cancel-button {
  background-color: #fff;
  color: #999;
}

.search-button.dark-mode, .search-icon-button.dark-mode {
  background-color: #2a2a3e;
  color: #b0b0b0;
  border-color: #3a3a50;
}

.cancel-button.dark-mode {
  background-color: #2a2a3e;
  color: #888;
  border-color: #3a3a50;
}

.search-button:hover, .search-icon-button:hover {
  background-color: #f5f4f0;
}

.cancel-button:hover {
  background-color: #f5f4f0;
}

.search-button.dark-mode:hover, .search-icon-button.dark-mode:hover {
  background-color: #353550;
}

.cancel-button.dark-mode:hover {
  background-color: #353550;
}

@media (max-width: 480px) {
  .copy-btn, .sort-toggle-btn {
    min-width: auto;
    padding: 6px 10px;
    font-size: 13px;
  }
  
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
  
  .search-container {
    margin-left: 5px;
  }
  .search-input {
    padding: 6px 8px;
    font-size: 13px;
    max-width: 100px;
  }
  .search-button {
    padding: 6px 8px;
    font-size: 13px;
  }
}
</style>
