<template>
  <div :class="[styles['comment-editor-section'], { [styles['dark-mode']]: isDarkMode }]">
    <h4>评论笔记 #{{ selectedNoteIdForComments }}</h4>
    <textarea
      v-model="content"
      ref="commentInput"
      placeholder="输入评论内容..."
      :class="{ [styles['dark-mode']]: isDarkMode }"
    />
    <div :class="styles['comment-actions']">
      <button
        @click="$emit('submit', content)"
        :class="{ [styles['dark-mode']]: isDarkMode }"
      >
        提交
      </button>
      <button
        @click="$emit('cancel')"
        :class="{ [styles['dark-mode']]: isDarkMode }"
      >
        取消
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InboxCommentEditor',
  props: {
    selectedNoteIdForComments: [String, Number],
    value: String,
    isDarkMode: Boolean,
    styles: Object
  },
  data() {
    return {
      content: this.value || ''
    };
  },
  watch: {
    value(val) {
      this.content = val;
    }
  }
};
</script>
