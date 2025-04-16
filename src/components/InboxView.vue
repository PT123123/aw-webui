<template>
  <div class="app-container-modified">
    <div class="sidebar-toggle" @click="toggleSidebar">
      <span class="icon" :class="{ open: !showSidebar }">▶</span>
    </div>

    <aside class="filter-sidebar" :class="{ 'sidebar-open': showSidebar }">
      <div class="sidebar-content">
        <div class="sidebar-header">
          <h3>筛选选项</h3>
          <span v-if="currentTag" class="current-filter"> (当前筛选: #{{ currentTag }})</span>
          <button @click.stop="handleCloseSidebar" class="close-btn">×</button>
        </div>
        <div class="tag-filter">
          <h4>标签</h4>
          <ul v-if="allTags && allTags.length > 0" class="tag-list">
            <li
              v-for="tag in allTags"
              :key="tag"
              @click="filterByTag(tag)"
              :class="{ active: currentTag === tag }"
            >
              #{{ tag }}
            </li>
          </ul>
          <p v-else-if="!isLoadingTags">暂无标签。</p>
          <p v-else>加载标签中...</p>
          <button v-if="currentTag" @click="clearTagFilter" class="clear-filter-btn">清除筛选</button>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <div class="controls">
        <div class="sort-options">
          <button @click="sortBy('created')" :class="{ active: sortMethod === 'created' }">按创建时间</button>
          <button @click="sortBy('updated')" :class="{ active: sortMethod === 'updated' }">按修改时间</button>
        </div>
        <button @click="refreshData" class="refresh-btn">刷新</button>
      </div>

      <NoteList
        :sortedNotes="sortedNotes"
        :isLoadingMore="isLoadingMore"
        @edit-note="handleEditNote"
        @filter-by-tag="handleNoteListTagClick"
        @delete-note="handleDeleteNote"
      />
      <script>
        console.log('InboxView - Sorted Notes:', this.sortedNotes && this.sortedNotes.map(note => ({ id: note.id, type: typeof note.id })));
      </script>

      <div class="load-more-trigger" style="height: 1px;"></div>
    </main>

    <div class="floating-action" @click="showInput = true">
      <span>+</span>
    </div>

    <NoteEditor
      v-if="showInput"
      :showInput="showInput"
      :editingNote="editingNote"
      :editContent="editContent"
      :isSubmitting="isSubmitting"
      :suggestions="suggestions"
      :suggestionIndex="suggestionIndex"
      :highlightedContent="highlightedContent"
      @cancel-edit="cancelEdit"
      @input-content="handleInput"
      @keydown-content="handleKeyDown"
      @apply-suggestion="applySuggestion"
      @submit-note="handleSubmit"
    />
  </div>
</template>

<script>
import flomoApi from '../api/inbox'; // 确保路径正确
import NoteList from './NoteList.vue';
import NoteEditor from './NoteEditor.vue';

export default {
  components: {
    NoteList,
    NoteEditor,
  },
  data() {
    return {
      showSidebar: false,
      notes: [],
      sortMethod: 'created',
      showInput: false,
      isSubmitting: false,
      editContent: '',
      editingNote: null,
      currentTag: null, // 用于存储当前选中的标签
      allTags: [], // 用于存储所有标签
      isLoadingMore: false,
      currentOffset: 0,
      hasMore: true,
      suggestions: [],
      suggestionIndex: -1,
      highlightedContent: '',
      isLoadingTags: false, // 用于指示是否正在加载标签
      cachedDraftContent: '', // 新增：用于存储未提交的草稿内容
    };
  },
  computed: {
    sortedNotes() {
      console.log('当前筛选标签:', this.currentTag);
      console.log('当前筛选标签:', this.currentTag, '笔记标签:', this.note?.tags);
      let filtered = [...this.notes];

      // 根据当前选中的标签进行过滤
      if (this.currentTag) {
        filtered = filtered.filter(note => {
          console.log('检查笔记:', note.id, '标签:', note.tags);
          return note?.tags && note.tags.includes(this.currentTag);
        });
      }

      return [...filtered]
        .filter(note => !!note?.content)
        .sort((a, b) => {
          const field = this.sortMethod === 'updated' && a.updated_at ? 'updated_at' : 'created_at';
          const timeA = new Date(a?.[field] || 0).getTime();
          const timeB = new Date(b?.[field] || 0).getTime();
          return timeB - timeA; // Descending order
        });
    },
  },
  watch: {
    showInput(newVal) {
      console.log('弹窗状态改变:', newVal, '，当前是否在编辑现有笔记:', !!this.editingNote);
      if (newVal && !this.editingNote) {
        // 如果是新建笔记，恢复缓存的草稿内容
        console.log('新建笔记弹窗打开，尝试恢复缓存:', this.cachedDraftContent);
        this.editContent = this.cachedDraftContent;
        console.log('恢复后的 editContent:', this.editContent);
      } else if (newVal && this.editingNote) {
        // 如果是编辑现有笔记，加载笔记内容
        console.log('编辑现有笔记弹窗打开，加载笔记内容:', this.editingNote.content);
        this.editContent = this.editingNote.content || '';
        this.cachedDraftContent = ''; // 编辑现有笔记时清空缓存
        console.log('编辑现有笔记，清空缓存:', this.cachedDraftContent);
      } else {
        // 如果弹窗关闭且不是在编辑现有笔记，缓存当前内容
        if (!this.editingNote) {
          console.log('新建笔记弹窗关闭，缓存当前内容:', this.editContent);
          this.cachedDraftContent = this.editContent;
          console.log('缓存后的 cachedDraftContent:', this.cachedDraftContent);
        }
      }
      if (newVal) {
        this.$nextTick(() => {
          this.$refs.noteInput?.focus();
        });
      }
    },
    editContent(newValue) {
      console.log('InboxView - editContent 发生变化:', newValue);
      this.handleInput(newValue); // 注意这里传递了 newValue
    },
  },
  filters: {
    formatDate(dateStr) {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleString();
      } catch (e) {
        console.error('日期格式错误:', dateStr, e);
        return '无效日期';
      }
    },
  },
  methods: {
    toggleSidebar() {
      const prevState = this.showSidebar;
      this.showSidebar = !prevState;
      console.log(`Sidebar toggled. Was: ${prevState}, Now: ${this.showSidebar}`);
    },
    handleCloseSidebar() {
      this.showSidebar = false;
      console.log('Sidebar closed via close button');
    },
    async loadNotes(initialLoad = true) {
      if (this.isLoadingMore && !initialLoad) return;

      this.isLoadingMore = true;
      try {
        if (initialLoad) {
          this.notes = [];
          this.currentOffset = 0;
          this.hasMore = true;
        }

        const response = await flomoApi.getNotes(50, this.currentOffset, this.currentTag);

        const newNotes = response?.data || [];
        console.log(`请求成功，响应数据:`, newNotes);

        if (newNotes.length > 0) {
          // Ensure each note has a 'tags' property (even if it's an empty array)
          const processedNotes = newNotes.map(note => ({ ...note, tags: note.tags || [] }));
          this.notes = initialLoad ? processedNotes : [...this.notes, ...processedNotes];
          this.currentOffset += newNotes.length;
          this.hasMore = newNotes.length === 50;
        } else {
          this.hasMore = false;
        }

        console.log(`当前笔记总数: ${this.notes.length}, 是否还有更多: ${this.hasMore}`);
        console.log('所有笔记数据:', this.notes.map(note => ({ id: note.id, tags: note.tags }))); // 打印所有笔记的标签

      } catch (error) {
        console.error('加载笔记失败:', error);
        this.hasMore = false;
        // Consider showing an error message to the user
      } finally {
        this.isLoadingMore = false;
      }
    },
    async loadAllTags() {
      this.isLoadingTags = true;
      try {
        const response = await flomoApi.getAllTags();
        this.allTags = response?.data || [];
        console.log('所有标签加载成功:', this.allTags);
      } catch (error) {
        console.error('加载所有标签失败:', error);
      } finally {
        this.isLoadingTags = false;
      }
    },
    async deleteNote(noteId) {
      try {
        const response = await fetch(`http://localhost:5601/inbox/notes/del/${noteId}`, { // 修改这里
          method: 'GET', // 修改这里
        });

        if (response.ok) {
          console.log(`Note with id ${noteId} deleted successfully.`);
          // 在前端更新笔记列表
          this.loadNotes(true); // 调用 loadNotes 重新加载数据
          this.loadAllTags(); // 重新加载所有标签
        } else if (response.status === 404) {
          console.error(`Note with id ${noteId} not found.`);
        } else {
          console.error('Failed to delete note:', response.status);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    },
    async handleDeleteNote(noteId) {
      console.log('InboxView 接收到删除笔记的请求，ID:', noteId);
      await this.deleteNote(noteId);
      // 删除成功后，重新加载笔记列表以更新 UI
      // this.loadNotes(true); // deleteNote 中已经调用了
    },
    filterByTag(tag) {
      if (this.currentTag === tag) {
        this.currentTag = null;
        console.log(`取消标签筛选: ${tag}`);
      } else {
        this.currentTag = tag;
        console.log(`按标签筛选: ${tag}`);
      }
      this.loadNotes(true); // 根据选中的标签重新加载笔记
    },
    // 新增处理 NoteList 标签点击的方法
    handleNoteListTagClick(tag) {
      console.log('从 NoteList 接收到的标签:', tag);
      this.filterByTag(tag);
    },
    clearTagFilter() {
      this.currentTag = null;
      this.loadNotes(true);
      console.log('已清除标签筛选');
    },
    initScrollObserver() {
      const options = {
        root: null,
        rootMargin: '0px 0px 200px 0px', // Trigger when 200px from bottom
        threshold: 0 // Trigger as soon as it enters viewport margin
      };

      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && this.hasMore && !this.isLoadingMore) {
          console.log("触发加载更多...");
          this.loadNotes(false);
        }
      }, options);

      this.$nextTick(() => {
        const trigger = this.$el.querySelector('.load-more-trigger');
        if (trigger) {
          observer.observe(trigger);
          console.log("无限滚动观察器已附加");
        } else {
          console.warn(".load-more-trigger 元素未找到");
        }
      });
      this.scrollObserver = observer;
    },
    sortBy(method) {
      if (this.sortMethod === method) return;
      this.sortMethod = method;
      console.log(`排序方式更改为: ${method}`);
      // Note list will automatically re-render due to computed property change
    },
    refreshData() {
      console.log('手动刷新数据...');
      this.loadNotes(true);
    },
    handleEditNote(note) {
      console.log('准备编辑笔记:', note.id);
      this.editingNote = { ...note }; // Use spread for a shallow copy
      this.editContent = note.content || '';
      this.showInput = true;
    },
    async handleSubmit(contentFromEditor) {
      console.log('InboxView - handleSubmit received content:', JSON.stringify(contentFromEditor));
      if (!contentFromEditor || /^\s*$/.test(contentFromEditor)) {
        console.warn('提交被阻止 - 原因: 内容为空或仅包含空白字符');
        return;
      }
      if (this.isSubmitting) {
        console.warn('提交被阻止 - 原因: 正在提交中');
        return;
      }

      this.isSubmitting = true;
      const isEditing = !!this.editingNote;
      const extractedTags = this.extractTagsFromContent(contentFromEditor);
      const noteData = { content: contentFromEditor, tags: extractedTags };

      try {
        if (isEditing) {
          console.log(`正在更新笔记 ${this.editingNote.id}`);
          await flomoApi.updateNote(this.editingNote.id, noteData);
          console.log('笔记更新成功');

          const index = this.notes.findIndex(n => n.id === this.editingNote.id);
          if (index !== -1) {
            this.notes.splice(index, 1, {
              ...this.notes[index],
              content: contentFromEditor,
              tags: extractedTags,
              updated_at: new Date().toISOString()
            });
          }
          this.sortMethod = this.sortMethod;

        } else {
          console.log('正在创建新笔记');
          const response = await flomoApi.createNote(noteData);
          console.log('笔记创建成功:', response?.data);

          if (response?.data) {
            this.notes.unshift({ ...response.data, tags: extractedTags || [] });
            this.cachedDraftContent = ''; // 成功创建后清空缓存
            console.log('新笔记创建成功，清空缓存:', this.cachedDraftContent);
          } else {
            await this.loadNotes(true);
          }
        }
        this.cancelEdit();
      } catch (error) {
        console.error(`笔记${isEditing ? '更新' : '创建'}失败:`, error);
      } finally {
        this.isSubmitting = false;
      }
    },
    cancelEdit() {
      this.showInput = false;
      console.log('取消编辑/新建。当前是否在编辑现有笔记:', !!this.editingNote);
      // 仅在编辑现有笔记时重置内容
      if (!this.editingNote) {
        // Do nothing, keep the content for the next time
        console.log('取消新建，保留 editContent:', this.editContent);
      } else {
        this.editContent = ''; // 如果是编辑现有笔记，则清除
        console.log('取消编辑现有笔记，清除 editContent:', this.editContent);
      }
      this.editingNote = null;
      this.suggestions = [];
      this.suggestionIndex = -1;
      this.highlightedContent = '';
      console.log('编辑/新建已取消');
    },
    extractTagsFromContent(content) { // 添加 content 参数
      console.log('提取标签 - 原始内容:', content); // 使用传入的 content
      const matches = content.match(/#([^\s#]+)/g) || [];
      console.log('从内容中提取的标签:', matches);
      return matches.map(tag => tag.substring(1));
    },
    highlightText() {
      if (!this.$refs.noteInput) return;
      let content = this.editContent || '';
      content = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      content = content.replace(/(#)([^\s#]+)/g, '<span class="tag-highlight">$1$2</span>');
      content = content.replace(/\n/g, '<br>');
      this.highlightedContent = content;

      this.$nextTick(() => {
        if (this.$refs.highlight && this.$refs.noteInput) {
          this.$refs.highlight.scrollTop = this.$refs.noteInput.scrollTop;
        }
      });
    },
    handleInput(content) { // 修改 handleInput 接收 content 参数
      console.log('InboxView - handleInput 接收到来自编辑器的数据:', content);
      this.editContent = content; // 将接收到的内容更新到 editContent
      this.highlightText();
      this.detectTagContext();
    },
    detectTagContext() {
      const textarea = this.$refs.noteInput;
      if (!textarea) return;
      const text = this.editContent;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastHashIndex = textBeforeCursor.lastIndexOf('#');

      if (lastHashIndex === -1) {
        this.suggestions = []; return;
      }
      const textBetween = textBeforeCursor.substring(lastHashIndex + 1);
      if (/\s/.test(textBetween) || textBetween.includes('#')) { // Also check for another #
        this.suggestions = []; return;
      }
      const currentTag = textBetween;
      this.updateSuggestions(currentTag);
    },
    async updateSuggestions(query) {
      // Fetch all tags for suggestions
      try {
        const response = await flomoApi.getAllTags();
        const availableTags = response?.data || [];

        if (!query) {
          this.suggestions = availableTags.slice(0, 5).map(tag => ({ path: tag }));
        } else {
          const lowerQuery = query.toLowerCase();
          this.suggestions = availableTags
            .filter(tag => tag.toLowerCase().startsWith(lowerQuery))
            .slice(0, 5)
            .map(tag => ({ path: tag }));
        }
        this.suggestionIndex = -1;
        console.log("Suggestions:", this.suggestions);
      } catch (error) {
        console.error("Failed to fetch tags for suggestions:", error);
        this.suggestions = [];
      }
    },
    applySuggestion(tag) {
      const textarea = this.$refs.noteInput;
      if (!textarea) return;
      const text = this.editContent;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastHashIndex = textBeforeCursor.lastIndexOf('#');

      if (lastHashIndex !== -1) {
        const textAfterCursor = text.substring(cursorPos);
        const newText = textBeforeCursor.substring(0, lastHashIndex + 1) + tag.path + ' ' + textAfterCursor;
        this.editContent = newText;

        this.$nextTick(() => {
          const newCursorPos = lastHashIndex + 1 + tag.path.length + 1;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          this.suggestions = [];
          this.highlightText();
        });
      }
    },
    handleKeyDown(e) {
      if (this.suggestions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length;
            break;
          case 'ArrowUp':
            e.preventDefault();
            this.suggestionIndex = (this.suggestionIndex - 1 + this.suggestions.length) % this.suggestions.length;
            break;
          case 'Enter':
          case 'Tab':
            if (this.suggestionIndex !== -1) {
              e.preventDefault();
              this.applySuggestion(this.suggestions[this.suggestionIndex]);
            } else {
              this.suggestions = [];
            }
            break;
          case 'Escape':
            e.preventDefault();
            this.suggestions = [];
            break;
        }
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.handleSubmit(this.editContent); // 确保在没有建议时也传递内容
      }
    },
  },
  mounted() {
    console.log('组件已挂载，正在加载初始笔记和标签...');
    this.loadNotes(true);
    this.loadAllTags(); // 加载所有标签
    this.initScrollObserver();
  },
  beforeDestroy() {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      console.log("无限滚动观察器已断开");
    }
  }
};
</script>

<style scoped>
/* Basic Layout */
.app-container-modified {
  display: flex; /* 使用 Flexbox 布局 */
  min-height: 100vh;
  padding-top: 0; /* 移除顶部内边距 */
}

/* Sidebar Toggle Button */
.sidebar-toggle {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1050; /* Higher than sidebar potentially */
  width: 30px; /* Smaller toggle */
  height: 50px;
  background: #4CAF50;
  border-radius: 0 8px 8px 0; /* Rounded corners on the right */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
}

.sidebar-toggle .icon {
  color: white;
  transition: transform 0.3s;
  font-size: 18px;
}

.sidebar-toggle .icon.open {
  transform: rotate(180deg);
}

/* Filter Sidebar */
.filter-sidebar {
  width: 240px;
  height: 100vh; /* Full height */
  background: #f8f9fa; /* Light background */
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease; /* 使用 transform 而不是 left */
  transform: translateX(-240px); /* 初始隐藏 */
  z-index: 1000; /* Ensure it's above main content */
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  top: 0; /* 紧贴顶部 */
  position: sticky; /* 使用 sticky 定位 */
  left: 0; /* 确保在父容器的左侧 */
}

.filter-sidebar.sidebar-open {
  transform: translateX(0); /* 滑入 */
}

.sidebar-content {
  padding: 15px;
  overflow-y: auto; /* Allow scrolling if content overflows */
  flex-grow: 1;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1em;
  color: #333;
}

.sidebar-header .current-filter {
  font-size: 0.9em;
  color: #777;
  margin-left: 5px;
}

.sidebar-header .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0 5px;
}
.close-btn:hover {
  color: #000;
}

/* Tag Filter Styles */
.tag-filter {
  padding: 10px;
}

.tag-filter h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1em;
  color: #555;
}

.tag-list {
  list-style: none;
  padding: 0;
}

.tag-list li {
  padding: 8px 10px;
  margin-bottom: 5px;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #333;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
}

.tag-list li:hover {
  background-color: #e0e0e0;
}

.tag-list li.active {
  background-color: #007bff;
  color: white;
}

.clear-filter-btn {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  padding: 5px 0;
  font-size: 0.9em;
  display: block;
  margin-top: 10px;
}

.clear-filter-btn:hover {
  text-decoration: underline;
}

/* Main Content Area */
.main-content {
  flex-grow: 1; /* 占据剩余空间 */
  transition: margin-left 0.3s ease;
  margin-left: 0; /* 默认没有左边距 */
  padding: 20px; /* Add padding */
}

/* Adjust main content margin when sidebar is open */
.filter-sidebar.sidebar-open ~ .main-content {
  /* 注意这里不再使用 margin-left，而是 flexbox 的特性 */
}

/* Controls */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  gap: 10px;
}

/* Sort Options */
.sort-options button {
  margin-right: 10px;
  padding: 8px 16px;
  font-size: 14px;
  transition: all 0.3s;
  border: 1px solid #ccc;
  background-color: #fff;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
}
.sort-options button:last-child {
  margin-right: 0;
}
.sort-options button:hover {
  background-color: #f1f1f1;
}
.sort-options button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

/* Refresh Button Style */
.refresh-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}
.refresh-btn:hover {
  background: #5a6268;
}

/* Floating Action Button */
.floating-action {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
  background: #4CAF50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  z-index: 990;
  transition: all 0.3s ease;
}
.floating-action:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
}

/* Load More Trigger Style (make it invisible but occupy space) */
.load-more-trigger {
    height: 1px;
    margin-top: 20px;
    visibility: hidden; /* Keeps space but invisible */
}
</style>

<style scoped>
/* 添加以下样式规则 */
.content-tag {
color: #1e88e5 !important;
background-color: #e3f2fd;
border-radius: 3px;
padding: 0 2px;
cursor: pointer;
text-decoration: underline;
}

.content-tag:hover {
background-color: #bbdefb;
}
</style>