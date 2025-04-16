<template>
  <div class="note-list" :class="{ 'dark-mode': isDarkMode }" @click="handleTagClick">
    <div
      v-for="note in sortedNotes"
      :key="note.id"
      class="note-item"
      :class="{ 'dark-mode': isDarkMode }"
      @dblclick="$emit('edit-note', note)"
      ref="noteItems"
    >
      <div class="note-content" :class="{ 'dark-mode': isDarkMode }">
        <div v-html="highlightTagsInContent(note?.content)" class="content-text"></div>
        <div class="note-actions">
          <div class="dropdown" :ref="el => setDropdownRef(el, note.id)">
            <button class="dropdown-toggle" @click.stop="toggleMenu(note.id)">
              <span style="font-size: 1.2em; cursor: pointer;" :class="{ 'dark-mode': isDarkMode }">⋮</span>
            </button>
            <ul v-if="openMenuId === note.id" class="dropdown-menu memos-dropdown-menu" :class="{ 'dark-mode': isDarkMode }">
              <li @click.stop="handleDelete(note.id)">删除</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="note-meta" :class="{ 'dark-mode': isDarkMode }">
        <span>创建: {{ note.created_at | formatDate }}</span>
        <span v-if="note.updated_at">修改: {{ note.updated_at | formatDate }}</span>
        <div v-if="note.tags && note.tags.length > 0" class="note-tags">
          标签:
          <span v-for="tag in note.tags" :key="tag" class="tag" :class="{ 'dark-mode': isDarkMode }">#{{ tag }}</span>
        </div>
      </div>
    </div>
    <p v-if="sortedNotes.length === 0 && !isLoadingMore" :class="{ 'dark-mode': isDarkMode }">没有笔记显示。</p>
  </div>
</template>

<script>
export default {
  props: {
    filterTag: String,
    sortedNotes: Array,
    isLoadingMore: Boolean,
    isDarkMode: {
      type: Boolean,
      default: true, // 设置默认值为 true，开启默认黑暗模式
    },
  },
  emits: ['edit-note', 'filter-by-tag', 'delete-note'],
  data() {
    return {
      openMenuId: null,
      dropdownRefs: {},
    };
  },
  watch: {
    openMenuId(newId, oldId) {
      if (newId !== null && oldId === null) {
        // 使用冒泡阶段监听器
        document.addEventListener('click', this.handleClickOutside);
      } else if (newId === null && oldId !== null) {
        document.removeEventListener('click', this.handleClickOutside);
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  filters: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? '无效日期' : date.toLocaleString();
      } catch (e) {
        console.error('日期格式错误:', dateStr, e);
        return '无效日期';
      }
    },
  },
  methods: {
    setDropdownRef(el, noteId) {
      if (el) {
        this.dropdownRefs[noteId] = el;
      }
    },
    beforeUpdate() {
      this.dropdownRefs = {};
    },
    highlightTagsInContent(content) {
      if (!content) return '';
      const tagRegex = /(#)([^\s#]+)/g;
      return content.replace(tagRegex, (match, p1, p2) => {
        return `<span class="content-tag" data-tag="${p2}">${p1}${p2}</span>`;
      });
    },
    handleTagClick(event) {
      if (event.target.classList.contains('content-tag')) {
        const tag = event.target.dataset.tag;
        this.$emit('filter-by-tag', tag);
        event.stopPropagation(); // 阻止事件冒泡到 note-item 的 dblclick
      }
    },
    toggleMenu(noteId) {
      // console.log('Toggle menu for ID:', noteId, 'Current open:', this.openMenuId);
      this.openMenuId = this.openMenuId === noteId ? null : noteId;
      // console.log('New openMenuId:', this.openMenuId);
    },
    handleDelete(noteId) {
      this.$emit('delete-note', noteId);
      this.openMenuId = null;
    },
    handleClickOutside(event) {
      if (this.openMenuId !== null) {
        const currentDropdown = this.dropdownRefs[this.openMenuId];
        if (currentDropdown && !currentDropdown.contains(event.target)) {
          // console.log('Clicked outside, closing menu.');
          this.openMenuId = null;
        }
      }
    },
  },
  computed: {
    // Computed property 'filteredNotes' was defined but never used.
    // Removed or keep if planning to use it.
  }
};
</script>

<style scoped>
/* Note List Styles */
.note-list {
  margin: 20px 0;
  background-color: #000000; /* 设置 note-list 容器的背景为黑色 */
}
.note-list.dark-mode {
  background-color: #000000; /* 确保黑暗模式下也是黑色 */
}
.note-list.dark-mode > p {
  color: #ccc;
}
.note-list > p {
  color: #777;
  text-align: center;
  padding: 20px;
}

.note-item {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s ease;
  overflow: visible !important;
}
.note-item.dark-mode {
  background: #000000; /* 设置 note-item 的背景为黑色 */
  border-color: #333;
  color: #f5f5f5;
}
.note-item:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.note-item.dark-mode:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.note-content {
  padding: 15px;
  font-size: 1rem;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  overflow: visible;
}
.note-content.dark-mode {
  color: #f5f5f5;
  border-bottom-color: #333;
}

.content-text {
  flex-grow: 1;
  margin-right: 10px;
}

/* 使用 ::v-deep (Vue 3) 或 >>> (某些 CSS 预处理器) */
.note-content ::v-deep(.content-tag) {
  color: #1e88e5 !important; /* 加 !important 确保覆盖 */
  background-color: #e3f2fd;
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  text-decoration: underline;
}
.note-content.dark-mode ::v-deep(.content-tag) {
  color: #bb86fc !important;
  background-color: #292929;
}
.note-content ::v-deep(.content-tag:hover) {
  background-color: #bbdefb;
}
.note-content.dark-mode ::v-deep(.content-tag:hover) {
  background-color: #3d3d3d;
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 10px 15px;
  font-size: 0.85em;
  color: #666;
}
.note-meta.dark-mode {
  color: #ccc;
}
.note-meta span {
  display: flex;
  align-items: center;
}

.note-tags {
  display: flex;
  align-items: center;
  gap: 5px;
}

.note-tags .tag {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 3px;
    background-color: #e3f2fd;
    color: #1e88e5;
    font-size: 0.8em;
    cursor: pointer;
}
.note-tags .tag.dark-mode {
  background-color: #292929;
  color: #bb86fc;
}
.note-tags .tag:hover {
    background-color: #bbdefb;
}
.note-tags .tag.dark-mode:hover {
  background-color: #3d3d3d;
}

.note-actions {
  display: inline-block;
  flex-shrink: 0;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.dark-mode .dropdown-toggle span {
  color: #f5f5f5;
}

.memos-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1050;
  list-style: none;
  padding: 5px 0;
  margin: 2px 0 0 0;
  min-width: 100px;
  text-align: left;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
  display: block;
  visibility: visible;
}
.memos-dropdown-menu.dark-mode {
  background-color: #000000; /* 设置下拉菜单背景为黑色 */
  border-color: #555;
}

.memos-dropdown-menu li {
  padding: 8px 15px;
  cursor: pointer;
  font-size: 0.9em;
  color: #333;
  white-space: nowrap;
}
.memos-dropdown-menu.dark-mode li {
  color: #f5f5f5;
}

.memos-dropdown-menu li:hover {
  background-color: #f5f5f5;
}
.memos-dropdown-menu.dark-mode li:hover {
  background-color: #444;
}
</style>