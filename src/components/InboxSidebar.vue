<template>
  <aside :class="[styles['filter-sidebar'], { [styles['sidebar-open']]: showSidebar, [styles['dark-mode']]: isDarkMode }]">
    <div :class="[styles['sidebar-content'], { [styles['dark-mode']]: isDarkMode }]">
      <div :class="[styles['sidebar-header'], { [styles['dark-mode']]: isDarkMode }]">
        <h3>筛选选项</h3>
        <span
          v-if="selectedTags && selectedTags.length > 0"
          :class="[styles['current-filter'], { [styles['dark-mode']]: isDarkMode }]"
        >
          (已选 {{ selectedTags.length }} 个标签)
        </span>
        <button
          @click.stop="handleCloseSidebar"
          :class="[styles['close-btn'], { [styles['dark-mode']]: isDarkMode }]"
        >
          ×
        </button>
      </div>
      <div :class="[styles['tag-filter'], { [styles['dark-mode']]: isDarkMode }]">
        <h4>标签</h4>
        
        <ul
          v-if="allTags && allTags.length > 0"
          :class="[styles['tag-list'], { [styles['dark-mode']]: isDarkMode }]"
        >
          <li
            v-for="tag in allTags"
            :key="tag"
            @click.stop="$emit('filter-by-tag', tag)"
            :style="{
              backgroundColor: isTagSelected(tag) ? (isDarkMode ? '#6272a4' : '#e0e0e0') : '',
              color: isTagSelected(tag) ? (isDarkMode ? '#ffffff' : '#007bff') : '',
              fontWeight: isTagSelected(tag) ? 'bold' : 'normal',
              borderLeft: isTagSelected(tag) ? `4px solid ${isDarkMode ? '#bd93f9' : '#007bff'}` : '',
              position: 'relative',
              paddingLeft: isTagSelected(tag) ? '25px' : ''
            }"
            :class="[{ [styles['dark-mode']]: isDarkMode }]"
          >
            <span 
              v-if="isTagSelected(tag)" 
              style="position: absolute; left: 8px; font-size: 12px; font-weight: bold;"
              :style="{ color: isDarkMode ? '#ffffff' : '#007bff' }"
            >✓</span>
            {{ tag }}
          </li>
        </ul>
        <p
          v-else-if="!isLoadingTags"
          :class="{ [styles['dark-mode']]: isDarkMode }"
        >
          暂无标签。
        </p>
        <p
          v-else
          :class="{ [styles['dark-mode']]: isDarkMode }"
        >
          加载标签中...
        </p>
        <button
          v-if="selectedTags && selectedTags.length > 0"
          @click="$emit('clear-tag-filter')"
          :class="[styles['clear-filter-btn'], { [styles['dark-mode']]: isDarkMode }]"
        >
          清除筛选
        </button>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'InboxSidebar',
  props: {
    showSidebar: Boolean,
    allTags: Array,
    selectedTags: {
      type: Array,
      default: () => []
    },
    isLoadingTags: Boolean,
    isDarkMode: Boolean,
    styles: Object
  },
  methods: {
    handleCloseSidebar() {
      this.$emit('close-sidebar');
    },
    isTagSelected(tag) {
      if (!this.selectedTags || !this.selectedTags.length) return false;
      
      // 从格式化后的标签字符串中提取标签名称
      try {
        const tagName = tag.split('(')[0].substring(1).trim();
        return this.selectedTags.includes(tagName);
      } catch (error) {
        console.error('isTagSelected错误:', error);
        return false;
      }
    }
  }
};
</script>
