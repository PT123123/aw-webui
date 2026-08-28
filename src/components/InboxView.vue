<template>
  <div :class="[styles['app-container-modified'], { [styles['dark-mode']]: isDarkMode }]" @click="handleOutsideClick">
    <div
      :class="[styles['sidebar-toggle'], { [styles['dark-mode']]: isDarkMode }]"
      @click="toggleSidebar"
    >
      <span :class="[styles['icon'], { [styles['open']]: !showSidebar }]">◀</span>
    </div>

    <InboxSidebar
      v-if="$route.path.includes('/inbox')"
      :show-sidebar="showSidebar"
      :all-tags="allTags"
      :selected-tags="selectedTags"
      :is-loading-tags="isLoadingTags"
      :is-dark-mode="isDarkMode"
      :styles="styles"
      @filter-by-tag="filterByTag"
      @clear-tag-filter="clearTagFilter"
      @close-sidebar="handleCloseSidebar"
      @remove-tag="removeTag"
    />

    <main :class="[styles['main-content'], { [styles['dark-mode']]: isDarkMode }]">
      <InboxControlsBar
        :sort-method="sortMethod"
        :is-dark-mode="isDarkMode"
        :styles="styles"
        @sort-by="sortBy"
        @refresh-data="refreshData"
        @copy-notes="copyAllNotes"
        @search-notes="handleSearch"
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
      v-if="$route.path.includes('/inbox')"
      :is-dark-mode="isDarkMode"
      :styles="styles"
      @fab-click="showInput = true"
    />

    <div
      v-if="(showInput || isAddingComment) && $route.path.includes('/inbox')"
      style="position:fixed;left:0;bottom:0;transform:none;z-index:1200;max-width:100vw;width:100%;background:#222;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,0.18);padding:24px 20px 16px 20px;pointer-events:auto;"
    >
      <div v-if="isAddingComment" style="color:#fff;margin-bottom:10px;font-size:16px;font-weight:500;">
        评论笔记 #{{ selectedNoteIdForComments }}
      </div>
      <NoteEditor
        :show-input="showInput || isAddingComment"
        :is-submitting="isSubmitting"
        :is-dark-mode="isDarkMode"
        :value="isAddingComment ? commentContent : editContent"
        @input="handleEditorInput"
        @submit-note="isAddingComment ? handleCommentSubmit($event) : handleSubmit($event)"
        @cancel-edit="isAddingComment ? cancelComment() : cancelEdit()"
        @save-draft="saveDraft()"
      />
    </div>
    <Toast
      v-if="showUndoToast"
      message="笔记已删除"
      action-text="撤销"
      :on-action="undoDelete"
      :duration="5000"
      position="bottom-center"
      :is-dark-mode="isDarkMode"
      @closed="confirmDelete"
    />
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
import Toast from './Toast.vue';
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
    Toast,
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
      selectedTags: [], // 用于多选标签
      currentSearchTerm: '', // <-- 添加搜索词状态
      deletedNote: null, // 待撤销删除的笔记（乐观删除）
      showUndoToast: false, // 撤销删除浮条显示状态
      undoTimeout: null, // 撤销浮条定时器
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
      let filtered = [...this.notes];
      console.log('笔记总数:', filtered.length, '搜索词:', this.currentSearchTerm);
      
      // 优先根据搜索词过滤 (如果存在)
      // 注意: 后端应该已经根据搜索词返回了过滤后的笔记
      // 如果前端也需要再次过滤或高亮，可以在这里处理
      // 为简化，我们假设 loadNotes 已经获取了符合搜索条件的笔记

      // 根据当前选中的标签进行过滤
      if (this.selectedTags && this.selectedTags.length > 0) {
        filtered = filtered.filter(note => {
          if (!note?.tags) return false;
          // 检查笔记是否包含任意选中的标签 (OR 逻辑)
          return this.selectedTags.some(tag => note.tags.includes(tag));
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
    
    // 确保只在inbox路径下显示筛选栏
    this.updateSidebarVisibility();
    // 监听路由变化以更新筛选栏的可见性
    this.$router.beforeEach((to, from, next) => {
      if (to.path.includes('/inbox')) {
        this.updateSidebarVisibility();
      } else {
        this.showSidebar = false;
      }
      next();
    });

    // 添加全局事件监听器，用于监听 Ctrl+F 或 Cmd+F
    window.addEventListener('keydown', this.handleGlobalSearchHotkey);
  },
  beforeDestroy() {
    // 组件销毁前移除事件监听器
    const sidebar = this.$el.querySelector('.sidebar-sidebar, .filter-sidebar');
    if (sidebar) {
      sidebar.removeEventListener('click', this.handleSidebarClick);
    } else {
      const allSidebarElements = this.$el.querySelectorAll('aside');
      if (allSidebarElements.length > 0) {
        allSidebarElements[0].removeEventListener('click', this.handleSidebarClick);
      }
    }
  },
  beforeUnmount() {
    // 移除全局事件监听器
    window.removeEventListener('keydown', this.handleGlobalSearchHotkey);
    // 清理撤销删除定时器，防止内存泄漏
    if (this.undoTimeout) {
      clearTimeout(this.undoTimeout);
      this.undoTimeout = null;
    }
  },
  methods: {
    async handleDeleteNote(note) {
      if (!note || !note.id) {
        console.warn('准备删除笔记: 无效的笔记对象', note);
        return;
      }
      console.log('准备删除笔记:', note.id);
      // 乐观删除：先本地移除，立即给用户反馈
      this.deletedNote = { ...note };
      this.notes = this.notes.filter(n => n.id !== note.id);
      try {
        const success = await flomoApi.deleteNote(note.id);
        if (success) {
          console.log('笔记删除成功，显示撤销浮条');
          // 显示撤销浮条，5 秒后自动确认删除
          this.showUndoToast = true;
          if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
          }
          this.undoTimeout = setTimeout(() => {
            this.confirmDelete();
          }, 5000);
        } else {
          console.warn('笔记删除失败: 未找到该笔记，回滚本地列表');
          this.rollbackDeletedNote();
        }
      } catch (error) {
        console.error('删除笔记时出错，回滚本地列表:', error);
        this.rollbackDeletedNote();
      }
    },
    rollbackDeletedNote() {
      if (this.deletedNote) {
        this.notes.unshift(this.deletedNote);
        this.deletedNote = null;
      }
    },
    undoDelete() {
      console.log('撤销删除笔记:', this.deletedNote && this.deletedNote.id);
      if (this.deletedNote) {
        this.notes.unshift(this.deletedNote);
        this.deletedNote = null;
      }
      if (this.undoTimeout) {
        clearTimeout(this.undoTimeout);
        this.undoTimeout = null;
      }
      this.showUndoToast = false;
    },
    confirmDelete() {
      // API 已删除成功，这里仅清理状态
      console.log('确认删除笔记:', this.deletedNote && this.deletedNote.id);
      this.deletedNote = null;
      this.showUndoToast = false;
      if (this.undoTimeout) {
        clearTimeout(this.undoTimeout);
        this.undoTimeout = null;
      }
    },
    toggleSidebar() {
      // 只在inbox路径下允许切换侧边栏
      if (this.$route.path.includes('/inbox')) {
        this.showSidebar = !this.showSidebar;
      }
    },
    handleCloseSidebar() {
      this.showSidebar = false;
    },
    filterByTag(formattedTag) {
      console.log(`[多选] 点击标签: ${formattedTag}`);
      // 从格式化后的标签字符串中提取标签名称
      try {
        const tagName = formattedTag.split('(')[0].substring(1).trim();
        console.log(`[多选] 提取的标签名: ${tagName}`);
        
        // 检查标签是否已被选中
        const index = this.selectedTags.indexOf(tagName);
        console.log(`[多选] 当前选中标签: ${JSON.stringify(this.selectedTags)}, 索引: ${index}`);
        
        // 创建新数组以确保Vue能检测到变化
        const newSelectedTags = [...this.selectedTags];
        
        // 切换选中状态
        if (index !== -1) {
          // 如果已选中，则移除
          newSelectedTags.splice(index, 1);
          console.log(`[多选] 移除标签: ${tagName}`);
        } else {
          // 如果未选中，则添加
          newSelectedTags.push(tagName);
          console.log(`[多选] 添加标签: ${tagName}`);
        }
        
        // 更新数组
        this.selectedTags = newSelectedTags;
        console.log(`[多选] 更新后的选中标签: ${this.selectedTags}`);
        
        // 加载符合过滤条件的笔记
        this.loadNotes(true);
      } catch (error) {
        console.error('[多选] 处理标签过滤时出错:', error);
      }
    },
    clearTagFilter() {
      console.log('[多选] 清除所有标签');
      this.selectedTags = [];
      
      // 加载所有笔记
      this.loadNotes(true);
    },
    async loadNotes(refresh = false) {
      if (this.isLoadingMore && !refresh) return;
      console.log('[InboxView] loadNotes called. refresh:', refresh, 'currentSearchTerm:', this.currentSearchTerm);

      this.isLoadingMore = true;
      if (refresh) {
        this.notes = [];
        this.currentOffset = 0;
        this.hasMore = true;
      }

      try {
        const params = { 
          offset: this.currentOffset, 
          limit: 20, 
          sort_by: this.sortMethod,
          search: this.currentSearchTerm || undefined,
          tags: this.selectedTags.length > 0 ? this.selectedTags.join(',') : undefined,
        };
        console.log('[InboxView] Fetching notes with params:', params);
        const response = await flomoApi.getNotes(params);
        console.log('[InboxView] API standardized response:', response);
        
        // 处理标准化后的响应数据
        if (response && response.notes) {
          this.notes = refresh ? response.notes : [...this.notes, ...response.notes];
          this.currentOffset = response.offset;
          this.hasMore = response.has_more;
          console.log(`[InboxView] Notes loaded. Total: ${this.notes.length}, HasMore: ${this.hasMore}`);
        } else {
          console.warn('[InboxView] Unexpected response format:', response);
          this.hasMore = false;
        }
      } catch (error) {
        console.error('[InboxView] 获取笔记失败:', error);
        this.isDisconnected = true; 
        this.showError('获取笔记失败，请检查网络连接');
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
      console.log('[InboxView] refreshData called');
      // 刷新时，如果当前有搜索词，应该保持搜索状态刷新
      // 或者，定义刷新是否清除搜索词
      // 当前行为: 保持搜索词刷新
      this.loadNotes(true);
      this.loadAllTags();
    },
    handleEditNote(note) {
      console.log('准备编辑笔记', note.id);
      this.editingNote = { ...note }; // Use spread for a shallow copy
      
      // 尝试从不同来源获取纯文本内容
      let plainText = '';
      
      // 1. 首先尝试从note对象中获取plainText
      if (note.plainText) {
        plainText = note.plainText;
        console.log('使用笔记对象中的纯文本内容:', plainText);
      } 
      // 2. 然后尝试从localStorage获取
      else if (note.id) {
        const storedPlainText = localStorage.getItem(`note_plaintext_${note.id}`);
        if (storedPlainText) {
          plainText = storedPlainText;
          console.log('从localStorage获取到纯文本:', plainText);
        }
      }
      
      // 3. 如果前两种方法都没有找到纯文本，尝试从HTML中提取
      if (!plainText) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content || '';
        plainText = tempDiv.textContent || '';
        console.log('从HTML中提取纯文本内容:', plainText);
        
        // 提取后保存到localStorage以备将来使用
        if (note.id && plainText) {
          localStorage.setItem(`note_plaintext_${note.id}`, plainText);
          console.log('已将从HTML提取的纯文本保存到localStorage');
        }
      }
      
      this.editContent = plainText;
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
      
      // 保存纯文本内容
      const plainText = contentFromEditor.trim();
      
      // 从纯文本中提取标签
      const extractedTags = (plainText.match(/#([^\s#]+)/g) || [])
        .map(tag => tag.substring(1)); 
      console.log('从纯文本中提取的标签:', extractedTags);
      
      // 直接使用纯文本创建笔记数据，不转换为HTML
      const noteData = { 
        content: plainText,
        tags: extractedTags
      };
      
      console.log('提交到API的纯文本数据:', noteData);
      
      try {
        if (isEditing) {
          await flomoApi.updateNote(this.editingNote.id, noteData);
          console.log('笔记更新成功');

          const index = this.notes.findIndex(n => n.id === this.editingNote.id);
          if (index !== -1) {
            this.notes.splice(index, 1, {
              ...this.notes[index],
              content: plainText,
              tags: extractedTags,
              updated_at: new Date().toISOString()
            });
          }
        } else {
          console.log('正在创建新笔记');
          const response = await flomoApi.createNote(noteData);
          console.log('笔记创建成功:', response?.data);

          if (response?.data) {
            this.notes.unshift({
              ...response.data,
              tags: response.data.tags || []
            });
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
    saveDraft() {
      console.log('保存草稿。当前内容:', this.editContent);
      // 失焦/点击外部时保存当前内容到草稿缓存（不区分新建或编辑现有笔记）
      this.cachedDraftContent = this.editContent;
      this.showInput = false;
      this.editingNote = null;
      this.suggestions = [];
      this.suggestionIndex = -1;
      this.highlightedContent = '';
      console.log('草稿已保存，下次打开将恢复');
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
      
      // 确保先关闭标准的编辑窗口
      this.showInput = false;
      this.editingNote = null;

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

    handleEditorInput(content) {
      console.log('编辑器内容变化:', content);
      if (this.isAddingComment) {
        this.commentContent = content;
      } else {
        this.editContent = content;
      }
    },
    
    handleCommentSubmit(content) {
      console.log('提交评论，内容:', content);
      if (!this.selectedNoteIdForComments || !content.trim()) {
        console.log('评论为空或没有选中笔记ID，取消提交');
        return;
      }
      
      this.isSubmitting = true;
      
      flomoApi.addCommentToNote(this.selectedNoteIdForComments, { content })
        .then(response => {
          console.log('评论提交成功:', response);
          this.commentContent = '';
          this.isAddingComment = false;
          // 刷新评论列表
          this.fetchComments(this.selectedNoteIdForComments);
          // 刷新笔记列表，因为评论现在也是笔记
          this.loadNotes(true);
          // 显示成功消息
          this.$nextTick(() => {
            console.log('评论已添加，且笔记列表已刷新');
          });
        })
        .catch(error => {
          console.error('提交评论失败:', error);
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },

    cancelComment() {
      console.log('取消评论');
      this.isAddingComment = false;
      this.commentContent = '';
      this.selectedNoteIdForComments = null;
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
    sortBy(newSortMethod) {
      console.log('[InboxView] sortBy method called by event. Received newSortMethod:', newSortMethod);
      if (this.sortMethod !== newSortMethod) {
        this.sortMethod = newSortMethod;
        console.log('[InboxView] sortMethod in data updated to:', this.sortMethod);
        // 排序后，NoteList组件会因为sortedNotes计算属性的改变而自动更新
        // 无需显式调用 fetchNotes，除非排序需要在后端完成
      } else {
        console.log('[InboxView] sortBy called but sortMethod is already:', newSortMethod, '. No change needed.');
      }
    },
    // 添加处理外部点击的方法
    handleOutsideClick(event) {
      // 如果不在inbox路径下，不处理侧边栏点击事件
      if (!this.$route.path.includes('/inbox')) {
        return;
      }
      
      // 获取 sidebar 元素
      const sidebarElement = this.$el.querySelector('aside');
      
      // 检查是否点击了侧边栏切换按钮
      const sidebarToggle = this.$el.querySelector(`.${styles['sidebar-toggle']}`);
      
      // 检查点击位置是否在侧边栏内部或切换按钮上
      const clickedInSidebar = sidebarElement && sidebarElement.contains(event.target);
      const clickedToggleButton = sidebarToggle && sidebarToggle.contains(event.target);
      
      // 如果点击来自筛选栏内部或切换按钮，不做任何处理
      if (clickedToggleButton || clickedInSidebar) {
        return;
      }
      
      // 如果筛选栏是展开的，则关闭它
      if (this.showSidebar) {
        this.showSidebar = false;
      }
    },
    async fetchNotes(reset = false) {
      try {
        if (reset) {
          this.currentOffset = 0;
          this.hasMore = true;
          this.notes = [];
        }
        
        this.isLoadingMore = true;
        
        // 构建API参数
        const params = {
          limit: 50,
          offset: this.currentOffset,
        };
        
        // 如果有选中的标签，添加到请求参数
        if (this.selectedTags.length > 0) {
          params.tags = this.selectedTags;
        }
        
        const response = await flomoApi.getNotes(params);
        
        if (response && response.data) {
          const newNotes = response.data;
          
          if (reset) {
            this.notes = newNotes;
          } else {
            this.notes = [...this.notes, ...newNotes];
          }
          
          this.currentOffset += newNotes.length;
          this.hasMore = newNotes.length === 50;
          
          return true;
        }
        
        return false;
      } catch (error) {
        this.hasMore = false;
        return false;
      } finally {
        this.isLoadingMore = false;
      }
    },
    handleNoteListTagClick(tag) {
      console.log(`[多选] 从笔记列表点击标签: ${tag}`);
      
      // 检查标签是否已被选中
      const index = this.selectedTags.indexOf(tag);
      console.log(`[多选] 当前选中标签: ${JSON.stringify(this.selectedTags)}, 索引: ${index}`);
      
      // 创建新数组以确保Vue能检测到变化
      const newSelectedTags = [...this.selectedTags];
      
      // 切换选中状态
      if (index !== -1) {
        // 如果已选中，则移除
        newSelectedTags.splice(index, 1);
        console.log(`[多选] 移除标签: ${tag}`);
      } else {
        // 如果未选中，则添加
        newSelectedTags.push(tag);
        console.log(`[多选] 添加标签: ${tag}`);
      }
      
      // 更新数组
      this.selectedTags = newSelectedTags;
      console.log(`[多选] 更新后的选中标签: ${this.selectedTags}`);
      
      // 确保侧边栏打开
      if (!this.showSidebar && this.selectedTags.length > 0) {
        this.showSidebar = true;
      }
      
      // 加载符合过滤条件的笔记
      this.loadNotes(true);
    },
    removeTag(tag) {
      console.log(`[多选] 移除标签: ${tag}`);
      // 检查标签是否已存在
      const index = this.selectedTags.indexOf(tag);
      
      // 如果找到了标签，则移除它
      if (index !== -1) {
        // 创建新数组并移除指定标签
        const newSelectedTags = [...this.selectedTags];
        newSelectedTags.splice(index, 1);
        
        // 使用新数组更新状态
        this.selectedTags = newSelectedTags;
        console.log(`[多选] 移除后的标签: ${this.selectedTags}`);
        
        // 加载符合过滤条件的笔记
        this.loadNotes(true);
      } else {
        console.warn(`[多选] 未找到标签: ${tag}, 当前标签: ${this.selectedTags}`);
      }
    },
    updateSidebarVisibility() {
      // 只在inbox路径下允许显示筛选栏
      const isInboxRoute = this.$route.path.includes('/inbox');
      if (!isInboxRoute) {
        this.showSidebar = false;
      }
    },
    async copyAllNotes() {
      if (!this.sortedNotes || this.sortedNotes.length === 0) {
        console.warn('没有可复制的笔记');
        // 显示状态图标为错误状态
        const originalIconClass = this.statusIconClass;
        const originalIconContent = this.statusIconContent;
        this.statusIconClass = 'status-error';
        this.statusIconContent = '❌';
        
        setTimeout(() => {
          this.statusIconClass = originalIconClass;
          this.statusIconContent = originalIconContent;
        }, 1500);
        return;
      }
      
      console.log('开始复制筛选后的笔记，笔记数量:', this.sortedNotes.length);
      
      // 按指定格式构建文本
      let copyText = '';
      this.sortedNotes.forEach((note) => {
        // 获取修改时间或创建时间
        const dateStr = note.updated_at || note.created_at;
        const date = new Date(dateStr);
        
        // 格式化为YYYY/MM/DD HH:MM
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}`;
        
        // 获取笔记的纯文本内容
        let plainText = note.plainText || '';
        
        // 如果没有plainText，尝试从content中提取
        if (!plainText && note.content) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = note.content;
          plainText = tempDiv.textContent || '';
        }
        
        // 添加到复制文本中，确保格式为【修改时间∣文字内容】
        copyText += `${formattedDate}∣${plainText}\n`;
      });
      
      // 使用clipboard API复制到剪贴板
      try {
        // 保存原始状态值
        const originalIconClass = this.statusIconClass;
        const originalIconContent = this.statusIconContent;
        
        // 设置为复制中状态
        this.statusIconClass = 'status-syncing';
        this.statusIconContent = '📋';
        
        // 延迟1秒再执行复制，让用户能看到复制图标
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await navigator.clipboard.writeText(copyText);
        console.log('笔记已复制到剪贴板');
        
        // 设置为复制成功状态
        this.statusIconClass = 'status-connected';
        this.statusIconContent = '✅';
        
        // 恢复原始状态
        setTimeout(() => {
          this.statusIconClass = originalIconClass;
          this.statusIconContent = originalIconContent;
        }, 1500);
      } catch (err) {
        console.error('复制失败:', err);
        
        // 显示错误图标
        this.statusIconClass = 'status-error';
        this.statusIconContent = '❌';
        
        // 尝试使用备用方法
        try {
          const textArea = document.createElement('textarea');
          textArea.value = copyText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            console.log('使用备用方法复制成功');
            // 设置为复制成功状态
            this.statusIconClass = 'status-connected';
            this.statusIconContent = '✅';
          } else {
            console.error('备用复制方法也失败了');
          }
          
          // 恢复原始状态
          setTimeout(() => {
            this.statusIconClass = originalIconClass;
            this.statusIconContent = originalIconContent;
          }, 1500);
        } catch (fallbackErr) {
          console.error('备用复制方法出错:', fallbackErr);
          
          // 恢复原始状态
          setTimeout(() => {
            this.statusIconClass = originalIconClass;
            this.statusIconContent = originalIconContent;
          }, 1500);
        }
      }
    },
    handleGlobalSearchHotkey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        // 尝试聚焦到 InboxControlsBar 中的搜索框
        // 这需要 InboxControlsBar 暴露一个方法或通过 ref 来访问输入框
        // 一个简单的方式是让用户知道搜索功能在那里，或者通过 prop 控制其焦点
        console.log('Ctrl+F pressed - placeholder for focusing search input');
        // 你可能需要通过 ref 获取 InboxControlsBar 实例并调用其内部方法来聚焦搜索框
        // 或者让 InboxControlsBar 自身处理快捷键并 focus
      }
    },
    handleSearch(searchTerm) {
      console.log('[InboxView] Search triggered with term:', searchTerm);
      this.currentSearchTerm = searchTerm.trim();
      // 如果是空字符串，视为清除搜索
      if (!this.currentSearchTerm) {
        console.log('[InboxView] Clearing search');
      }
      this.loadNotes(true); // 重新加载笔记，传递搜索词
    },
    clearSearch() { // 可选: 添加清除搜索的方法
      this.currentSearchTerm = '';
      this.loadNotes(true);
      // 你可能还需要清除 InboxControlsBar 中的输入框内容
      // 这可以通过 ref 调用子组件方法或让子组件监听 currentSearchTerm prop
    },
  },
}
</script>