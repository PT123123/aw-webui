<template>
  <NoteEditor
    @cancel-edit="handleCancelEdit"
    @submit-note="handleSubmit"
  />
</template>

<script>
methods: {
  handleCancelEdit() {
    console.log('收到取消编辑事件');
    this.showInput = false;
    this.editingNote = null;
    this.editContent = '';
  },
  // 修正：补充 `handleCancelEdit` 方法的右括号后，添加下一个方法定义的起始部分

  async handleSubmit(contentFromEditor) {
    console.groupCollapsed('InboxView提交处理');
    // 强制使用从NoteEditor传递的最新内容
    const contentToCheck = contentFromEditor || '';
    console.log('最终提交内容:', JSON.stringify(contentToCheck));

    if (!contentToCheck.trim()) {
      console.warn('提交被阻止 - 原因: 内容无效');
      console.groupEnd();
      return;
    }

    // 立即更新本地状态保持同步
    this.editContent = contentToCheck;
    
    if (/^\s*$/.test(contentToCheck)) {
      console.warn('提交被阻止 - 原因: 内容仅包含空白字符');
      console.groupEnd();
      return;
    }

    if (this.isSubmitting) {
      console.warn('提交被阻止 - 原因: 正在提交中');
      console.groupEnd();
      return;
    }

    this.isSubmitting = true;
    const isEditing = !!this.editingNote;
    const noteData = { 
      content: contentToCheck,  // 使用最终确认的内容
      tags: this.extractTagsFromContent(contentToCheck)  // 从内容中提取标签
    };

    try {
      if (isEditing) {
        console.log(`正在更新笔记 ${this.editingNote.id}`);
        await flomoApi.updateNote(this.editingNote.id, noteData);
        
        const index = this.notes.findIndex(n => n.id === this.editingNote.id);
        if (index !== -1) {
          this.notes.splice(index, 1, {
            ...this.notes[index],
            content: contentToCheck,
            tags: noteData.tags,
            updated_at: new Date().toISOString()
          });
        }
      } else {
        console.log('正在创建新笔记');
        const response = await flomoApi.createNote(noteData);
        
        if (response?.data) {
          this.notes.unshift({ 
            ...response.data, 
            tags: response.data.tags || [] 
          });
        }
      }
      this.cancelEdit();
      console.log('提交成功');
    } catch (error) {
      console.error(`笔记${isEditing ? '更新' : '创建'}失败:`, error);
    } finally {
      this.isSubmitting = false;
      console.groupEnd();
    }
  },
  
  extractTagsFromContent(content) {
    // 确保始终使用传入的最新内容
    const targetContent = content || '';
    const matches = targetContent.match(/#([^\s#]+)/g) || [];
    return matches.map(tag => tag.substring(1));
  }
}
</script>