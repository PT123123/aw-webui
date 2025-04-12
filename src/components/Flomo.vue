<template>
  <div class="flomo-container">
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
      <div v-for="note in sortedNotes" :key="note.id" class="note-item">
        <!-- 修改数据绑定路径 -->
        <div class="note-content">{{ note.content }}</div>
        <div class="note-meta">
          <!-- 添加时间戳格式化 -->
          <span>创建: {{ note.created_at | formatDate }}</span>
          <span v-if="note.updated_at">修改: {{ formatDate(note.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 悬浮按钮 -->
    <button class="floating-action" @click="handleClick">+</button>

    <!-- 输入弹窗 -->
    <div v-show="showInput" class="input-modal">
      <div class="modal-backdrop" @click.self="showInput = false"></div>
      <div class="modal-content">
        <h3 class="modal-title">新建笔记</h3>
        <textarea
          v-model.trim="newNoteContent"
          placeholder="输入你的想法..."
          ref="noteInput"
          @keydown.enter.exact.prevent="addNote"
          :disabled="isSubmitting"
        ></textarea>
        <div class="button-group">
          <button 
            @click="addNote"
            :disabled="!newNoteContent || isSubmitting"
            class="submit-btn"
          >
            {{ isSubmitting ? '提交中...' : '提交' }}
          </button>
          <button @click="showInput = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>

    <button @click="refreshData">刷新</button>
  </div>
</template>

<script>
import flomoApi from '../api/flomo'

export default {
  data() {
    return {
      notes: [],
      sortMethod: 'created',
      showInput: false,
      newNoteContent: ''
    }
  },
  async created() {
    console.log('Flomo component created')
    try {
      await this.loadNotes()
    } catch (e) {
      console.error('Flomo init error:', e)
    }
  },
  methods: {
    async loadNotes() {
      try {
        const response = await flomoApi.getNotes()
        console.log('完整响应:', response)
        // 根据实际数据结构调整（如果数据在response.data.data中）
        this.notes = response.data.data || response.data
      } catch (error) {
        console.error('加载失败:', error)
        this.notes = []
      }
    },
    async addNote() {
      if (!this.newNoteContent) {
        this.$bvToast.toast('内容不能为空', { variant: 'warning' })
        return
      }
      
      try {
        this.isSubmitting = true
        await flomoApi.createNote({ 
          content: this.newNoteContent 
        })
        await this.loadNotes() // 确保加载最新数据
        this.newNoteContent = ''
        this.showInput = false
      } catch (error) {
        console.error('创建失败:', error)
        this.$bvToast.toast(`创建失败: ${error.message}`, { variant: 'danger' })
      } finally {
        this.isSubmitting = false
      }
    },
    handleClick() {
      console.log('按钮被点击');  // 调试日志
      this.openInputModal();  // 调用输入函数
    },
    openInputModal() {
      // 打开输入弹窗的逻辑
      console.log('打开输入弹窗');
      this.showInput = true;
    }
  },
  computed: {
    sortedNotes() {
      return [...this.notes].sort((a, b) => {
        // 使用实际的时间戳字段（可能是created_at或timestamp）
        const timeA = new Date(a.created_at || a.timestamp)
        const timeB = new Date(b.created_at || b.timestamp)
        return timeB - timeA
      })
    }
  }
}
</script>

<style scoped>
/* 悬浮按钮样式 */
.floating-action {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.floating-action:hover {
  background-color: #0056b3;
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