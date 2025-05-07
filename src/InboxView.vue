<template>
  <div :class="[styles['app-container-modified'], { [styles['dark-mode']]: isDarkMode }]">
    <div
      :class="[styles['sidebar-toggle'], { [styles['dark-mode']]: isDarkMode }]"
      @click="toggleSidebar"
    >
      <span :class="[styles['icon'], { [styles['open']]: !showSidebar }]">◀</span>
    </div>

    <aside :class="[styles['filter-sidebar'], { [styles['sidebar-open']]: showSidebar, [styles['dark-mode']]: isDarkMode }]">
      <div :class="[styles['sidebar-content'], { [styles['dark-mode']]: isDarkMode }]">
        <div :class="[styles['sidebar-header'], { [styles['dark-mode']]: isDarkMode }]">
          <h3>筛选选项</h3>
          <span
            v-if="currentTag"
            :class="[styles['current-filter'], { [styles['dark-mode']]: isDarkMode }]"
          > (当前筛选: {{ currentTag }})</span>
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
              @click="filterByTag(tag)"
              :class="[{ [styles['active']]: currentTag === tag }, { [styles['dark-mode']]: isDarkMode }]"
            >
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
            v-if="currentTag"
            @click="clearTagFilter"
            :class="[styles['clear-filter-btn'], { [styles['dark-mode']]: isDarkMode }]"
          >
            清除筛选
          </button>
        </div>
      </div>
    </aside>

    <main :class="[styles['main-content'], { [styles['dark-mode']]: isDarkMode }]">
      <div :class="[styles['controls'], { [styles['dark-mode']]: isDarkMode }]">
        <div class="sort-options">
          <button @click="toggleSortMethod" class="sort-toggle-btn">
            {{ sortMethod === 'created' ? '⏱ 创建时间' : '🔄 修改时间' }}
          </button>
        </div>
        <button
          @click="refreshData"
          :class="[styles['refresh-btn'], { [styles['dark-mode']]: isDarkMode }]"
        >
          刷新
        </button>
      </div>

      <NoteList
        :sorted-notes="sortedNotes"
        :is-loading-more="isLoadingMore"
        @edit-note="handleEditNote"
        @filter-by-tag="handleNoteListTagClick"
        @delete-note="handleDeleteNote"
        :is-dark-mode="isDarkMode"
        @show-comment-editor="handleShowCommentEditor"
      />
      <div
        v-if="selectedNoteIdForComments"
        :class="[styles['comments-section'], { [styles['dark-mode']]: isDarkMode }]"
      >
        <h4>评论 (笔记 ID: {{ selectedNoteIdForComments }})</h4>
        <ul v-if="comments.length > 0">
          <li
            v-for="comment in comments"
            :key="comment.id"
          >
            {{ comment.content }}
          </li>
        </ul>
        <p v-else>
          暂无评论。
        </p>
      </div>

      <div
        class="load-more-trigger"
        style="height: 1px;"
      />
    </main>

    <div
      :class="[styles['floating-action'], { [styles['dark-mode']]: isDarkMode }]"
      @click="showInput = true"
    >
      <span>+</span>
    </div>

    <NoteEditor
      v-if="showInput || isAddingComment"
      :show-input="showInput || isAddingComment"
      :editing-note="isAddingComment ? null : editingNote"
      :edit-content="isAddingComment ? commentContent : editContent"
      :is-submitting="isSubmitting"
      :suggestions="suggestions"
      :suggestion-index="suggestionIndex"
      :highlighted-content="highlightedContent"
      :is-comment-mode="isAddingComment"
      @cancel-edit="isAddingComment ? cancelComment() : cancelEdit()"
      @input-content="handleInput"
      @keydown-content="handleKeyDown"
      @apply-suggestion="applySuggestion"
      @submit-note="isAddingComment ? submitComment() : handleSubmit($event)"
      :is-dark-mode="isDarkMode"
    />
    <div
      v-if="isAddingComment"
      :class="[styles['comment-editor-section'], { [styles['dark-mode']]: isDarkMode }]"
    >
      <h4>评论笔记 #{{ selectedNoteIdForComments }}</h4>
      <textarea
        v-model="commentContent"
        ref="commentInput"
        placeholder="输入评论内容..."
        :class="{ [styles['dark-mode']]: isDarkMode }"
      />
      <div :class="styles['comment-actions']">
        <button
          @click="submitComment"
          :class="{ [styles['dark-mode']]: isDarkMode }"
        >
          提交
        </button>
        <button
          @click="cancelComment"
          :class="{ [styles['dark-mode']]: isDarkMode }"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import flomoApi from '../api/inbox'; // 确保路径正确
import NoteList from './NoteList.vue';
import NoteEditor from './NoteEditor.vue';
import styles from './InboxView.module.css'; // 导入 CSS 模块

export default {
  components: {
    NoteList,
    NoteEditor,
  },
  props: ['isDarkMode'],
  emits: ['toggle-dark-mode'],
  data() {
    console.log('[InboxView] 初始化 data()');
    return {
      showSidebar: false,
      notes: [],
      sortMethod: 'created',
      showInput: false, // 控制笔记编辑器显示
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
      selectedNoteIdForComments: null, // 改为用于编辑器
      isAddingComment: false, // 控制评论编辑器是否显示
      commentContent: '', // 存储评论内容
      comments: [], // 存储评论列表
      styles: styles, // 将导入的 styles 对象添加到 data 中
      detailedTags: [], // 新增：用于存储从后端获取的详细标签信息
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
      if (newVal && !this.editingNote) {
        this.editContent = this.cachedDraftContent;
      } else if (newVal && this.editingNote) {
        this.editContent = this.editingNote.content || '';
        this.cachedDraftContent = ''; 
      } else {
        if (!this.editingNote) {
          this.cachedDraftContent = this.editContent;
        }
      }
      if (newVal) {
        this.$nextTick(() => {
          this.$refs.noteInput?.focus();
        });
      }
    },
    editContent(newValue) {
      this.handleInput(newValue); 
    },
  },
  created() {
    console.log('[InboxView] 组件被导入');
  },
  mounted() {
    console.log('[InboxView] 组件已挂载');
    this.loadNotes(true);
    this.loadAllTags(); // 改为加载详细标签
    this.initScrollObserver();
  },
  // ...
  methods: {
    handleEditNote(note) {
      this.editingNote = { ...note }; 
      this.editContent = note.content || '';
      this.showInput = true;
    },
    async handleSubmit(contentFromEditor) {
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
      const noteData = { content: contentFromEditor }; // 不再需要手动提取标签

      try {
        if (isEditing) {
          await flomoApi.updateNote(this.editingNote.id, noteData);
          console.log('笔记更新成功');

          const index = this.notes.findIndex(n => n.id === this.editingNote.id);
          if (index !== -1) {
            this.notes.splice(index, 1, {
              ...this.notes[index],
              content: contentFromEditor,
              tags: this.extractTagsFromContent(contentFromEditor),
              updated_at: new Date().toISOString()
            });
          }

        } else {
          console.log('正在创建新笔记');
          const response = await flomoApi.createNote(noteData);
          console.log('笔记创建成功:', response?.data);

          if (response?.data) {
        this.notes.unshift({ ...response.data, tags: response.data.tags || [] });
        this.cachedDraftContent = ''; // 成功创建后清空缓存
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
    handleInput(content) {
      
      if (this.isAddingComment) {
        this.commentContent = content;
      } else {
        this.editContent = content;
      }
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
    handleShowComments(noteId) {
      console.log('Received show-comments event for note ID:', noteId);
      this.selectedNoteIdForComments = noteId;
      this.fetchComments(noteId); // Call the method to fetch comments
    },
    async fetchComments(noteId) {
      try {
        console.log(`Workspaceing comments for note ${noteId}...`);

        // 替换为你的实际API端点
        const response = await flomoApi.getCommentsForNote(noteId);
        // 或者使用 fetch:
        // const response = await fetch(`/api/notes/${noteId}/comments`);

        if (response.status !== 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.comments = response.data;
        console.log('Comments fetched:', this.comments);
      } catch (error) {
        console.error('Error fetching comments:', error);
        this.comments = [];
      }
    },
    handleShowCommentEditor(note) {
      console.groupCollapsed('[InboxView] handleShowCommentEditor 调试');
      console.log('1. 接收到 note 对象:', note);

      this.selectedNoteIdForComments = note.id;
      this.isAddingComment = true;

      // 获取笔记创建时间并格式化为YYYYMMDDHHmmss
      const createdAt = new Date(note.created_at);
      const zettelId = createdAt.toISOString()
        .replace(/[-:T]/g, '')
        .split('.')[0]; // 格式如: 20231120153045

      this.commentContent = `[[${zettelId}]] `;

      console.log('2. 设置后的状态:', {
        isAddingComment: this.isAddingComment,
        commentContent: this.commentContent,
        selectedNoteId: this.selectedNoteIdForComments
      });

      this.fetchComments(note.id);
      console.groupEnd();
    },

    async submitComment() {
      if (!this.selectedNoteIdForComments || !this.commentContent.trim()) {
        return;
      }
      try {
        const response = await flomoApi.addCommentToNote(
          this.selectedNoteIdForComments,
          { content: this.commentContent }
        );
        if (response.status === 200 || response.status === 201) {
          console.log('评论提交成功:', response.data);
          this.commentContent = '';
          this.isAddingComment = false;
          this.fetchComments(this.selectedNoteIdForComments);
        }
      } catch (error) {
        console.error('提交评论出错:', error);
      }
    },

    cancelComment() {
      this.isAddingComment = false;
      this.commentContent = '';
    },

    extractTagsFromContent(content) {
    // 确保始终使用传入的最新内容
    const targetContent = content || '';
    const matches = targetContent.match(/#([^\s#]+)/g) || [];
    return matches.map(tag => tag.substring(1));
  },
    initScrollObserver() {
      const options = {
        root: null,
        rootMargin: '0px 0px 200px 0px',
        threshold: 0
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
    toggleSortMethod() {
      this.sortMethod = this.sortMethod === 'created' ? 'updated' : 'created';
      console.log(`排序方法切换为: ${this.sortMethod}`);
    },
    sortBy(method) {
      console.log(`sortBy('${method}') 被调用，为兼容旧代码重定向到 toggleSortMethod()`);
      // 如果当前排序方法已经是请求的方法，不做任何事情
      if (this.sortMethod === method) return;
      // 否则切换到请求的方法
      this.sortMethod = method;
    },
  },
}
</script>

<style scoped>
/* 添加排序按钮样式 */
.sort-options {
  display: flex;
  align-items: center;
}

.sort-options button {
  padding: 6px 12px;
  background-color: #5cb85c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease, transform 0.2s ease;
  min-width: 120px; /* 确保按钮有足够宽度显示文本 */
  text-align: center;
}

.sort-options button:hover {
  background-color: #4cae4c;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.sort-options button:active {
  background-color: #449d44;
  transform: translateY(0);
  box-shadow: none;
}

.sort-options button span {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 深色模式样式 */
:global(.dark-mode) .sort-options button {
  background-color: #4a784a;
  color: #e9e9e9;
}

:global(.dark-mode) .sort-options button:hover {
  background-color: #3e623e;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .sort-options button {
    min-width: 100px;
    padding: 6px 8px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .sort-options button {
    min-width: 45px; /* 更小的宽度，主要显示图标 */
    padding: 5px 6px;
    font-size: 12px;
  }
  
  /* 在小屏幕上只显示图标，隐藏文字 */
  .sort-options button span {
    display: flex;
    justify-content: center;
  }
  
  .sort-options button span::after {
    content: none; /* 清除可能有的伪元素内容 */
  }
  
  .sort-options button span::before {
    content: attr(data-mobile-text);
    font-size: 16px; /* 图标大一点，增强可点击性 */
  }
  
  /* 隐藏原始文本 */
  .sort-options button span {
    font-size: 0; /* 原文本大小设为0，只显示图标 */
  }
}

.sort-toggle-btn {
  padding: 8px 15px;
  background-color: #5cb85c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
  min-width: 120px;
}

.sort-toggle-btn:hover {
  background-color: #4cae4c;
}

.sort-toggle-btn:active {
  background-color: #449d44;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}

/* 深色模式样式 */
:global(.dark-mode) .sort-toggle-btn {
  background-color: #4a784a;
  color: #f0f0f0;
}

:global(.dark-mode) .sort-toggle-btn:hover {
  background-color: #3e623e;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .sort-toggle-btn {
    min-width: auto;
    padding: 6px 10px;
    font-size: 13px;
  }
}
</style>