<template>
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
</template>

<script>
export default {
  name: 'InboxComments',
  props: {
    comments: {
      type: Array,
      required: true
    },
    selectedNoteIdForComments: {
      type: [String, Number],
      required: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    styles: {
      type: Object,
      required: true
    }
  }
};
</script>
