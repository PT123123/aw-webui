<template>
  <div class="inbox-view-container">
    <header class="inbox-header">
      <h1>我的收件箱</h1>
      <div class="header-actions">
        <div class="sort-options">
          <button 
            @click="toggleSortField" 
            class="sort-toggle-btn"
          > 
            {{ sortParams.field === 'created_at' ? '⏱ 创建时间' : '🔄 修改时间' }}
          </button>
        </div>
        <button @click="openNewNoteEditor" class="new-note-btn">
          + 新建笔记
        </button>
      </div>
    </header>

    <!-- 简单的笔记列表占位符 -->
    <div v-if="notes && notes.length > 0" class="notes-list">
      <div v-for="note in notes" :key="note.id" class="note-item" @click="openEditNoteEditor(note)">
        <h4>{{ note.content.substring(0, 30) }}{{ note.content.length > 30 ? '...' : '' }}</h4>
        <p><small>标签: {{ note.tags && note.tags.join(', ') }}</small></p>
        <small>{{ sortParams.field === 'updated_at' ? '更新于' : '创建于' }}: {{ new Date(note[sortParams.field]).toLocaleDateString() }}</small>
      </div>
    </div>
    <div v-else-if="!isLoadingNotes && notes.length === 0" class="empty-notes">
      <p>还没有笔记，点击"新建笔记"开始吧！</p>
    </div>
    <div v-else-if="isLoadingNotes">
        <p>正在加载笔记...</p>
    </div>

    <NoteEditor
      :showInput="showInput"
      :onCancelRequest="handleCancelEdit"
      @submit-note="handleSubmit"
      :isDarkMode="isDarkMode"
      :value="editContent"
      :isSubmitting="isSubmitting"
    />
  </div>
</template>

<script>
import NoteEditor from '@/components/NoteEditor.vue'; 
import flomoApi from '@/services/flomoApi.js'; // 请确认 flomoApi.js 的实际路径

export default {
  name: 'InboxView',
  components: {
    NoteEditor
  },
  data() {
    return {
      showInput: false,       
      isDarkMode: true,       
      editContent: '',        
      isSubmitting: false,    
      editingNote: null,      
      notes: [],              
      isLoadingNotes: false,
      sortParams: { // 新增排序参数
        field: 'updated_at', // 默认按更新时间排序
        order: 'desc'        // 默认降序 (最新优先)
      },
    };
  },
  computed: {
    sortButtonText() {
      if (this.sortParams.field === 'updated_at') {
        return '🔄 修改时间';
      } else {
        return '⏱ 创建时间';
      }
    }
  },
  methods: {
    toggleSortField() {
      if (this.sortParams.field === 'updated_at') {
        this.sortParams.field = 'created_at';
      } else {
        this.sortParams.field = 'updated_at';
      }
      // The order is assumed to remain 'desc' or handled by backend default
      console.log(`[views/InboxView] Sort field changed to: ${this.sortParams.field}`);
      this.fetchNotes(); // Re-fetch notes with the new sort field
    },
    sortBy(method) {
      console.log(`[views/InboxView] sortBy('${method}') called. Current field: ${this.sortParams.field}`);
      const targetField = method === 'created' ? 'created_at' : 'updated_at';
      if (this.sortParams.field !== targetField) {
        this.sortParams.field = targetField;
        this.fetchNotes();
      }
    },
    openNewNoteEditor() {
      this.editingNote = null;
      this.editContent = ''; 
      console.log('[InboxView openNewNoteEditor] About to set showInput=true. typeof this.handleCancelEdit:', typeof this.handleCancelEdit, 'Is function:', this.handleCancelEdit instanceof Function);
      this.showInput = true;
      console.log('[InboxView] Opening new note editor.');
    },
    openEditNoteEditor(noteToEdit) {
      if (!noteToEdit) {
        console.error('[InboxView] openEditNoteEditor: noteToEdit is undefined');
        return;
      }
      this.editingNote = noteToEdit;
      this.editContent = noteToEdit.content;
      console.log('[InboxView openEditNoteEditor] About to set showInput=true. typeof this.handleCancelEdit:', typeof this.handleCancelEdit, 'Is function:', this.handleCancelEdit instanceof Function);
      this.showInput = true;
      console.log(`[InboxView] Opening editor for note ID: ${noteToEdit.id}`);
    },
    handleCancelEdit() {
      console.log('[InboxView] handleCancelEdit method CALLED. Closing editor.');
      this.showInput = false;
      this.editingNote = null;
      this.editContent = '';
    },
    _internalCancelAndResetEditor() { 
      console.log('[InboxView] _internalCancelAndResetEditor (e.g., after submit)');
      this.showInput = false;
      this.editingNote = null;
      this.editContent = '';
    },
    async handleSubmit(contentFromEditor) {
      console.groupCollapsed('InboxView handleSubmit');
      const contentToCheck = contentFromEditor || '';
      console.log('Content from editor:', JSON.stringify(contentToCheck));

      if (!contentToCheck.trim()) {
        console.warn('Submit prevented: Content is empty or only whitespace.');
        console.groupEnd();
        return;
      }

      if (this.isSubmitting) {
        console.warn('Submit prevented: Already submitting.');
        console.groupEnd();
        return;
      }

      this.isSubmitting = true;
      const isEditing = !!this.editingNote;
      const noteData = { 
        content: contentToCheck,
        tags: this.extractTagsFromContent(contentToCheck)
      };
      console.log(`Preparing to ${isEditing ? 'update' : 'create'} note:`, noteData);

      try {
        if (isEditing) {
          console.log(`Updating note ID: ${this.editingNote.id}`);
          await flomoApi.updateNote(this.editingNote.id, noteData);
          
          const index = this.notes.findIndex(n => n.id === this.editingNote.id);
          if (index !== -1) {
            const updatedNoteInList = {
              ...this.notes[index],
              content: contentToCheck,
              tags: noteData.tags,
              updated_at: new Date().toISOString(),
              // created_at remains the same
            };
            this.$set(this.notes, index, updatedNoteInList);
            console.log('Note updated in local list.');
          } else {
            console.warn('Updated note not found in local list, fetching all notes might be needed.');
            await this.fetchNotes();
          }
        } else {
          console.log('Creating new note.');
          const response = await flomoApi.createNote(noteData);
          
          if (response?.data) {
            this.notes.unshift({ 
              ...response.data, 
              tags: response.data.tags || [],
              created_at: response.data.created_at || new Date().toISOString(), // Ensure created_at is present
              updated_at: response.data.updated_at || new Date().toISOString()  // Ensure updated_at is present
            });
            console.log('New note added to local list.', response.data);
          } else {
            console.warn('Create note API did not return data.');
            await this.fetchNotes();
          }
        }
        this._internalCancelAndResetEditor();
        console.log(`Note ${isEditing ? 'updated' : 'created'} successfully.`);
      } catch (error) {
        console.error(`Error ${isEditing ? 'updating' : 'creating'} note:`, error);
      } finally {
        this.isSubmitting = false;
        console.groupEnd();
      }
    },
    extractTagsFromContent(content) {
      const targetContent = content || '';
      const matches = targetContent.match(/#([^\s#]+)/g) || [];
      return matches.map(tag => tag.substring(1));
    },
    async fetchNotes() {
      this.isLoadingNotes = true;
      console.log(`[InboxView] Fetching notes (Sort by: ${this.sortParams.field}, Order: ${this.sortParams.order})...`);
      try {
        const response = await flomoApi.getNotes({ 
          limit: 50, 
          offset: 0,
          sort_by: this.sortParams.field,  // 使用排序参数
          sort_order: this.sortParams.order // 使用排序参数
        });
        this.notes = response?.data || [];
        console.log('[InboxView] Notes fetched:', this.notes.length);
      } catch (error) {
        console.error("[InboxView] Error fetching notes:", error);
        this.notes = [];
      } finally {
        this.isLoadingNotes = false;
      }
    }
  },
  mounted() {
    console.log('[InboxView] Component mounted. Fetching initial notes.');
    console.log('[InboxView mounted] typeof this.handleCancelEdit:', typeof this.handleCancelEdit, 'Is function:', this.handleCancelEdit instanceof Function);
    this.fetchNotes(); // Initial fetch with default sort
  },
  watch: {
    showInput(newVal, oldVal) {
      console.log(`[InboxView WATCH showInput] Changed from ${oldVal} to ${newVal}`);
      if (newVal) {
        console.log('[InboxView WATCH showInput true] typeof this.handleCancelEdit:', typeof this.handleCancelEdit, 'Is function:', this.handleCancelEdit instanceof Function);
      } else {
        console.log('[InboxView WATCH showInput false] Editor should be closing or closed.');
      }
    }
  }
}
</script>

<style scoped>
.inbox-view-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: sans-serif;
}
.inbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.inbox-header h1 {
    margin: 0;
    font-size: 1.8em;
}

.header-actions {
  display: flex;
  gap: 10px; /* 按钮之间的间距 */
  align-items: center;
}

/* 排序按钮容器 */
.sort-options {
  display: flex;
}

/* 排序按钮样式 */
.sort-toggle-btn {
  padding: 8px 15px;
  background-color: #5cb85c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
  min-width: 120px; /* Adjust as needed */
  text-align: center;
}

.sort-toggle-btn:hover {
  background-color: #4cae4c;
}

.sort-toggle-btn:active {
  background-color: #449d44;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}

/* Dark Mode for sort button */
:global(.dark-mode) .sort-toggle-btn {
  background-color: #4a784a;
  color: #f0f0f0;
}

:global(.dark-mode) .sort-toggle-btn:hover {
  background-color: #3e623e;
}

/* Responsive adjustments for sort button */
@media (max-width: 480px) {
  .sort-toggle-btn {
    min-width: auto; /* Allow button to shrink */
    padding: 6px 10px;
    font-size: 13px;
  }
  .header-actions {
    flex-direction: column; /* Stack buttons on very small screens */
    align-items: stretch;
  }
  .sort-toggle-btn, .new-note-btn {
    width: 100%;
  }
  .new-note-btn {
    margin-top: 5px; /* Space when stacked */
  }
}

.new-note-btn {
  padding: 10px 18px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
  white-space: nowrap; /* 防止文字换行 */
}
.new-note-btn:hover {
  background-color: #0056b3;
}

.notes-list {
  margin-top: 20px;
}
.note-item {
  border: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  padding: 15px 20px;
  margin-bottom: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.note-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.note-item h4 {
    margin-top: 0;
    margin-bottom: 8px;
    color: #333;
}
.note-item p {
    margin-bottom: 5px;
    font-size: 0.9em;
    color: #555;
}
.note-item small {
  font-size: 0.8em;
  color: #777;
}
.empty-notes {
  text-align: center;
  margin-top: 40px;
  color: #777;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .inbox-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between; /* 分散对齐按钮 */
  }
  .sort-toggle-btn, .new-note-btn {
    flex-grow: 1; /* 让按钮占据可用空间 */
    text-align: center; /* 按钮文字居中 */
    padding: 8px; /* 调整手机上的内边距 */
    font-size: 0.8em;
  }
   .header-actions { /* 允许按钮换行，以防内容过多 */
    flex-wrap: wrap;
    gap: 8px; /* 调整手机上按钮间距 */
  }
}

/* Dark Mode Styles (optional, based on isDarkMode prop if NoteEditor uses it) */
.inbox-view-container.dark-mode .note-item {
    background-color: #3a3a3a;
    border-color: #555;
}
.inbox-view-container.dark-mode .note-item h4 {
    color: #e0e0e0;
}
.inbox-view-container.dark-mode .note-item p, 
.inbox-view-container.dark-mode .note-item small {
    color: #bbb;
}
.inbox-view-container.dark-mode .inbox-header {
    border-bottom-color: #444;
}
.inbox-view-container.dark-mode .empty-notes p {
    color: #999;
}
</style>