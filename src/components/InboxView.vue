<template>
  <div :class="[styles['app-container-modified'], { [styles['dark-mode']]: isDarkMode }]">
    <div
      :class="[styles['sidebar-toggle'], { [styles['dark-mode']]: isDarkMode }]"
      @click="toggleSidebar"
    >
      <span :class="[styles['icon'], { [styles['open']]: !showSidebar }]">◀</span>
    </div>

    <InboxSidebar
      :show-sidebar="showSidebar"
      :all-tags="allTags"
      :current-tag="currentTag"
      :is-loading-tags="isLoadingTags"
      :is-dark-mode="isDarkMode"
      :styles="styles"
      @filter-by-tag="filterByTag"
      @clear-tag-filter="clearTagFilter"
      @close-sidebar="handleCloseSidebar"
    />

    <main :class="[styles['main-content'], { [styles['dark-mode']]: isDarkMode }]">
      <InboxControlsBar
        :sort-method="sortMethod"
        :is-dark-mode="isDarkMode"
        :styles="styles"
        @sort-by="sortBy"
        @refresh-data="refreshData"
      >
        <template #status-icon>
          <InboxStatusIcon
            :status-icon-class="statusIconClass"
            :status-icon-content="statusIconContent"
            :inbox-status="inboxStatus"
            :styles="styles"
          />
        </template>
      </InboxControlsBar>

      <NoteList
        :sorted-notes="sortedNotes"
        :is-loading-more="isLoadingMore"
        @edit-note="handleEditNote"
        @filter-by-tag="handleNoteListTagClick"
        @delete-note="handleDeleteNote"
        :is-dark-mode="isDarkMode"
        @show-comment-editor="handleShowCommentEditor"
      />
      <InboxComments
        :comments="comments"
        :selected-note-id-for-comments="selectedNoteIdForComments"
        :is-dark-mode="isDarkMode"
        :styles="styles"
      />

      <div
        class="load-more-trigger"
        style="height: 1px;"
      />
    </main>

    <InboxFAB
      :is-dark-mode="isDarkMode"
      :styles="styles"
      @fab-click="showInput = true"
    />

    <div
      v-if="showInput"
      style="position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:1200;max-width:100vw;width:600px;background:#222;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,0.18);padding:24px 20px 16px 20px;pointer-events:auto;"
    >
      <NoteEditor
        :show-input="showInput"
        :is-submitting="isSubmitting"
        :is-dark-mode="isDarkMode"
        :value="editContent"
        @input="editContent = $event"
        @submit-note="handleSubmit"
        @cancel-edit="cancelEdit"
      />
    </div>
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
import InboxStatusIcon from './InboxStatusIcon.vue';
import InboxSidebar from './InboxSidebar.vue';
import InboxComments from './InboxComments.vue';
import InboxControlsBar from './InboxControlsBar.vue';
import InboxFAB from './InboxFAB.vue';
import styles from './InboxView.module.css'; // 确保导入 CSS 模块

export default {
  components: {
    NoteList,
    NoteEditor,
    InboxStatusIcon,
    InboxSidebar,
    InboxComments,
    InboxControlsBar,
    InboxFAB,
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
    isDisconnected: false, // 新增：用于追踪网络断开状态
    };
  },
  computed: {
    // Status icon class based on sync state
    statusIconClass() {
      if (this.isDisconnected) return 'status-disconnected';
      if (this.isSubmitting) return 'status-syncing';
      if (this.isLoadingMore) return 'status-syncing';
      if (this.hasMore === false) return 'status-connected';
      if (this.notes.length === 0) return 'status-unknown';
      return 'status-connected';
    },
    // Status icon content (emoji or icon)
    statusIconContent() {
      switch (this.statusIconClass) {
        case 'status-syncing': return '⏳';
        case 'status-connected': return '✅';
        case 'status-disconnected': return '⚠️';
        case 'status-deleting': return '🗑️';
        case 'status-error': return '❌';
        case 'status-unknown': return '❓';
        default: return '❓';
      }
    },
    // Status tooltip/title
    inboxStatus() {
      switch (this.statusIconClass) {
        case 'status-syncing': return '同步中...';
        case 'status-connected': return '已连接';
        case 'status-disconnected': return '已断开';
        case 'status-deleting': return '正在删除...';
        case 'status-error': return '同步出错';
        case 'status-unknown': return '未知状态';
        default: return '未知状态';
      }
    },
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
      //console.log('InboxView - editContent 发生变化:', newValue);
      this.handleInput(newValue); // 注意这里传递了 newValue
    },
  },
  mounted() {
    console.log('[InboxView] 组件已挂载');
    this.loadNotes(true);
    this.loadAllTags(); // 改为加载详细标签
    this.initScrollObserver();
  },
  methods: {
    async handleDeleteNote(noteId) {
      console.log('准备删除笔记:', noteId);
      try {
        const success = await flomoApi.deleteNote(noteId);
        if (success) {
          console.log('笔记删除成功');
          // 从本地笔记列表中移除已删除的笔记
          this.notes = this.notes.filter(note => note.id !== noteId);
        } else {
          console.warn('笔记删除失败: 未找到该笔记');
        }
      } catch (error) {
        console.error('删除笔记时出错:', error);
      }
    },
    toggleSidebar() {
      this.showSidebar = !this.showSidebar;
    },
    handleCloseSidebar() {
      this.showSidebar = false;
    },
    filterByTag(formattedTag) {
      // 从格式化后的标签字符串中提取标签名称
      const tagName = formattedTag.split('(')[0].substring(1);
      if (this.currentTag === tagName) {
        this.currentTag = null;
      } else {
        this.currentTag = tagName;
      }
      console.log('设置 currentTag 为:', this.currentTag);
      this.loadNotes(true);
    },
    clearTagFilter() {
      this.currentTag = null;
      this.loadNotes(true);
    },
    async loadNotes(initialLoad = true) {
      this.isDisconnected = false; // 每次加载前重置断开状态

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

        if (newNotes.length > 0) {
          const processedNotes = newNotes.map(note => ({
            ...note,
            tags: note.tags || []
          }));
          this.notes = initialLoad ? processedNotes : [...this.notes, ...processedNotes];
          this.currentOffset += newNotes.length;
          this.hasMore = newNotes.length === 50;
        } else {
          this.hasMore = false;
        }
      } catch (error) {
        console.error('加载笔记失败:', error);
        this.hasMore = false;
        this.isDisconnected = true; // 捕获到网络错误时，设置断开状态
      } finally {
        this.isLoadingMore = false;
      }
    },

    async loadAllTags() {
      this.isLoadingTags = true;
      try {
        const response = await flomoApi.getDetailedTags(); // 改为使用 getDetailedTags
        console.log('getDetailedTags response:', response);
        this.detailedTags = response || [];
        // 兼容 detailedTags 为字符串数组或对象数组
        this.allTags = this.detailedTags.map(item => {
          let safeTag = '';
          let count = 1;
          let formattedDate = '--';
          if (typeof item === 'string') {
            safeTag = item;
          } else if (item && typeof item === 'object') {
            // 优先使用 name 字段作为标签名
            safeTag = typeof item.name === 'string' ? item.name : (typeof item.tag === 'string' ? item.tag : (typeof item.label === 'string' ? item.label : ''));
            count = item.count || 1;
            // 兼容 last_modified 或 latest_updated_at 字段
            const dateStr = item.latest_updated_at || item.last_modified;
            if (dateStr) {
              const latestUpdated = new Date(dateStr);
              formattedDate = `${String(latestUpdated.getMonth() + 1).padStart(2, '0')}-${String(latestUpdated.getDate()).padStart(2, '0')}`;
            }
          }
          const prefix = safeTag.startsWith('#') ? '' : '#';
          return `${prefix}${safeTag}(${count}) ${formattedDate}`;
        });
        console.log('处理后的 allTags:', this.allTags);
      } catch (error) {
        console.error('加载详细标签失败:', error);
        this.detailedTags = [];
        this.allTags = []; // 出错时也清空 allTags
      } finally {
        this.isLoadingTags = false;
      }
    },

    // 移除 processTags 方法，因为现在由后端处理

    refreshData() {
      console.groupCollapsed('[InboxView] 手动刷新数据 - 开始');
      try {
        this.loadNotes(true);
        this.loadAllTags(); // 同时刷新标签数据
      } finally {
        console.groupEnd();
      }
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
            this.notes.unshift({ ...response.data, tags: response.data.tags || [] });
            this.cachedDraftContent = '';
            this.editContent = '';
            // 新笔记创建成功后同时清空编辑器内容和缓存
            await this.loadNotes(true);
            await this.loadAllTags && this.loadAllTags(); // 若有标签刷新方法也一并刷新
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
      //console.log('InboxView - handleInput 接收到来自编辑器的数据:', content);
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

    async fetchComments(noteId) {
      try {
        const response = await flomoApi.getCommentsForNote(noteId);
        this.comments = response.data || [];
      } catch (error) {
        console.error('加载评论失败:', error);
        this.comments = [];
      }
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
  },
}
</script>