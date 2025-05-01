// UI 相关方法
export default function uiMethods(vm) {
  return {
    handleSidebar() { /* ... */ },
    handleCloseSidebar() { /* ... */ },
    handleKeyDown(e) { /* ... */ },
    refreshData() { /* ... */ },
    sortBy(method) { /* ... */ },
    toggleSidebar() {
      vm.showSidebar = !vm.showSidebar;
    },
    handleCloseSidebar() {
      vm.showSidebar = false;
    },
    refreshData() {
      console.groupCollapsed('[InboxView] 手动刷新数据 - 开始');
      try {
        vm.loadNotes && vm.loadNotes(true);
        vm.loadAllTags && vm.loadAllTags();
      } finally {
        console.groupEnd();
      }
    }
  };
}
