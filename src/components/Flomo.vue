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
    <div class="floating-action" @click="showInput = true">
      <span>+</span>
    </div>

    <!-- 输入弹窗 -->
    <!-- 输入弹窗结构 -->
    <div v-show="showInput" class="input-modal">
      <div class="modal-backdrop" @click.self="showInput = false"></div>
      <div class="modal-content">
        <h3 class="modal-title">新建笔记</h3>
        <textarea
          v-model.trim="newNoteContent"
          placeholder="输入你的想法..."
          ref="noteInput"
          @keydown.enter.exact.prevent="handleEnterKey($event)"
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
      newNoteContent: '',
      isSubmitting: false // 确保此状态存在
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
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleString()
    }
  },

  // 添加计算属性
  computed: {
    sortedNotes() {
      return [...this.notes].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime()
        const timeB = new Date(b.created_at).getTime()
        return timeB - timeA // 降序排列
      })
    }
  },

  methods: {
    // 修复数据加载方法
    async loadNotes() {
      try {
        const response = await flomoApi.getNotes()
        console.log('API响应:', response)
        // 修正数据赋值逻辑
        this.notes = response.data || []  // [!code focus]
        
        // 调试检查
        if (this.notes.length > 0) {
          console.log('首条笔记数据:', this.notes[0])
        }
      } catch (error) {
        console.error('加载失败:', error)
        this.notes = []
      }
    },

    // 添加缺失的方法
    sortBy(method) {
      this.sortMethod = method
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
  }
}
</script>

<!-- 仅修改悬浮按钮点击事件 -->
<div class="floating-action" @click="showInput = true; console.log('点击触发')">
  <span>+</span>
</div>

<style scoped>
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

methods: {
  handleEnterKey(event) {
    // 仅当按下纯Enter键时触发提交
    if (event.key === 'Enter' && !event.shiftKey) {
      this.addNote();
    }
    // 移除event.preventDefault() 保留默认输入行为
  },
}