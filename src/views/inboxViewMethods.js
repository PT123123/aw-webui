// 所有 InboxView 业务方法提取到这里，需传递 vm/context 参数

export default function getInboxViewMethods(vm) {
  return {
    async loadNotes(forceReload = false) {
      // ...原loadNotes内容，this替换为vm...
    },
    async loadAllTags() {
      // ...
    },
    refreshData() {
      // ...
    },
    handleEditNote(note) {
      // ...
    },
    handleNoteListTagClick(tag) {
      // ...
    },
    handleDeleteNote(noteId) {
      // ...
    },
    sortBy(method) {
      // ...
    },
    filterByTag(tag) {
      // ...
    },
    clearTagFilter() {
      // ...
    },
    handleShowCommentEditor(noteId) {
      // ...
    },
    handleCloseSidebar() {
      // ...
    },
    handleInput(val) {
      // ...
    },
    handleKeyDown(e) {
      // ...
    },
    applySuggestion(tag) {
      // ...
    },
    highlightText() {
      // ...
    },
    cancelEdit() {
      // ...
    },
    async handleSubmit(event) {
      // ...
    },
    // ...其他 methods 依次补全
    // 评论相关
    submitCommentWrapper(content) {
      vm.commentContent = content;
      vm.submitComment();
    },
    async submitComment() {
      // ...
    },
    cancelComment() {
      // ...
    },
    // ...如有更多 methods 继续补全
  };
}
