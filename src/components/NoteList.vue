<template>
  <div
    class="note-list"
    :class="{ 'dark-mode': isDarkMode }"
    @click="handleTagClick"
  >
    <ul>
      <li
        v-for="note in sortedNotes"
        class="note-item"
        :key="note.id"
        :class="{ 'dark-mode': isDarkMode }"
        @dblclick="$emit('edit-note', note)"
        ref="noteItems"
      >
        <div
          class="note-content"
          :class="{ 'dark-mode': isDarkMode }"
        >
          <div
            v-html="highlightTagsInContent(note?.content)"
            class="content-text"
          />
          <div class="note-actions">
            <div
              class="dropdown"
              :ref="el => setDropdownRef(el, note.id)"
            >
              <button
                class="dropdown-toggle"
                @click.stop="toggleMenu(note.id)"
                :class="{ 'dark-mode': isDarkMode }"
                style="--after-display: none !important;"
              >
                <div class="menu-dots-container">
                  <div class="menu-dots"></div>
                </div>
              </button>
              <ul
                v-if="openMenuId === note.id"
                class="dropdown-menu memos-dropdown-menu"
                :class="{ 'dark-mode': isDarkMode }"
              >
                <li @click.stop="handleComment(note)" class="menu-item">
                  <span class="menu-icon">💬</span>
                  <span class="menu-text">评论</span>
                </li>
                <li class="menu-divider"></li>
                <li @click.stop="handleDelete(note)" class="menu-item delete-item">
                  <span class="menu-icon">🗑️</span>
                  <span class="menu-text">删除</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          class="note-meta"
          :class="{ 'dark-mode': isDarkMode }"
        >
          <span class="date-info">创建: {{ note.created_at | formatDate }}</span>
          <span v-if="note.updated_at" class="date-info">修改: {{ note.updated_at | formatDate }}</span>
          <div
            v-if="note.tags && note.tags.length > 0"
            class="note-tags"
          >
            标签:
            <span
              v-for="tag in note.tags"
              :key="tag"
              class="tag"
              :class="{ 'dark-mode': isDarkMode }"
            >#{{ tag }}</span>
          </div>
        </div>
      </li>
    </ul>
    <p
      v-if="sortedNotes.length === 0 && !isLoadingMore"
      :class="{ 'dark-mode': isDarkMode }"
    >
      没有笔记显示。
    </p>
  </div>
</template>

<script>
export default {
  filters: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '无效日期';
        
        // 使用更简洁的日期格式：YYYY/MM/DD HH:MM
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}/${month}/${day} ${hours}:${minutes}`;
      } catch (e) {
        console.error('[NoteList] 日期格式错误:', dateStr, e);
        return '无效日期';
      }
    },
  },
  props: {
    filterTag: String,
    sortedNotes: Array,
    isLoadingMore: Boolean,
    isDarkMode: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['edit-note', 'filter-by-tag', 'delete-note', 'show-comment-editor'],
  data() {
    return {
      openMenuId: null,
      dropdownRefs: {},
    };
  },
  watch: {
    openMenuId(newId, oldId) {
      console.log('[NoteList] Dropdown menu state changed:', { oldId, newId });
      if (newId !== null && oldId === null) {
        document.addEventListener('click', this.handleClickOutside);
      } else if (newId === null && oldId !== null) {
        document.removeEventListener('click', this.handleClickOutside);
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    setDropdownRef(el, noteId) {
      if (el) {
        this.dropdownRefs[noteId] = el;
        // console.log(`[NoteList] Dropdown reference set for note ${noteId}`);
      }
    },
    beforeUpdate() {
      console.log('[NoteList] Before update - clearing dropdown refs');
      this.dropdownRefs = {};
    },
    highlightTagsInContent(content) {
      if (!content) return '';
      try {
        // 1. 首先处理纯文本格式：将纯文本转换为HTML结构
        let htmlContent = content;
        
        // 检查内容是否已经是HTML格式（是否已包含<p>标签）
        if (!content.startsWith('<p>')) {
          // 将纯文本转换为HTML段落
          htmlContent = content
            .split('\n\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
          
          // 如果没有成功分段，就包装整个内容
          if (!htmlContent) {
            htmlContent = `<p>${content}</p>`;
          }
        }
        
        // 2. 防止HTML注入，对内容进行HTML转义
        // 注意：我们需要保留已有的HTML标签，只转义其他内容
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const escapedContent = this.processNodeForTags(tempDiv);
        
        return escapedContent;
      } catch (e) {
        console.error('[NoteList] Error highlighting tags:', e);
        return content;
      }
    },
    
    // 递归处理DOM节点，转义文本并高亮标签
    processNodeForTags(node) {
      // 如果是文本节点，处理其中的标签
      if (node.nodeType === Node.TEXT_NODE) {
        const tagRegex = /#(\w+)(?=\s|$)/g;
        return node.textContent.replace(tagRegex, (match) => {
          const tag = match.substring(1); // 去掉#前缀
          return `<span class="content-tag" data-tag="${tag}">${match}</span>`;
        });
      }
      
      // 如果是元素节点，处理其子节点
      if (node.nodeType === Node.ELEMENT_NODE) {
        // 复制节点以获取其HTML结构
        const clone = node.cloneNode(false);
        
        // 处理所有子节点
        for (const child of node.childNodes) {
          // 如果是文本节点，处理标签
          if (child.nodeType === Node.TEXT_NODE) {
            clone.innerHTML += this.processNodeForTags(child);
          } else {
            // 如果是元素节点，递归处理
            const childResult = this.processNodeForTags(child);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = childResult;
            while (tempDiv.firstChild) {
              clone.appendChild(tempDiv.firstChild);
            }
          }
        }
        
        return clone.outerHTML;
      }
      
      return '';
    },
    handleTagClick(event) {
      console.log('[NoteList] Tag click event:', event);
      if (event.target.classList.contains('content-tag')) {
        // 从data-tag属性中获取标签名称
        const tag = event.target.dataset.tag;
        if (tag) {
          console.log('[NoteList] Tag clicked:', tag);
          this.$emit('filter-by-tag', tag);
          event.stopPropagation();
        }
      }
    },
    toggleMenu(noteId) {
      console.log('[NoteList] Toggling menu for note:', noteId);
      this.openMenuId = this.openMenuId === noteId ? null : noteId;
    },
    handleDelete(note) {
      if (!note) return;
      console.log('[NoteList] Requesting delete for note:', note.id);
      this.$emit('delete-note', note);
      this.openMenuId = null;
    },
    handleComment(note) {
      console.group('[NoteList] Comment Button Debug');
      try {
        console.log('1. [NoteList] Comment button clicked for note ID:', note.id);
        console.log('2. [NoteList] Received note object:', note);

        if (!note || typeof note !== 'object' || !note.id) {
          console.error('3. [NoteList] Invalid note object or missing ID:', note);
          return;
        }

        // 使用show-comment-editor事件将笔记传递给父组件
        console.log('4. [NoteList] Emitting show-comment-editor event with note:', note);
        this.$emit('show-comment-editor', note);
        console.log('5. [NoteList] Event show-comment-editor emitted successfully.');
      } catch (error) {
        console.error('6. [NoteList] Error in handleComment:', error);
      } finally {
        console.groupEnd();
      }
    },
    handleClickOutside(event) {
      console.log('[NoteList] Checking click outside dropdown menu');
      if (this.openMenuId !== null) {
        const currentDropdown = this.dropdownRefs[this.openMenuId];
        console.log('[NoteList] Current dropdown element:', currentDropdown);
        console.log('[NoteList] Clicked element:', event.target);

        if (currentDropdown && !currentDropdown.contains(event.target)) {
          console.log('[NoteList] Click outside detected, closing menu');
          this.openMenuId = null;
        }
      }
    }
  }
};
</script>

<style scoped>
.note-list {
  margin: 0;
  background-color: transparent;
  border: none;
  --note-text-color: #333;
}
.note-list.dark-mode {
  background-color: transparent;
  --note-text-color: #e0e0e0;
}
.note-list.dark-mode > p {
  color: #888;
}
.note-list > p {
  color: #999;
  text-align: center;
  padding: 20px;
}

.note-list ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
  width: 100%;
}

.note-item {
  background: #faf9f5;
  border: 1px solid #e8e6e1;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 16px;
  box-shadow: none;
  transition: none;
  overflow: visible !important;
  position: relative;
}
.note-item.dark-mode {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.2);
  color: #e0e0e0;
}
.note-item:hover {
  box-shadow: none;
}

.note-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
  border: none;
}

.content-text {
  flex-grow: 1;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--note-text-color);
  font-size: 15px;
  line-height: 1.6;
}

.content-tag {
  color: #5b6abf;
  background: none;
  border-radius: 3px;
  padding: 0;
  margin: 0 1px;
  display: inline;
  vertical-align: baseline;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  border: none;
  box-shadow: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.content-tag:hover {
  color: #4a59ae;
}

.highlight-layer span {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  display: inline;
  vertical-align: baseline;
}

.note-content-common {
  font-size: 15px;
  line-height: 1.6;
}

.highlight-layer {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown {
  display: inline-block;
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  outline: none;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 5;
  color: #999;
}
.dropdown-toggle:hover {
  background-color: #f0efe9;
}
.dropdown-toggle.dark-mode {
  color: #777;
}
.dropdown-toggle.dark-mode:hover {
  background-color: #2a2a3e;
}

.menu-dots-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.dropdown-toggle .menu-dots {
  width: 4px;
  height: 4px;
  background-color: #999;
  border-radius: 50%;
  position: relative;
}

.dropdown-toggle .menu-dots::before,
.dropdown-toggle .menu-dots::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background-color: #999;
  border-radius: 50%;
}

.dropdown-toggle .menu-dots::before {
  left: 0;
  top: -6px;
}

.dropdown-toggle .menu-dots::after {
  left: 0;
  top: 6px;
}

.dropdown-toggle.dark-mode .menu-dots,
.dropdown-toggle.dark-mode .menu-dots::before,
.dropdown-toggle.dark-mode .menu-dots::after {
  background-color: #777;
}

.dropdown-toggle::after,
.dropdown-toggle:after,
.dropdown-toggle.dark-mode::after,
.dropdown-toggle.dark-mode:after,
button.dropdown-toggle::after,
button.dropdown-toggle:after,
.dropdown .dropdown-toggle::after,
.dropdown .dropdown-toggle:after {
  display: none !important;
  content: none !important;
  border: none !important;
  margin: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.dropdown-menu {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #fff;
  border: 1px solid #e8e6e1;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 100px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 1200;
  list-style-type: none;
  margin: 0;
}
.dropdown-menu.dark-mode {
  background-color: #2a2a3e;
  border-color: #3a3a50;
}

.dropdown-menu li.menu-item {
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  color: #555;
  display: flex;
  align-items: center;
  font-size: 14px;
}
.dropdown-menu.dark-mode li.menu-item {
  color: #ccc;
}

.dropdown-menu li.menu-item:hover {
  background-color: #f5f4f0;
}
.dropdown-menu.dark-mode li.menu-item:hover {
  background-color: #353550;
}

.dropdown-menu .menu-icon {
  margin-right: 8px;
  font-size: 1.1em;
}

.dropdown-menu .menu-text {
  flex: 1;
}

.dropdown-menu .menu-divider {
  height: 1px;
  background-color: #eee9e2;
  margin: 4px 0;
}

.dropdown-menu.dark-mode .menu-divider {
  background-color: #3a3a50;
}

.dropdown-menu .delete-item {
  color: #e53935;
}

.dropdown-menu.dark-mode .delete-item {
  color: #ff5252;
}

.comment-btn {
  background: none;
  border: none;
  color: #999;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: color 0.15s ease;
  outline: none;
}
.comment-btn.dark-mode {
  color: #777;
}

.comment-btn:hover {
  color: #5b6abf;
}
.comment-btn.dark-mode:hover {
  color: #7c8cff;
}

.note-meta {
  padding: 8px 0 0 0;
  background-color: transparent;
  border: none;
  font-size: 12px;
  color: #999;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.note-meta span {
  color: #999;
}
.note-meta .date-info {
  font-size: 12px;
  color: #bbb;
  font-weight: normal;
}
.note-meta.dark-mode {
  background-color: transparent;
  border: none;
}
.note-meta.dark-mode span {
  color: #777;
}
.note-meta.dark-mode .date-info {
  color: #666;
}

.note-tags {
  margin-left: 0;
  display: flex;
  gap: 6px;
  align-items: center;
}

.tag {
  background: none;
  color: #5b6abf;
  padding: 0;
  border-radius: 0;
  margin-left: 0;
  font-size: 12px;
}
.tag.dark-mode {
  background: none;
  color: #7c8cff;
}

.note-list.dark-mode .content-tag {
  color: #7c8cff;
  background: none;
}

.note-list.dark-mode .content-tag:hover {
  color: #9dadff;
}
</style>

<!-- 额外添加一个非scoped样式，处理外部组件框架的dropdown样式 -->
<style>
/* 处理Bootstrap或其他框架可能添加的三角形图标 */
.note-list .dropdown-toggle::after,
.note-list .dropdown-toggle:after,
.note-list button.dropdown-toggle::after,
.note-list button.dropdown-toggle:after,
.note-list [class*="dropdown"] .dropdown-toggle::after,
.note-list [class*="dropdown"] .dropdown-toggle:after,
[data-v-2ce5c6e6].dropdown-toggle::after,
[data-v-2ce5c6e6] .dropdown-toggle::after,
button[data-v-2ce5c6e6]::after,
button[data-v-2ce5c6e6]:after {
  display: none !important;
  content: none !important;
  border: none !important;
  margin: 0 !important;
  width: 0 !important;
  height: 0 !important;
  visibility: hidden !important;
  opacity: 0 !important;
}
</style>