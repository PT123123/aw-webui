// 标签相关方法
export default function tagMethods(vm) {
  return {
    async loadAllTags() { /* ... */ },
    filterByTag(formattedTag) {
      // 从格式化后的标签字符串中提取标签名称
      const tagName = formattedTag.split('(')[0].substring(1);
      if (vm.currentTag === tagName) {
        vm.currentTag = null;
      } else {
        vm.currentTag = tagName;
      }
      console.log('设置 currentTag 为:', vm.currentTag);
      vm.loadNotes && vm.loadNotes(true);
    },
    clearTagFilter() {
      vm.currentTag = null;
      vm.loadNotes && vm.loadNotes(true);
    },
    async loadAllTags() {
      vm.isLoadingTags = true;
      try {
        const response = await flomoApi.getDetailedTags();
        vm.detailedTags = response || [];
        console.log('详细标签加载成功:', vm.detailedTags);
        // 格式化标签显示
        vm.allTags = vm.detailedTags.map(item => {
          const tag = item.tag;
          const count = item.count;
          const latestUpdated = item.latest_updated_at ? new Date(item.latest_updated_at) : null;
          const formattedDate = latestUpdated ?
            `${String(latestUpdated.getMonth() + 1).padStart(2, '0')}-${String(latestUpdated.getDate()).padStart(2, '0')}` :
            '--';
          const prefix = tag.startsWith('#') ? '' : '#';
          return `${prefix}${tag}(${count}) ${formattedDate}`;
        });
        console.log('处理后的 allTags:', vm.allTags);
      } catch (error) {
        console.error('加载详细标签失败:', error);
        vm.detailedTags = [];
        vm.allTags = [];
      } finally {
        vm.isLoadingTags = false;
      }
    },
    detectTagContext() {
      const textarea = vm.$refs.noteInput;
      if (!textarea) return;
      const text = vm.editContent;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.substring(0, cursorPos);
      const lastHashIndex = textBeforeCursor.lastIndexOf('#');
      if (lastHashIndex === -1) {
        vm.suggestions = [];
        return;
      }
      const textBetween = textBeforeCursor.substring(lastHashIndex + 1);
      if (/\s/.test(textBetween) || textBetween.includes('#')) {
        vm.suggestions = [];
        return;
      }
      const currentTag = textBetween;
      vm.updateSuggestions && vm.updateSuggestions(currentTag);
    },
    async updateSuggestions(query) {
      try {
        const response = await flomoApi.getAllTags();
        const availableTags = response?.data || [];
        if (!query) {
          vm.suggestions = availableTags.slice(0, 5).map(tag => ({ path: tag }));
        } else {
          const lowerQuery = query.toLowerCase();
          vm.suggestions = availableTags
            .filter(tag => tag.toLowerCase().startsWith(lowerQuery))
            .slice(0, 5)
            .map(tag => ({ path: tag }));
        }
        vm.suggestionIndex = -1;
        console.log('Suggestions:', vm.suggestions);
      } catch (error) {
        console.error('Failed to fetch tags for suggestions:', error);
        vm.suggestions = [];
      }
    }
    // ...补充其他标签相关方法
  };
}
