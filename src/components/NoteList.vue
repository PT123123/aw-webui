<template>
  <div class="note-list" @click="handleTagClick">
    <div
      v-for="note in sortedNotes"
      :key="note.id"
      class="note-item"
      @dblclick="$emit('edit-note', note)"
      ref="noteItems"
    >
      <div class="note-content">
        <div v-html="highlightTagsInContent(note?.content)" class="content-text"></div>
        <div class="note-actions">
          <div class="dropdown" :ref="el => setDropdownRef(el, note.id)">
            <button class="dropdown-toggle" @click.stop="toggleMenu(note.id)">
              <span style="font-size: 1.2em; cursor: pointer;">⋮</span>
            </button>
            <ul v-if="openMenuId === note.id" class="dropdown-menu memos-dropdown-menu">
              <li @click.stop="handleDelete(note.id)">删除</li>
              <!-- Add other actions here if needed -->
            </ul>
          </div>
        </div>
      </div>
      <div class="note-meta">
        <span>创建: {{ note.created_at | formatDate }}</span>
        <span v-if="note.updated_at">修改: {{ note.updated_at | formatDate }}</span>
        <div v-if="note.tags && note.tags.length > 0" class="note-tags">
          标签:
          <span v-for="tag in note.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>
      </div>
    </div>
    <p v-if="sortedNotes.length === 0 && !isLoadingMore">没有笔记显示。</p>
  </div>
</template>

<script>
export default {
  props: {
    filterTag: String,
    sortedNotes: Array,
    isLoadingMore: Boolean,
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
  /* --- 重要修改 --- */
  /* 如果是 .note-item 的 overflow 导致的问题，取消下面这行的注释 */
  /* 或者如果它之前是 overflow: hidden / scroll / auto，将其改为 visible */
  overflow: visible !important; /* !important 仅作为强制覆盖，如果能直接修改源规则更好 */
  /* position: relative; */ /* 移除或注释掉这行，除非绝对需要，它会创建层叠上下文 */
}
.note-item:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
   /* --- 可能的修改点 --- */
  /* 如果是 .note-content 的 overflow 导致的问题，修改这里 */
  /* overflow: visible; */ /* 默认为 visible，但如果被其他样式覆盖了，需要显式设置 */
}

.content-text {
  flex-grow: 1;
  margin-right: 10px;
   /* 如果 content-text 本身有 overflow:hidden, 也要改 */
   /* overflow: visible; */
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
.note-content ::v-deep(.content-tag:hover) {
  background-color: #bbdefb;
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 10px 15px;
  font-size: 0.85em;
  color: #666;
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
.note-tags .tag:hover {
    background-color: #bbdefb;
}

.note-actions {
  display: inline-block;
  flex-shrink: 0;
  /* 这个元素通常不需要 overflow 或 position */
}

.dropdown {
  position: relative; /* 正确：作为菜单定位的基准 */
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

.memos-dropdown-menu {
  position: absolute; /* 正确：相对于 .dropdown 定位 */
  top: 100%;
  right: 0;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  /* 确保 z-index 足够高，尝试更大的值如果需要 */
  z-index: 1050; /* 稍微提高一点，确保在常用模态框之上 */
  list-style: none;
  padding: 5px 0;
  margin: 2px 0 0 0;
  min-width: 100px;
  text-align: left;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
   /* 确保 display 和 visibility 正确 */
  display: block; /* or list-item, but block is fine */
  visibility: visible;
}

.memos-dropdown-menu li {
  padding: 8px 15px;
  cursor: pointer;
  font-size: 0.9em;
  color: #333;
  white-space: nowrap;
}

.memos-dropdown-menu li:hover {
  background-color: #f5f5f5;
}
</style>