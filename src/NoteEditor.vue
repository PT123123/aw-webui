<template><div /></template>
<script>export default {}</script>
<template>
  <div v-show="showInput" class="input-modal" :class="{ 'dark-mode': isDarkMode }">
    <div class="modal-backdrop" :class="{ 'dark-mode': isDarkMode }"></div>
    <div class="modal-content" @click.stop :class="{ 'dark-mode': isDarkMode }">
      <div class="editor-wrapper note-content-common" :class="{ 'dark-mode': isDarkMode }">
  <pre v-if="highlightedContent" class="highlight-layer note-content-common" :class="{ 'dark-mode': isDarkMode }">
  <span v-html="highlightedContent"></span>
</pre>
        <textarea
          v-model="editContent"
          @input="$emit('input-content', $event.target.value)"
          @keydown="$emit('keydown-content', $event)"
          ref="noteInput"
          :placeholder="initialContent ? '' : '输入你的想法...'"
          :disabled="isSubmitting"
          :class="['note-content-common', { 'dark-mode': isDarkMode }]"
        ></textarea>
        <button
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="submit-btn"
          :class="{ 'dark-mode': isDarkMode }"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13L15 22L22 2Z" fill="white"/>
          </svg>
        </button>
      </div>

      <div v-if="suggestions && suggestions.length" class="tag-suggestions" :class="{ 'dark-mode': isDarkMode }">
        <div
          v-for="(tag, index) in suggestions"
          :key="tag.path || index"
          @click="$emit('apply-suggestion', tag)"
          :class="{ 'selected': suggestionIndex === index, 'dark-mode': isDarkMode }"
        >
          {{ tag.path }}
        </div>
      </div>
    </div>
    <div class="modal-actions" @click.stop :class="{ 'dark-mode': isDarkMode }">
      <button @click="handleCancel" class="cancel-btn" :class="{ 'dark-mode': isDarkMode }">取消</button>
    </div>
  </div>
</template>
<script>
export default {
  created() {
    console.log('NoteEditor组件已导入11');
  },
  props: {
    showInput: Boolean,
    editingNote: Object,
    editContent: String,
    isSubmitting: Boolean,
    suggestions: Array,
    suggestionIndex: Number,
    highlightedContent: String,
    isDarkMode: {
      type: Boolean,
      default: true,
    },
    initialContent: {
      type: String,
      default: ''
    },
    isCommentMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // 初始化本地数据，优先使用 initialContent
      localContent: this.initialContent || ''
    };
  },
  watch: {
    editContent(newVal) {
      // 同步父组件更新到本地数据
      this.localContent = newVal;
    },
    showInput(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.$refs.noteInput?.focus();
        });
      }
    }
  },
  mounted() {
    // 添加全局点击事件监听器
    document.addEventListener('mousedown', this.handleGlobalClick);
  },
  beforeDestroy() {
    // 移除全局点击事件监听器
    document.removeEventListener('mousedown', this.handleGlobalClick);
  },
  methods: {
    handleSubmit() {
      console.log('提交按钮点击 - 开始处理');
      console.groupCollapsed('NoteEditor提交检查');
      console.log('内容:', JSON.stringify(this.localContent));

      const isEmpty = !this.localContent || /^\s*$/.test(this.localContent);
      if (isEmpty || this.isSubmitting) {
        console.warn('提交被阻止 - 原因:', isEmpty ? '内容为空' : '正在提交中');
        console.groupEnd();
        return;
      }

      console.log('触发submit-note事件，内容:', JSON.stringify(this.localContent));
      this.$emit('submit-note', this.localContent);
      console.groupEnd();
    },
    handleCancel() {
      this.$emit('cancel-edit');
    },
    handleGlobalClick(e) {
      // 确保编辑器正在显示
      if (this.showInput) {
        // 检查点击是否发生在编辑器模态框内部
        const modalEl = this.$el.querySelector('.modal-content');
        const btnEl = this.$el.querySelector('.modal-actions');
        
        // 如果点击不在编辑器内容区域或按钮区域内，则触发取消编辑
        if (modalEl && btnEl && !modalEl.contains(e.target) && !btnEl.contains(e.target)) {
          this.$emit('cancel-edit');
        }
      }
    }
  },
};
</script>

<style scoped>
div { color: inherit; }
</style>

<style scoped>
/* Input Modal Styles */
.input-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1100;
}
.input-modal.dark-mode {
  /* 可以添加整体 modal 的黑暗模式样式，如果需要 */
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1099;
}
.modal-backdrop.dark-mode {
}

.modal-content {
  position: relative;
  padding: 15px;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
  z-index: 1101;
  width: 96%; /* 调整为96%宽度 */
  max-width: 800px; /* 添加最大宽度限制 */
  margin: 0 auto; /* 居中显示 */
}
.modal-content.dark-mode {
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.4);
}

.editor-wrapper {
  position: relative;
  margin: 0;
  border: none;
  border-radius: 4px;
  overflow: hidden;
  max-height: 60vh;
  padding: 4px;
  width: 100%; /* 确保内部元素填满容器 */
}
.editor-wrapper.dark-mode {
  border-color: transparent;
}

textarea {
  width: calc(100% - 8px);
  min-height: 120px;
  padding: 6px;
  margin: 0;
  border: none;
  resize: vertical;
  color: #f5f5f5;
  background-color: transparent;
  outline: none;
  caret-color: #ffffff;
  box-shadow: none;
}
textarea.dark-mode {
  color: #f5f5f5;
  background-color: transparent;
  border: none;
  outline: none;
}

.submit-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 8px;
  background: #4CAF50;
  color: white;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.submit-btn.dark-mode {
  background: #6200ee;
  color: #f5f5f5;
}

.submit-btn:hover:not(:disabled) {
  background: #43A047;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
}
.submit-btn.dark-mode:hover:not(:disabled) {
  background: #5600c7;
}

.submit-btn:disabled {
  background: #81C784;
  cursor: not-allowed;
  opacity: 0.7;
}
.submit-btn.dark-mode:disabled {
  background: #9e47ff;
}


.modal-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
.modal-actions.dark-mode {
  /* 可以添加 actions 容器的黑暗模式样式，如果需要 */
}

.cancel-btn {
  padding: 8px 15px;
  border: 1px solid #555; /* 深色边框 */
  border-radius: 4px;
  background-color: #333; /* 深色背景 */
  color: #f5f5f5; /* 浅色文字 */
  cursor: pointer;
  transition: all 0.2s ease;
}
.cancel-btn.dark-mode {
  background-color: #333;
  color: #f5f5f5;
  border-color: #555;
}

.cancel-btn:hover {
  background-color: #444;
}
.cancel-btn.dark-mode:hover {
  background-color: #444;
}


.tag-suggestions {
  background-color: #333; /* 深色背景 */
  border: 1px solid #555; /* 深色边框 */
  border-radius: 4px;
  margin-top: 5px;
  padding: 8px;
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1102;
  color: #f5f5f5; /* 浅色文字 */
}
.tag-suggestions.dark-mode {
  background-color: #333;
  color: #f5f5f5;
  border-color: #555;
}

.tag-suggestions div {
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 3px;
  color: #f5f5f5; /* 浅色文字 */
}
.tag-suggestions.dark-mode div {
  color: #f5f5f5;
}

.tag-suggestions div:hover {
  background-color: #444;
}
.tag-suggestions.dark-mode div:hover {
  background-color: #444;
}

.tag-suggestions div.selected {
  background-color: #6200ee;
  color: #f5f5f5;
}
.tag-suggestions.dark-mode div.selected {
  background-color: #6200ee;
  color: #f5f5f5;
}
.note-content-common {
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}
</style>