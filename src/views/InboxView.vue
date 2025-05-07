<template>
  <div class="inbox-view-container">
    <header class="inbox-header">
      <h1>我的收件箱</h1>
      <button @click="openNewNoteEditor" class="new-note-btn">
        + 新建笔记
      </button>
    </header>

    <!-- 简单的笔记列表占位符 -->
    <div v-if="notes && notes.length > 0" class="notes-list">
      <div v-for="note in notes" :key="note.id" class="note-item" @click="openEditNoteEditor(note)">
        <h4>{{ note.content.substring(0, 30) }}{{ note.content.length > 30 ? '...' : '' }}</h4>
        <p><small>标签: {{ note.tags && note.tags.join(', ') }}</small></p>
        <small>更新于: {{ new Date(note.updated_at).toLocaleDateString() }}</small>
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
    };
  },
  methods: {
    // --- 方法来控制 NoteEditor 的显示 ---
    // 你需要根据实际的触发方式来实现这些，例如绑定到某个按钮的点击事件
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

    // --- 事件处理方法 ---
    handleCancelEdit() {
      console.log('[InboxView] handleCancelEdit method CALLED. Closing editor.');
      this.showInput = false;
      this.editingNote = null;
      this.editContent = '';
    },
    
    // 这个 cancelEdit 方法似乎是在 handleSubmit 成功后调用的，逻辑上与 handleCancelEdit 重复
    // 考虑是否可以统一为一个方法，或者确保其用途清晰
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
              updated_at: new Date().toISOString()
            };
            // 在 Vue 2 中，使用 Vue.set 或 this.$set 来确保数组更新的响应性
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
              tags: response.data.tags || [] 
            });
            console.log('New note added to local list.', response.data);
          } else {
            console.warn('Create note API did not return data.');
            await this.fetchNotes();
          }
        }
        this._internalCancelAndResetEditor(); // 关闭并重置编辑器状态
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
      console.log('[InboxView] Fetching notes...');
      try {
        const response = await flomoApi.getNotes({ limit: 50, offset: 0 });
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
    this.fetchNotes();
  },
  watch: {
    showInput(newVal, oldVal) {
      console.log(`[InboxView WATCH showInput] Changed from ${oldVal} to ${newVal}`);
      if (newVal) {
        // 当 showInput 变为 true 时，也检查一下 handleCancelEdit
        console.log('[InboxView WATCH showInput true] typeof this.handleCancelEdit:', typeof this.handleCancelEdit, 'Is function:', this.handleCancelEdit instanceof Function);
      } else {
        // 当 showInput 变为 false 时 (例如编辑器关闭后)
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
.new-note-btn {
  padding: 10px 18px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
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
.empty-notes,
.is-loading-notes {
  text-align: center;
  color: #777;
  margin-top: 50px;
  font-size: 1.1em;
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