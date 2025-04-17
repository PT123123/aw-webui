<template>
  <div v-show="showInput" class="input-modal" :class="{ 'dark-mode': isDarkMode }">
    <div class="modal-backdrop" @click.self="$emit('cancel-edit')" :class="{ 'dark-mode': isDarkMode }"></div>
    <div class="modal-content" :class="{ 'dark-mode': isDarkMode }">
      <div class="editor-wrapper" :class="{ 'dark-mode': isDarkMode }">
        <textarea
          v-model="editContent"
          @input="$emit('input-content', $event.target.value)"
          @keydown="$emit('keydown-content', $event)"
          ref="noteInput"
          :placeholder="initialContent ? '' : '输入你的想法...'"
          :disabled="isSubmitting"
          :class="{ 'dark-mode': isDarkMode }"
        >{{ initialContent }}</textarea>
        <button
          @click="handleSubmit"
          :disabled="!editContent || isSubmitting"
          class="submit-btn"
          type="button"
          :class="{ 'dark-mode': isDarkMode }"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13L15 22L22 2Z" fill="white"/>
          </svg>
        </button>
        <div class="highlight-layer" ref="highlight" :class="{ 'dark-mode': isDarkMode }">
          <span
            v-for="(part, index) in parsedContent"
            :key="index"
            :class="{'content-tag': part.isTag, 'dark-mode': isDarkMode}"
            @click="part.isTag && $emit('filter-by-tag', part.text)"
          >
            {{ part.text }}
          </span>
        </div>
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
    <div class="modal-actions" :class="{ 'dark-mode': isDarkMode }">
      <button @click.stop="handleCancel" class="cancel-btn" :class="{ 'dark-mode': isDarkMode }">取消</button>
    </div>
  </div>
</template>

<script>
export default {
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
      default: true, // 设置默认值为 true，开启默认黑暗模式
    },
    initialContent: { // 新增 prop 来接收初始内容
      type: String,
      default: ''
    },
    isCommentMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cancel-edit', 'input-content', 'keydown-content', 'apply-suggestion', 'submit-note', 'filter-by-tag'],
  mounted() {
    if (this.showInput) {
      this.$nextTick(() => {
        this.$refs.noteInput?.focus();
      });
    }
  },
  watch: {
    showInput(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.$refs.noteInput?.focus();
        });
      }
    }
  },
  methods: {
    handleTagClick(e) {
      if (e.target.classList.contains('tag-highlight')) {
        const tag = e.target.textContent;
        this.$emit('filter-by-tag', tag);
      }
    },
    handleCancel() {
      console.log('取消按钮点击');
      this.$emit('cancel-edit');
    },
    handleSubmit() {
      console.log('提交按钮点击 - 开始处理');
      console.groupCollapsed('NoteEditor提交检查');
      console.log('内容:', JSON.stringify(this.editContent));
      console.log('长度:', this.editContent?.length);
      console.log('提交状态:', this.isSubmitting);

      const isEmpty = !this.editContent || /^\s*$/.test(this.editContent);
      if (isEmpty || this.isSubmitting) {
        console.warn('提交被阻止 - 原因:', isEmpty ? '内容为空' : '正在提交中');
        console.groupEnd();
        return;
      }

      console.log('触发submit-note事件，内容:', JSON.stringify(this.editContent));
      this.$emit('submit-note', this.editContent); // 将内容作为参数传递
      console.groupEnd();
    },
    parseContent() {
      const content = this.editContent || '';
      const parts = [];
      let currentIndex = 0;
      const tagRegex = /(#)([^\s#]+)/g;
      let match;
      while ((match = tagRegex.exec(content)) !== null) {
        if (match.index > currentIndex) {
          parts.push({ text: content.substring(currentIndex, match.index), isTag: false });
        }
        parts.push({ text: match[0], isTag: true });
        currentIndex = tagRegex.lastIndex;
      }
      if (currentIndex < content.length) {
        parts.push({ text: content.substring(currentIndex), isTag: false });
      }
      return parts;
    },
  },
  computed: {
    parsedContent() {
      return this.parseContent();
    },
  },
};
</script>

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
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1099;
}
.modal-backdrop.dark-mode {
  background-color: rgba(0, 0, 0, 0.7);
}

.modal-content {
  position: relative;
  background: #000000; /* 设置 modal 内容背景为黑色 */
  padding: 15px;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
  z-index: 1101;
  width: 96%; /* 调整为96%宽度 */
  max-width: 800px; /* 添加最大宽度限制 */
  margin: 0 auto; /* 居中显示 */
  color: #f5f5f5; /* 设置默认文字颜色为浅色 */
}
.modal-content.dark-mode {
  background: #000000; /* 确保黑暗模式下也是黑色 */
  color: #f5f5f5;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.4);
}

.editor-wrapper {
  position: relative;
  margin: 0;
  border: 1px solid #333; /* 深色边框 */
  border-radius: 4px;
  overflow: hidden;
  max-height: 60vh;
  padding: 4px;
  width: 100%; /* 确保内部元素填满容器 */
  background-color: #000000; /* 设置编辑器 wrapper 背景为黑色 */
}
.editor-wrapper.dark-mode {
  border-color: #333;
  background-color: #000000; /* 确保黑暗模式下也是黑色 */
}

textarea {
  width: calc(100% - 8px); /* 考虑内边距调整宽度 */
  min-height: 120px; /* 适当减小最小高度 */
  padding: 6px; /* 调整内边距 */
  margin: 0; /* 移除外边距 */
  border: none;
  resize: vertical;
  background-color: #000000; /* 设置 textarea 背景为黑色 */
  color: #f5f5f5; /* 设置文本颜色为浅色 */
}
textarea.dark-mode {
  background-color: #000000; /* 确保黑暗模式下也是黑色 */
  color: #f5f5f5;
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

.content-tag {
  color: #bb86fc !important; /* 修改标签颜色为更深的紫色 */
  background-color: #292929; /* 深色背景 */
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  text-decoration: underline;
}
.content-tag:hover {
  background-color: #3d3d3d;
}
.content-tag.dark-mode {
  color: #bb86fc !important;
  background-color: #292929;
}
.content-tag.dark-mode:hover {
  background-color: #3d3d3d;
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

.highlight-layer {
  position: absolute;
  top: 6px;
  left: 6px;
  width: calc(100% - 12px);
  min-height: calc(120px - 12px);
  padding: 0;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: transparent; /* Hide the actual text */
  z-index: 2;
  pointer-events: none; /* Allow clicks to pass through */
  overflow-y: auto;
}
.highlight-layer.dark-mode {
  /* 颜色不需要修改，因为文本是透明的 */
}

.highlight-layer .content-tag {
  color: #bb86fc !important;
  background-color: #292929;
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  text-decoration: underline;
}
.highlight-layer.dark-mode .content-tag {
  color: #bb86fc !important;
  background-color: #292929;
}
.highlight-layer .content-tag:hover {
  background-color: #3d3d3d;
}
.highlight-layer.dark-mode .content-tag:hover {
  background-color: #3d3d3d;
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
</style>