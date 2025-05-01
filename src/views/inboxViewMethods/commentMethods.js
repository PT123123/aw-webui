// 评论相关方法
export default function commentMethods(vm) {
  return {
    handleShowCommentEditor(note) {
      console.groupCollapsed('[InboxView] handleShowCommentEditor 调试');
      console.log('1. 接收到 note 对象:', note);
      vm.selectedNoteIdForComments = note.id;
      vm.isAddingComment = true;
      const createdAt = new Date(note.created_at);
      const zettelId = createdAt.toISOString().replace(/[-:T]/g, '').split('.')[0];
      vm.commentContent = `[[${zettelId}]] `;
      console.log('2. 设置后的状态:', {
        isAddingComment: vm.isAddingComment,
        commentContent: vm.commentContent,
        selectedNoteId: vm.selectedNoteIdForComments
      });
      vm.fetchComments && vm.fetchComments(note.id);
      console.groupEnd();
    },
    submitCommentWrapper(content) {
      vm.commentContent = content;
      vm.submitComment && vm.submitComment();
    },
    async submitComment() {
      if (!vm.selectedNoteIdForComments || !vm.commentContent.trim()) {
        return;
      }
      try {
        const response = await flomoApi.addCommentToNote(
          vm.selectedNoteIdForComments,
          { content: vm.commentContent }
        );
        if (response.status === 200 || response.status === 201) {
          console.log('评论提交成功:', response.data);
          vm.commentContent = '';
          vm.isAddingComment = false;
          vm.fetchComments && vm.fetchComments(vm.selectedNoteIdForComments);
        }
      } catch (error) {
        console.error('提交评论出错:', error);
      }
    },
    cancelComment() {
      vm.isAddingComment = false;
      vm.commentContent = '';
    },
    async fetchComments(noteId) {
      try {
        const response = await flomoApi.getCommentsForNote(noteId);
        vm.comments = response.data || [];
      } catch (error) {
        console.error('加载评论失败:', error);
        vm.comments = [];
      }
    }
    // ...补充其他评论相关方法
  };
}
