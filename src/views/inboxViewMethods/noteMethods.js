// 笔记相关方法
export default function noteMethods(vm) {
  return {
    async handleDeleteNote(noteId) {
      console.log('准备删除笔记:', noteId);
      try {
        const success = await flomoApi.deleteNote(noteId);
        if (success) {
          console.log('笔记删除成功');
          vm.notes = vm.notes.filter(note => note.id !== noteId);
        } else {
          console.warn('笔记删除失败: 未找到该笔记');
        }
      } catch (error) {
        console.error('删除笔记时出错:', error);
      }
    },
    async loadNotes(initialLoad = true) {
      vm.isDisconnected = false;
      if (vm.isLoadingMore && !initialLoad) return;
      vm.isLoadingMore = true;
      try {
        if (initialLoad) {
          vm.notes = [];
          vm.currentOffset = 0;
          vm.hasMore = true;
        }
        const response = await flomoApi.getNotes(50, vm.currentOffset, vm.currentTag);
        const newNotes = response?.data || [];
        if (newNotes.length > 0) {
          const processedNotes = newNotes.map(note => ({ ...note, tags: note.tags || [] }));
          vm.notes = initialLoad ? processedNotes : [...vm.notes, ...processedNotes];
          vm.currentOffset += newNotes.length;
          vm.hasMore = newNotes.length === 50;
        } else {
          vm.hasMore = false;
        }
      } catch (error) {
        console.error('加载笔记失败:', error);
        vm.hasMore = false;
        vm.isDisconnected = true;
      } finally {
        vm.isLoadingMore = false;
      }
    },
    handleEditNote(note) {
      console.log('准备编辑笔记:', note.id);
      vm.editingNote = { ...note };
      vm.editContent = note.content || '';
      vm.showInput = true;
    },
    async handleSubmit(contentFromEditor) {
      console.log('InboxView - handleSubmit received content:', JSON.stringify(contentFromEditor));
      if (!contentFromEditor || /^\s*$/.test(contentFromEditor)) {
        console.warn('提交被阻止 - 原因: 内容为空或仅包含空白字符');
        return;
      }
      if (vm.isSubmitting) {
        console.warn('提交被阻止 - 原因: 正在提交中');
        return;
      }
      vm.isSubmitting = true;
      const isEditing = !!vm.editingNote;
      const noteData = { content: contentFromEditor };
      try {
        if (isEditing) {
          await flomoApi.updateNote(vm.editingNote.id, noteData);
          console.log('笔记更新成功');
          const index = vm.notes.findIndex(n => n.id === vm.editingNote.id);
          if (index !== -1) {
            vm.notes.splice(index, 1, {
              ...vm.notes[index],
              content: contentFromEditor,
              tags: vm.editingNote.tags,
              updated_at: new Date().toISOString()
            });
          }
          vm.sortMethod = vm.sortMethod;
        } else {
          console.log('正在创建新笔记');
          const response = await flomoApi.createNote(noteData);
          console.log('笔记创建成功:', response?.data);
          if (response?.data) {
            vm.notes.unshift({ ...response.data, tags: [] });
            vm.cachedDraftContent = '';
            console.log('新笔记创建成功，清空缓存:', vm.cachedDraftContent);
          } else {
            await vm.loadNotes(true);
          }
        }
        vm.cancelEdit();
      } catch (error) {
        // 详细记录错误信息
        const errorDetails = {
          // 错误基本信息
          message: error.message,
          name: error.name,
          stack: error.stack,
          // 请求相关信息
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          // 请求详情
          requestUrl: error.config?.url,
          requestMethod: error.config?.method,
          requestHeaders: error.config?.headers,
          requestData: error.config?.data,
          // 环境信息
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString(),
          // 操作上下文
          operationType: isEditing ? '更新笔记' : '创建笔记',
          noteData: noteData
        };
        
        // 格式化错误信息以便于调试
        console.error(`[错误日志] 笔记${isEditing ? '更新' : '创建'}失败:`);
        console.error('错误详情:', JSON.stringify(errorDetails, null, 2));
        console.error('完整错误对象:', error);
        
        // 用户友好的错误提示
        const userMessage = error.response?.data?.message || 
          (error.response?.status === 401 ? '认证失败，请重新登录' :
           error.response?.status === 403 ? '没有权限执行此操作' :
           error.response?.status === 413 ? '内容超出长度限制' :
           error.response?.status >= 500 ? '服务器出现错误，请稍后重试' :
           '创建笔记时出现错误，请重试');
        
        console.error('[用户提示]', userMessage);
        
        // 如果是网络错误，添加额外提示
        if (!error.response || error.message.includes('Network Error')) {
          console.error('[网络错误] 请检查网络连接状态');
        }
      } finally {
        vm.isSubmitting = false;
      }
    },
    cancelEdit() {
      vm.showInput = false;
      console.log('取消编辑/新建。当前是否在编辑现有笔记:', !!vm.editingNote);
      if (!vm.editingNote) {
        console.log('取消新建，保留 editContent:', vm.editContent);
      } else {
        vm.editContent = '';
        console.log('取消编辑现有笔记，清除 editContent:', vm.editContent);
      }
      vm.editingNote = null;
      vm.suggestions = [];
      vm.suggestionIndex = -1;
      vm.highlightedContent = '';
      console.log('编辑/新建已取消');
    },
    highlightText() {
      if (!vm.$refs.noteInput) return;
      let content = vm.editContent || '';
      content = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      content = content.replace(/(#)([^\s#]+)/g, '<span class="tag-highlight">$1$2</span>');
      content = content.replace(/\n/g, '<br>');
      vm.highlightedContent = content;
      vm.$nextTick(() => {
        if (vm.$refs.highlight && vm.$refs.noteInput) {
          vm.$refs.highlight.scrollTop = vm.$refs.noteInput.scrollTop;
        }
      });
    },
    handleInput(content) {
      //console.log('InboxView - handleInput 接收到来自编辑器的数据:', content);
      if (vm.isAddingComment) {
        vm.commentContent = content;
      } else {
        vm.editContent = content;
      }
      vm.highlightText();
      vm.detectTagContext && vm.detectTagContext();
    },
    cancelEdit() { /* ... */ },
    highlightText() { /* ... */ },
    handleInput(content) { /* ... */ },
    // ...补充其他笔记相关方法
  };
}
