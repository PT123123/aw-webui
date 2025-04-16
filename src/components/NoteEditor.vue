<template>
  <div v-show="showInput" class="input-modal">
    <div class="modal-backdrop" @click.self="$emit('cancel-edit')"></div>
    <div class="modal-content">
      <div class="editor-wrapper">
        <textarea
          v-model="editContent"
          @input="$emit('input-content', $event.target.value)"
          @keydown="$emit('keydown-content', $event)"
          ref="noteInput"
          placeholder="输入你的想法..."
          :disabled="isSubmitting"
        ></textarea>
        <button
          @click="handleSubmit"
          :disabled="!editContent || isSubmitting"
          class="submit-btn"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13L15 22L22 2Z" fill="white"/>
          </svg>
        </button>
        <div class="highlight-layer" ref="highlight">
          <span
            v-for="(part, index) in parsedContent"
            :key="index"
            :class="{'content-tag': part.isTag}"
            @click="part.isTag && $emit('filter-by-tag', part.text)"
          >
            {{ part.text }}
          </span>
        </div>
      </div>

      <div v-if="suggestions && suggestions.length" class="tag-suggestions">
        <div
          v-for="(tag, index) in suggestions"
          :key="tag.path || index"
          @click="$emit('apply-suggestion', tag)"
          :class="{ 'selected': suggestionIndex === index }"
        >
          {{ tag.path }}
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button @click.stop="handleCancel" class="cancel-btn">取消</button>
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
    }
  }
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

.modal-content {
  position: relative;
  background: white;
  padding: 15px;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
  z-index: 1101;
  width: 96%; /* 调整为96%宽度 */
  max-width: 800px; /* 添加最大宽度限制 */
  margin: 0 auto; /* 居中显示 */
}

.editor-wrapper {
  position: relative;
  margin: 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  max-height: 60vh;
  padding: 4px;
  width: 100%; /* 确保内部元素填满容器 */
}

textarea {
  width: calc(100% - 8px); /* 考虑内边距调整宽度 */
  min-height: 120px; /* 适当减小最小高度 */
  padding: 6px; /* 调整内边距 */
  margin: 0; /* 移除外边距 */
  border: none;
  resize: vertical;
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

.submit-btn:hover:not(:disabled) {
  background: #43A047;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
}

.submit-btn:disabled {
  background: #81C784;
  cursor: not-allowed;
  opacity: 0.7;
}

.content-tag {
  color: #1e88e5 !important;
  background-color: #e3f2fd;
  border-radius: 3px;
  padding: 0 2px;
  cursor: pointer;
  text-decoration: underline;
}
.content-tag:hover {
  background-color: #bbdefb;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.cancel-btn {
  padding: 8px 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background-color: #f0f0f0;
}
</style>