<template>
  <div class="inbox-container">
    <!-- 排序选项 -->
    <div class="sort-options">
      <button @click="sortBy('created')" :class="{ active: sortMethod === 'created' }">
        按创建时间
      </button>
      <button @click="sortBy('updated')" :class="{ active: sortMethod === 'updated' }">
        按修改时间
      </button>
    </div>

    <!-- 笔记列表 -->
    <div class="note-list">
      <div 
        v-for="note in sortedNotes" 
        :key="note.id" 
        class="note-item"
        @dblclick="handleEditNote(note)"
      >
        <div class="note-content">{{ note?.content }}</div>
        <div class="note-meta">
          <span>创建: {{ note.created_at | formatDate }}</span>
          <span v-if="note.updated_at">修改: {{ note.updated_at | formatDate }}</span>
        </div>
      </div>
    </div>

    <!-- 悬浮按钮 -->
    <div class="floating-action" @click="showInput = true">
      <span>+</span>
    </div>

    <!-- 修改后的输入弹窗 -->
    <div v-show="showInput" class="input-modal">
      <div class="modal-backdrop" @click.self="cancelEdit"></div>
      <div class="modal-content">
        <h3 class="modal-title">{{ editingNote ? '编辑笔记' : '新建笔记' }}</h3>
        <textarea
          v-model.trim="editContent"
          placeholder="输入你的想法..."
          ref="noteInput"
          @keydown.enter.exact.prevent="handleSubmit"
          :disabled="isSubmitting"
        ></textarea>
        <div class="button-group">
          <button 
            @click="handleSubmit"
            :disabled="!editContent || isSubmitting"
            class="submit-btn"
          >
            {{ isSubmitting ? '提交中...' : '确认' }}
          </button>
          <button @click="cancelEdit" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>

    <button @click="refreshData">刷新</button>
  </div>
</template>

<script>
import flomoApi from '../api/inbox'

export default {
  data() {
    return {
      notes: [],
      sortMethod: 'created',
      showInput: false,
      newNoteContent: '',
      isSubmitting: false, // 确保此状态存在
      editContent: '',      // [!code ++]
      editingNote: null,   // [!code ++]
    }
  },
  watch: {
    showInput(newVal) {
      console.log('弹窗状态:', newVal)
    }
  },
  // 添加过滤器
  filters: {
    formatDate(dateStr) {
      if (!dateStr) return ''  // 确保处理空值情况
      try {
        return new Date(dateStr).toLocaleString()
      } catch (e) {
        console.error('日期格式错误:', dateStr)
        return ''
      }
    }
  },

  // 添加计算属性
  computed: {
    sortedNotes() {
      // 添加空值过滤
      return [...this.notes]
        .filter(note => !!note)  // [!code ++] 确保非空
        .filter(note => !!note?.content)  // [!code ++] 过滤空内容
        .sort((a, b) => {
          // 添加日期空值处理
          const timeA = new Date(a?.created_at || 0).getTime()  // [!code ++]
          const timeB = new Date(b?.created_at || 0).getTime()  // [!code ++]
          return timeB - timeA
        })
    }
  },

  methods: {
    // 修复数据加载方法
    async loadNotes(initialLoad = true) {
      if (this.isLoadingMore) return;
      
      try {
        this.isLoadingMore = true;
        const response = await flomoApi.getNotes(50, this.currentOffset);
        
        if (initialLoad) {
          this.notes = response.data || [];
        } else {
          this.notes = [...this.notes, ...response.data];
        }
        
        this.hasMore = response.data.length === 50;
        this.currentOffset += response.data.length;
      } catch (error) {
        console.error('加载失败:', error);
      } finally {
        this.isLoadingMore = false;
      }
    },

    initScrollObserver() {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && this.hasMore && !this.isLoadingMore) {
          this.loadNotes(false);
        }
      });

      this.$nextTick(() => {
        const trigger = document.querySelector('.load-more-trigger');
        if (trigger) observer.observe(trigger);
      });
    },

    sortBy(method) {
      this.sortMethod = method;
      this.currentOffset = 0;
      this.hasMore = true;
      this.loadNotes();
    },
    refreshData() {
      this.loadNotes()
    },
    
    async addNote() {
      console.log('提交按钮被点击')
      if (!this.newNoteContent) {
        console.warn('提交被阻止：内容为空')  // [!code ++]
        this.$bvToast.toast('内容不能为空', { variant: 'warning' })
        return
      }
      console.log('开始提交到API')  // [!code ++]
      try {
        
        this.isSubmitting = true
        const response = await flomoApi.createNote({   // [!code ++]
          content: this.newNoteContent 
        })
        console.log('API响应:', response)  // [!code ++]
        
        console.log('开始刷新笔记列表')  // [!code ++]
        await this.loadNotes()
        
        this.newNoteContent = ''
        this.showInput = false
        console.log('提交完成，已重置表单')  // [!code ++]
      } catch (error) {
        console.error('创建失败:', error)
        this.$bvToast.toast(`创建失败: ${error.message}`, { variant: 'danger' })
      } finally {
        this.isSubmitting = false
      }
    },
    // 新增编辑处理方法  // [!code ++]
    handleEditNote(note) {  // [!code ++]
      this.editingNote = note  // [!code ++]
      this.editContent = note?.content  // [!code ++]
      this.showInput = true  // [!code ++]
      this.$nextTick(() => this.$refs.noteInput.focus())  // [!code ++]
    },  // [!code ++]

    // 修改后的提交方法
    async handleSubmit() {
      try {
        this.isSubmitting = true
        if (this.editingNote) {
          // 调用更新接口
          await flomoApi.updateNote(this.editingNote.id, {
            content: this.editContent
          })
          // 本地更新数据
          this.notes = this.notes.map(n => 
            n.id === this.editingNote.id ? {...n, 
              content: this.editContent,
              updated_at: new Date().toISOString()  // 添加自动更新时间
            } : n
          )
        } else {
          // 创建新笔记
          await flomoApi.createNote({ content: this.editContent })
          await this.loadNotes()
        }
        this.cancelEdit()
      } catch (error) {
        console.error('操作失败:', error)
        this.$bvToast.toast(`操作失败: ${error.message}`, { variant: 'danger' })
      } finally {
        this.isSubmitting = false
      }
    },  // [!code ++: 添加逗号]

    // 取消编辑
    cancelEdit() {  
      this.showInput = false  
      this.editingNote = null  
      this.editContent = ''  
    },  // [!code ++]

    handleEnterKey(event) {
      // 仅当按下纯Enter键时触发提交
      if (event.key === 'Enter' && !event.shiftKey) {
        this.addNote();
      }
    },
  }  // [!code --: 移除多余括号]
}
</script>

<!-- 仅修改悬浮按钮点击事件 -->
<div class="floating-action" @click="showInput = true; console.log('点击触发')">
  <span>+</span>
</div>

<style scoped>
/* 新增笔记列表样式 */
.note-list {
  margin: 20px 0;
}

.note-item {
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.note-content {
  padding: 15px;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  border-bottom: 1px solid #eee;
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  padding: 10px 15px;
  font-size: 14px;
  color: #666;
}

.note-meta span {
  margin-right: 20px;
  display: flex;
  align-items: center;
}

.note-meta span:before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ddd;
  margin-right: 8px;
}

/* 排序按钮样式优化 */
.sort-options {
  margin-bottom: 20px;
}

.sort-options button {
  margin-right: 10px;
  padding: 8px 16px;
  font-size: 14px;
  transition: all 0.3s;
}

.sort-options button.active {
  background: #007bff;
  color: white;
}

/* 刷新按钮样式 */
button[onclick="refreshData"] {
  margin-top: 20px;
  padding: 8px 16px;
  background: #6c757d;
}

button[onclick="refreshData"]:hover {
  background: #5a6268;
}

/* 悬浮按钮样式 */
.floating-action {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: #4CAF50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  z-index: 1000;
  transition: all 0.3s ease;
}

.floating-action:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
}

.input-modal {
  z-index: 1001;
}

button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
}

.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1001;
  width: 80%;
  max-width: 500px;
  
  textarea {
    width: 100%;
    height: 120px;
    margin-bottom: 10px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
  }
  
  button {
    width: 100%;
    padding: 10px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    
    &:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }
  }
  /* 新增样式 */
  .modal-title {
    margin: 0 0 15px;
    font-size: 1.2em;
    color: #333;
  }
  
  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    
    .submit-btn {
      flex: 1;
      background: #4CAF50;
      &:hover { background: #45a049; }
    }
    
    .cancel-btn {
      flex: 1;
      background: #f44336;
      &:hover { background: #da190b; }
    }
  }
}
</style>
