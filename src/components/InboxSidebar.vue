<template>
  <aside :class="[styles['filter-sidebar'], { [styles['sidebar-open']]: showSidebar, [styles['dark-mode']]: isDarkMode }]">
    <div :class="[styles['sidebar-content'], { [styles['dark-mode']]: isDarkMode }]">
      <div :class="[styles['sidebar-header'], { [styles['dark-mode']]: isDarkMode }]">
        <h3>筛选选项</h3>
        <span v-if="currentTag" :class="[styles['current-filter'], { [styles['dark-mode']]: isDarkMode }]">
          (当前筛选: {{ currentTag }})
        </span>
        <button @click.stop="handleCloseSidebar" :class="[styles['close-btn'], { [styles['dark-mode']]: isDarkMode }]">×</button>
      </div>
      <div :class="[styles['tag-filter'], { [styles['dark-mode']]: isDarkMode }]">
        <h4>标签</h4>
        <ul v-if="allTags && allTags.length > 0" :class="[styles['tag-list'], { [styles['dark-mode']]: isDarkMode }]">
          <li
            v-for="tag in allTags"
            :key="tag"
            @click="$emit('filter-by-tag', tag)"
            :class="[{ [styles['active']]: currentTag === tag }, { [styles['dark-mode']]: isDarkMode }]"
          >
            {{ tag }}
          </li>
        </ul>
        <p v-else-if="!isLoadingTags" :class="{ [styles['dark-mode']]: isDarkMode }">暂无标签。</p>
        <p v-else :class="{ [styles['dark-mode']]: isDarkMode }">加载标签中...</p>
        <button v-if="currentTag" @click="$emit('clear-tag-filter')" :class="[styles['clear-filter-btn'], { [styles['dark-mode']]: isDarkMode }]">清除筛选</button>
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
    currentTag: String,
    isLoadingTags: Boolean,
    isDarkMode: Boolean,
    styles: Object
  },
  methods: {
    handleCloseSidebar() {
      this.$emit('close-sidebar');
    }
  }
};
</script>
