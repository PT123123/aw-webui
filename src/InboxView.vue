<template>
  <div :class="[styles['app-container-modified'], { [styles['dark-mode']]: isDarkMode }]" @click="handleOutsideClick">
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
            v-if="selectedTags && selectedTags.length > 0"
            :class="[styles['current-filter'], { [styles['dark-mode']]: isDarkMode }]"
          > (已选 {{ selectedTags.length }} 个标签)</span>
          <button
            @click.stop="handleCloseSidebar"
            :class="[styles['close-btn'], { [styles['dark-mode']]: isDarkMode }]"
          >
            ×
          </button>
        </div>
        <div :class="[styles['tag-filter'], { [styles['dark-mode']]: isDarkMode }]">
          <h4>标签</h4>
          
          <!-- 添加多选提示 -->
          <div class="tag-filter-tip">
            点击可多选标签 <span class="tip-badge">多选</span>
          </div>
          
          <!-- 添加已选标签显示列表 -->
          <div v-if="selectedTags && selectedTags.length > 0" :class="styles['selected-tags-list']">
            <div 
              v-for="tag in selectedTags" 
              :key="`selected-${tag}`" 
              :class="styles['selected-tag-item']"
            >
              #{{ tag }}
              <span class="remove-tag" @click.stop="removeTag(tag)">×</span>
            </div>
          </div>
          
          <ul
            v-if="allTags && allTags.length > 0"
            :class="[styles['tag-list'], { [styles['dark-mode']]: isDarkMode }]"
          >
            <li
              v-for="(tag, index) in allTags"
              :key="`tag-${index}`"
              @click.stop="directTagClick(tag)"
              style="border: 2px solid transparent; margin-bottom: 8px; padding: 10px; position: relative;"
              :style="{
                backgroundColor: isTagSelected(tag) ? '#ffeeee' : '#f5f5f5',
                borderColor: isTagSelected(tag) ? 'red' : 'transparent'
              }"
            >
              {{ tag }} 
              <span style="position: absolute; right: 5px; color: red; font-weight: bold;" v-if="isTagSelected(tag)">
                [已选中]
              </span>
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
        
        <!-- 修改当前筛选区域的显示 -->
        <div v-if="selectedTags && selectedTags.length > 0" class="current-filters" style="display: flex; margin: 0 10px; max-width: 60%;">
          <span class="filter-info" style="font-size: 14px; color: #666;">当前筛选:</span>
          <div class="filter-tags" style="display: flex; flex-wrap: wrap; gap: 5px;">
            <span 
              v-for="tag in selectedTags" 
              :key="`filter-${tag}`" 
              class="filter-tag"
              style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 4px; font-size: 13px; display: flex; align-items: center;"
            >
              #{{ tag }}
              <span 
                class="remove-filter" 
                @click.stop="removeTag(tag)"
                style="margin-left: 5px; cursor: pointer; font-weight: bold;"
              >×</span>
            </span>
          </div>
          <span class="filter-logic" style="font-size: 12px; color: #999; font-style: italic;">(显示包含任一标签的笔记)</span>
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

    <!-- 添加调试面板 -->
    <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">
      <h5 style="margin-top: 0; color: #333;">调试信息：</h5>
      <div style="margin-bottom: 10px;">
        <strong>已选标签数量：</strong> {{ selectedTags.length }}
      </div>
      <div style="margin-bottom: 10px;">
        <strong>已选标签列表：</strong>
        <ul style="margin-top: 5px; padding-left: 20px;">
          <li v-for="(tag, index) in selectedTags" :key="index" style="margin-bottom: 5px;">
            {{ tag }}
          </li>
        </ul>
        <div v-if="selectedTags.length === 0" style="font-style: italic; color: #666;">
          (暂无选中标签)
        </div>
      </div>
      <div>
        <button 
          @click="selectedTags = []" 
          style="padding: 5px 10px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
        >
          清空选中标签
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
    return {
      showSidebar: false,
      notes: [],
      sortMethod: 'created',
      showInput: false,
      isSubmitting: false,
      editContent: '',
      editingNote: null,
      selectedTags: [],
      allTags: [],
      isLoadingMore: false,
      currentOffset: 0,
      hasMore: true,
      suggestions: [],
      suggestionIndex: -1,
      highlightedContent: '',
      isLoadingTags: false,
      cachedDraftContent: '',
      selectedNoteIdForComments: null,
      isAddingComment: false,
      commentContent: '',
      comments: [],
      styles: styles,
      detailedTags: [],
    };
  },
  computed: {
    sortedNotes() {
      let filtered = [...this.notes];

      // 根据当前选中的标签进行过滤
      if (this.selectedTags && this.selectedTags.length > 0) {
        filtered = filtered.filter(note => {
          if (!note?.tags) return false;
          // 检查笔记是否包含任意选中的标签
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
  },
  mounted() {
    this.loadNotes(true);
    this.loadAllTags();
    this.initScrollObserver();
  },
  beforeDestroy() {
    // 清理无限滚动观察器
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
  },
  methods: {
    handleEditNote(note) {
      this.editingNote = { ...note }; 
      this.editContent = note.content || '';
      this.showInput = true;
    },
    async handleSubmit(contentFromEditor) {
      if (!contentFromEditor || /^\s*$/.test(contentFromEditor)) {
        return;
      }
      if (this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;
      const isEditing = !!this.editingNote;
      const noteData = { content: contentFromEditor };

      try {
        if (isEditing) {
          await flomoApi.updateNote(this.editingNote.id, noteData);

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
          const response = await flomoApi.createNote(noteData);

          if (response?.data) {
            this.notes.unshift({ ...response.data, tags: response.data.tags || [] });
            this.cachedDraftContent = ''; // 成功创建后清空缓存
          } else {
            await this.loadNotes(true);
          }
        }
        this.cancelEdit();
      } catch (error) {
        // 静默处理错误
      } finally {
        this.isSubmitting = false;
      }
    },
    cancelEdit() {
      this.showInput = false;
      
      // 仅在编辑现有笔记时重置内容
      if (!this.editingNote) {
        // 保留内容供下次使用
      } else {
        this.editContent = ''; // 如果是编辑现有笔记，则清除
      }
      this.editingNote = null;
      this.suggestions = [];
      this.suggestionIndex = -1;
      this.highlightedContent = '';
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
      } catch (error) {
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
      this.selectedNoteIdForComments = noteId;
      this.fetchComments(noteId); // Call the method to fetch comments
    },
    async fetchComments(noteId) {
      try {
        const response = await flomoApi.getCommentsForNote(noteId);
        if (response.status !== 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.comments = response.data;
      } catch (error) {
        this.comments = [];
      }
    },
    handleShowCommentEditor(note) {
      this.selectedNoteIdForComments = note.id;
      this.isAddingComment = true;

      // 获取笔记创建时间并格式化为YYYYMMDDHHmmss
      const createdAt = new Date(note.created_at);
      const zettelId = createdAt.toISOString()
        .replace(/[-:T]/g, '')
        .split('.')[0]; // 格式如: 20231120153045

      this.commentContent = `[[${zettelId}]] `;

      this.fetchComments(note.id);
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
          this.commentContent = '';
          this.isAddingComment = false;
          this.fetchComments(this.selectedNoteIdForComments);
        }
      } catch (error) {
        // 静默处理错误
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
          this.loadNotes(false);
        }
      }, options);

      this.$nextTick(() => {
        const trigger = this.$el.querySelector('.load-more-trigger');
        if (trigger) {
          observer.observe(trigger);
        }
      });
      this.scrollObserver = observer;
    },
    toggleSortMethod() {
      this.sortMethod = this.sortMethod === 'created' ? 'updated' : 'created';
    },
    sortBy(method) {
      console.log(`sortBy('${method}') 被调用，为兼容旧代码重定向到 toggleSortMethod()`);
      // 如果当前排序方法已经是请求的方法，不做任何事情
      if (this.sortMethod === method) return;
      // 否则切换到请求的方法
      this.sortMethod = method;
    },
    directTagClick(tag) {
      console.log(`[DEBUG] 点击标签: ${tag}`);
      // 从格式化后的标签字符串中提取标签名称
      const tagName = tag.split('(')[0].substring(1).trim();
      console.log(`[DEBUG] 提取的标签名: ${tagName}`);
      
      // 检查标签是否已经选中
      const index = this.selectedTags.indexOf(tagName);
      console.log(`[DEBUG] 当前选中标签: ${JSON.stringify(this.selectedTags)}, 索引: ${index}`);
      
      // 创建新数组以保证Vue能检测到变化
      const newSelectedTags = [...this.selectedTags];
      
      // 切换选中状态
      if (index !== -1) {
        // 如果已选中，则移除
        newSelectedTags.splice(index, 1);
        console.log(`[DEBUG] 移除标签: ${tagName}, 新数组: ${JSON.stringify(newSelectedTags)}`);
      } else {
        // 如果未选中，则添加
        newSelectedTags.push(tagName);
        console.log(`[DEBUG] 添加标签: ${tagName}, 新数组: ${JSON.stringify(newSelectedTags)}`);
      }
      
      // 更新数组
      this.selectedTags = newSelectedTags;
      console.log(`[DEBUG] 更新后的selectedTags: ${JSON.stringify(this.selectedTags)}`);
      
      // 强制更新视图和数据
      this.$nextTick(() => {
        console.log(`[DEBUG] nextTick中的selectedTags: ${JSON.stringify(this.selectedTags)}`);
        this.$forceUpdate();
        this.loadNotes(true);
      });
    },
    isTagSelected(tag) {
      try {
        // 标签格式是 "#标签名(数量) 日期"，提取标签名
        const tagName = tag.split('(')[0].substring(1).trim();
        const result = this.selectedTags.includes(tagName);
        console.log(`[DEBUG] 检查标签: ${tag}, 提取名称: ${tagName}, 是否选中: ${result}, 当前选中: ${JSON.stringify(this.selectedTags)}`);
        return result;
      } catch (error) {
        console.error(`[ERROR] isTagSelected错误:`, error);
        return false;
      }
    },
    handleOutsideClick(event) {
      // 检查是否点击的是侧边栏或切换按钮
      const sidebar = this.$el.querySelector('aside');
      const toggleButton = this.$el.querySelector(`.${styles['sidebar-toggle']}`);
      
      // 如果点击的不是侧边栏或切换按钮，并且侧边栏是打开的，则关闭侧边栏
      if (this.showSidebar && 
          sidebar && 
          !sidebar.contains(event.target) && 
          toggleButton && 
          !toggleButton.contains(event.target)) {
        this.showSidebar = false;
      }
    },
    toggleSidebar() {
      console.log('切换侧边栏状态');
      this.showSidebar = !this.showSidebar;
    },
    handleCloseSidebar() {
      this.showSidebar = false;
    },
    handleNoteListTagClick(tag) {
      console.log(`从笔记列表点击标签: ${tag}`);
      
      // 检查标签是否已被选中
      const index = this.selectedTags.indexOf(tag);
      
      // 创建新数组以保证Vue能检测到变化
      const newSelectedTags = [...this.selectedTags];
      
      // 切换选中状态
      if (index !== -1) {
        newSelectedTags.splice(index, 1);
        console.log(`移除标签: ${tag}`);
      } else {
        newSelectedTags.push(tag);
        console.log(`添加标签: ${tag}`);
      }
      
      // 更新数组
      this.selectedTags = newSelectedTags;
      
      // 确保侧边栏打开
      if (!this.showSidebar && this.selectedTags.length > 0) {
        this.showSidebar = true;
      }
      
      // 强制更新视图和数据
      this.$nextTick(() => {
        this.$forceUpdate();
        this.loadNotes(true);
      });
    },
    removeTag(tag) {
      console.log(`尝试移除标签: ${tag}`);
      // 检查标签是否已存在
      const index = this.selectedTags.indexOf(tag);
      
      // 如果找到了标签，则移除它
      if (index !== -1) {
        // 创建新数组并移除指定标签
        const newSelectedTags = [...this.selectedTags];
        newSelectedTags.splice(index, 1);
        
        // 使用新数组更新状态
        this.selectedTags = newSelectedTags;
        console.log(`移除后的标签: ${this.selectedTags}`);
        
        // 强制更新视图和数据
        this.$nextTick(() => {
          this.$forceUpdate(); // 强制重新渲染
          this.loadNotes(true); // 重新加载数据
        });
      } else {
        console.warn(`未找到标签: ${tag}，当前标签: ${this.selectedTags}`);
      }
    },
    refreshData() {
      this.loadNotes(true);
      this.loadAllTags();
    },
    async loadAllTags() {
      this.isLoadingTags = true;
      
      try {
        const response = await flomoApi.getDetailedTags();
        
        if (response) {
          this.detailedTags = response;
          
          // 格式化标签显示
          this.allTags = this.detailedTags.map(item => {
            const tag = item.tag;
            const count = item.count;
            const latestUpdated = item.latest_updated_at ? new Date(item.latest_updated_at) : null;
            const formattedDate = latestUpdated ?
              `${String(latestUpdated.getMonth() + 1).padStart(2, '0')}-${String(latestUpdated.getDate()).padStart(2, '0')}` :
              '--';
            const prefix = tag.startsWith('#') ? '' : '#';
            return `${prefix}${tag}(${count}) ${formattedDate}`;
          });
        } else {
          this.detailedTags = [];
          this.allTags = [];
        }
      } catch (error) {
        this.detailedTags = [];
        this.allTags = [];
      } finally {
        this.isLoadingTags = false;
      }
    },
    async loadNotes(forceReload = false) {
      try {
        if (forceReload) {
          this.currentOffset = 0;
          this.hasMore = true;
          this.notes = [];
          this.isLoadingMore = true;
        } else if (this.isLoadingMore || !this.hasMore) {
          return;
        } else {
          this.isLoadingMore = true;
        }
        
        const response = await flomoApi.getNotes({
          offset: this.currentOffset,
          limit: 20,
        });
        
        if (response?.data) {
          const newNotes = response.data;
          
          if (newNotes.length < 20) {
            this.hasMore = false;
          }
          
          if (forceReload) {
            this.notes = newNotes;
          } else {
            this.notes = [...this.notes, ...newNotes];
          }
          
          this.currentOffset += newNotes.length;
        } else {
          this.hasMore = false;
        }
      } catch (error) {
        this.hasMore = false;
      } finally {
        this.isLoadingMore = false;
      }
    },
    clearTagFilter() {
      this.selectedTags = []; 
      this.$nextTick(() => {
        this.$forceUpdate();
        this.loadNotes(true); 
      });
    }
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

/* 添加标签筛选样式 */
.current-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 10px;
  max-width: 60%;
}

.filter-info {
  font-size: 14px;
  color: #666;
}

:global(.dark-mode) .filter-info {
  color: #ccc;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.filter-tag {
  background-color: #007bff;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  align-items: center;
}

:global(.dark-mode) .filter-tag {
  background-color: #bd93f9;
  color: #282a36;
}

.remove-filter {
  margin-left: 5px;
  cursor: pointer;
  font-weight: bold;
}

.remove-filter:hover {
  opacity: 0.8;
}

.filter-logic {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

:global(.dark-mode) .filter-logic {
  color: #777;
}

/* 添加标签筛选提示样式 */
.tag-filter-tip {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  padding: 4px 8px;
  background-color: #f8f8f8;
  border-radius: 4px;
  border-left: 3px solid #007bff;
  margin-top: 5px;
}

:global(.dark-mode) .tag-filter-tip {
  color: #aaa;
  background-color: #333;
  border-left-color: #bd93f9;
}

.tip-badge {
  background-color: #007bff;
  color: white;
  padding: 1px 5px;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 5px;
  font-weight: bold;
}

:global(.dark-mode) .tip-badge {
  background-color: #bd93f9;
  color: #282a36;
}

/* 改进的多选样式 */
.checkbox-container {
  display: inline-block;
  position: relative;
  margin-right: 8px; /* Adjusted from 10px for potentially better alignment */
  vertical-align: middle;
  width: 20px;
  height: 20px;
  flex-shrink: 0; 
}

.checkbox-container input[type="checkbox"] {
  opacity: 0;
  position: absolute;
}

.checkbox-container label {
  position: relative;
  cursor: pointer;
  padding-left: 25px; /* This might need review if checkbox is not aligned */
  display: inline-block;
  width: 20px;
  height: 20px;
}

.checkbox-container label:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border: 2px solid #999;
  background: #fff;
  border-radius: 3px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.checkbox-container input[type="checkbox"]:checked + label:before {
  background: #007bff;
  border-color: #007bff;
}

.checkbox-container input[type="checkbox"]:checked + label:after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  animation: checkmark 0.2s ease-in-out;
}

@keyframes checkmark {
  0% {
    opacity: 0;
    transform: rotate(45deg) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: rotate(45deg) scale(1);
  }
}

:global(.dark-mode) .checkbox-container label:before {
  border-color: #6272a4;
  background: #282a36;
}

:global(.dark-mode) .checkbox-container input[type="checkbox"]:checked + label:before {
  background: #bd93f9;
  border-color: #bd93f9;
}

:global(.dark-mode) .checkbox-container input[type="checkbox"]:checked + label:after {
  border-color: #282a36;
}

/* 确保选中标签的样式 (li[data-selected="true"]) 优先且正确应用 */
/* 这些样式应该已经在您的 scoped style 中了，请确认它们无误 */
li[data-selected="true"] {
  background-color: rgba(0, 123, 255, 0.2) !important;
  color: #0056b3 !important;
  font-weight: 600 !important;
  border-left: 4px solid #0056b3 !important;
  transition: background-color 0.2s ease, color 0.2s ease, border-left-color 0.2s ease;
}

li[data-selected="true"].dark-mode { 
  background-color: rgba(189, 147, 249, 0.25) !important;
  color: #d1b3ff !important;
  border-left-color: #bd93f9 !important;
}

/* 确保复选框容器和标签文本正确对齐 */
.tag-list li {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tag-list li:not([data-selected="true"]):hover {
  background-color: rgba(0, 0, 0, 0.05);
}

:global(.dark-mode) .tag-list li:not([data-selected="true"]):hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.tag-text {
  flex-grow: 1; 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>