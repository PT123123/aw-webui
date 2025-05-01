<template>
  <div
    class="note-list"
    :class="{ 'dark-mode': isDarkMode }"
    @click="handleTagClick"
  >
    <div
      v-for="note in sortedNotes"
      :key="note.id"
      class="note-item"
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
            >
              <span
                style="font-size: 1.2em; cursor: pointer;"
                :class="{ 'dark-mode': isDarkMode }"
              >⋮</span>
            </button>
            <ul
              v-if="openMenuId === note.id"
              class="dropdown-menu memos-dropdown-menu"
              :class="{ 'dark-mode': isDarkMode }"
            >
              <li @click.stop="handleDelete(note.id)">
                删除
              </li>
            </ul>
          </div>
          <button
            class="comment-btn"
            @click.stop="handleComment(note)"
            data-testid="comment-button"
          >
            Comment
          </button>
        </div>
      </div>
      <div
        class="note-meta"
        :class="{ 'dark-mode': isDarkMode }"
      >
        <span>创建: {{ note.created_at | formatDate }}</span>
        <span v-if="note.updated_at">修改: {{ note.updated_at | formatDate }}</span>
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
    </div>
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
        return isNaN(date.getTime()) ? '无效日期' : date.toLocaleString();
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
        const tagRegex = /(#)([^\s#]+)/g;
        return content.replace(tagRegex, (match, p1, p2) => {
          return `<span class="content-tag" data-tag="${p2}">${p1}${p2}</span>`;
        });
      } catch (e) {
        console.error('[NoteList] Error highlighting tags:', e);
        return content;
      }
    },
    handleTagClick(event) {
      console.log('[NoteList] Tag click event:', event);
      if (event.target.classList.contains('content-tag')) {
        const tag = event.target.dataset.tag;
        console.log('[NoteList] Tag clicked:', tag);
        this.$emit('filter-by-tag', tag);
        event.stopPropagation();
      }
    },
    toggleMenu(noteId) {
      console.log('[NoteList] Toggling menu for note:', noteId);
      this.openMenuId = this.openMenuId === noteId ? null : noteId;
    },
    handleDelete(noteId) {
      console.log('[NoteList] Requesting delete for note:', noteId);
      this.$emit('delete-note', noteId);
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
/* 样式部分保持不变 */
.note-list {
  margin: 20px 0;
  background-color: #000000;
}
.note-list.dark-mode {
  background-color: #000000;
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
  position: relative;
}
.note-item.dark-mode {
  background: #000000;
  border-color: #333;
  color: #f5f5f5;
}
.note-item:hover {
  box-shadow: 0 3px 7px rgba(0,0,0,0.1);
}

.note-content {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.note-content.dark-mode {
}

.content-text {
  flex-grow: 1;
  white-space: pre-wrap;
  word-break: break-word;
  margin-right: 10px;
  color: #333;
}
.content-text.dark-mode {
  color: #f5f5f5;
}

.note-actions {
  position: relative;
}

.dropdown {
  display: inline-block;
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  padding: 5px;
  cursor: pointer;
  outline: none;
}
.dropdown-toggle.dark-mode {
  color: #f5f5f5;
}

.dropdown-menu {
  display: block !important; /* 或者 inline-block */
  visibility: visible !important;
  opacity: 1 !important;
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #f9f9f9;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 5px 0;
  min-width: 80px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  z-index: 1200;
}
.dropdown-menu.dark-mode {
  background-color: #333;
  border-color: #555;
}

.dropdown-menu li {
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: #333;
}
.dropdown-menu.dark-mode li {
  color: #f5f5f5;
}

.dropdown-menu li:hover {
  background-color: #eee;
}
.dropdown-menu.dark-mode li:hover {
  background-color: #555;
}

.comment-btn {
  background: none;
  border: 1px solid #007bff;
  color: #007bff;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease, color 0.2s ease;
  outline: none;
  margin-left: 5px;
}
.comment-btn.dark-mode {
  border-color: #6200ee;
  color: #6200ee;
}

.comment-btn:hover {
  background-color: #007bff;
  color: white;
}
.comment-btn.dark-mode:hover {
  background-color: #6200ee;
  color: white;
}

.note-meta {
  padding: 10px 15px;
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  border-radius: 0 0 8px 8px;
  font-size: 0.85em;
  color: #777;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.note-meta.dark-mode {
  background-color: #222;
  border-top-color: #333;
  color: #ccc;
}

.note-tags {
  margin-left: auto;
}

.tag {
  background-color: #e7f2ff;
  color: #007bff;
  padding: 3px 6px;
  border-radius: 4px;
  margin-left: 5px;
  font-size: 0.8em;
}
.tag.dark-mode {
  background-color: #37474f;
  color: #64b5f6;
}
</style>