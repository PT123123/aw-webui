<template>
  <div v-if="showInput" class="note-editor-container">
    <div v-show="false" ref="originalEditorContainer">
        <!-- 这个 div 将被移动到 Portal -->
        <div ref="movableContent">
        <div class="modal-content" :class="{ 'dark-mode': isDarkMode }">
            <div class="editor-wrapper" :class="{ 'dark-mode': isDarkMode }">
                    <rich-text-editor-core
                        ref="richEditorInstance"
                        :value="internalEditorValue"
                        @input="onRichEditorInput"
                        :isDarkMode="isDarkMode"
                        @editor-ready="onRichEditorReadyInPortal"
                    />
            </div>
            <div class="modal-actions" :class="{ 'dark-mode': isDarkMode }">
                    <button class="submit-btn" data-testid="note-editor-submit-button">发送</button>
                    <button class="cancel-btn" data-testid="note-editor-cancel-button">取消</button>
            </div>
        </div>
    </div>
    </div>
    <!-- Portal target will be created here by createPortal() -->
  </div>
</template>

<script>
import RichTextEditorCore from './RichTextEditorCore.vue';

export default {
  components: { 
    RichTextEditorCore,
  },
  created() {
    console.log('[NoteEditor] CREATED (Portal DOM Move Mode)');
    console.log('[NoteEditor created] this.onCancelRequest type:', typeof this.onCancelRequest, 'Is function:', this.onCancelRequest instanceof Function);
    const parent = this.$parent;
    console.log('[NoteEditor created] Inspecting $parent:', parent ? parent.$options.name : 'No $parent');
    if (parent) {
      console.log('[NoteEditor created] $parent.showInput:', parent.showInput);
      console.log('[NoteEditor created] typeof $parent.handleCancelEdit:', typeof parent.handleCancelEdit);
    }
  },
  props: {
    showInput: Boolean,
    isSubmitting: Boolean,
    isDarkMode: {
      type: Boolean,
      default: true,
    },
    value: {
      type: String,
      default: ''
    },
    onCancelRequest: {
      type: Function,
      required: true
    }
  },
  emits: ['submit-note', 'input', 'cancel-edit', 'update:showInput'],
  data() {
    return {
      portalTarget: null,
      portalWrapper: null,
      portalBackdrop: null,
      portalContent: null, 
      _portalCancelHandler: null,
      _portalSubmitHandler: null,
      _portalContentClickHandler: null, // Added for stopPropagation on content
      internalEditorValue: '',
      isRichEditorReadyInPortal: false,
      // No need to store movableContent here if we always access via $refs.movableContent
    };
  },
  mounted() {
    console.log(`[NoteEditor] MOUNTED. showInput: ${this.showInput} (Portal DOM Move Mode)`);
    console.log('[NoteEditor mounted] this.onCancelRequest type:', typeof this.onCancelRequest, 'Is function:', this.onCancelRequest instanceof Function);
    const parent = this.$parent;
    console.log('[NoteEditor mounted] Inspecting $parent:', parent ? parent.$options.name : 'No $parent');
    if (parent) {
      console.log('[NoteEditor mounted] $parent.showInput:', parent.showInput);
      console.log('[NoteEditor mounted] typeof $parent.handleCancelEdit:', typeof parent.handleCancelEdit);
    }
    this.internalEditorValue = this.value;
    if (this.showInput) {
      this.createAndInitializePortal();
    }
  },
  beforeUnmount() {
    console.log('[NoteEditor] BEFOREUNMOUNT (Portal DOM Move Mode): Component is being destroyed.');
    this.destroyEditorAndRemovePortal();
  },
  watch: {
    showInput(newVal, oldVal) {
      console.log(`[NoteEditor] watch: showInput changed from ${oldVal} to ${newVal} (Portal DOM Move Mode)`);
      if (newVal && !oldVal) {
        console.log('[NoteEditor watch showInput true] this.onCancelRequest type:', typeof this.onCancelRequest, 'Is function:', this.onCancelRequest instanceof Function);
        console.log(`[NoteEditor] watch: showInput - Opening editor. Initial props.value (length: ${this.value?.length || 0}): ${this.value?.substring(0,50)}...`);
        this.internalEditorValue = this.value;
        console.log(`[NoteEditor] watch: showInput - internalEditorValue set to (length: ${this.internalEditorValue?.length || 0}): ${this.internalEditorValue?.substring(0,50)}...`);
        this.createAndInitializePortal();
      } else if (!newVal && oldVal) {
        console.log('[NoteEditor] watch: showInput - Closing editor (Portal DOM Move Mode).');
        this.destroyEditorAndRemovePortal();
      }
    },
    value(newVal) {
      console.log(`[NoteEditor] watch: props.value changed (Portal DOM Move Mode). New (length: ${newVal?.length || 0}): ${newVal?.substring(0,50)}...`);
      if (this.internalEditorValue !== newVal) {
        this.internalEditorValue = newVal;
        console.log(`[NoteEditor] watch: props.value - Updated internalEditorValue (Portal DOM Move Mode) to (length: ${this.internalEditorValue?.length || 0}): ${this.internalEditorValue?.substring(0,50)}...`);
      }
    }
  },
  methods: {
    createAndInitializePortal() {
      this.$nextTick(() => {
        if (!this.$refs.originalEditorContainer || !this.$refs.movableContent) {
          console.error("[NoteEditor] Refs for portal creation not found.");
          return;
        }
        this.createPortal(); // createPortal will now handle moving movableContent
        if (this.portalContent && this.portalContent.contains(this.$refs.movableContent)) {
          this.initializeEditorInPortal(); 
      } else {
          console.error("[NoteEditor] Movable content not in portal or portalContent missing.");
        }
      });
    },

    onRichEditorInput(newContent) {
      this.internalEditorValue = newContent;
      this.$emit('input', newContent);
    },

    handleCancel(e) { 
      if (e) { e.stopPropagation(); e.preventDefault(); }
      console.log('[NoteEditor] handleCancel called (Portal DOM Move Mode, using prop callback)');
      
      // 检查 prop 但不输出警告
      const hasCancelProp = this.onCancelRequest && typeof this.onCancelRequest === 'function';
      console.log('[NoteEditor handleCancel] this.onCancelRequest available:', hasCancelProp);
      
      // 尝试使用 prop 回调，如果可用
      if (hasCancelProp) {
        this.onCancelRequest();
      } else {
        // 直接使用备用机制，不输出警告
        console.log('[NoteEditor] 使用备用关闭机制');
        this.$emit('cancel-edit');
        
        // 直接修改自身的 showInput
        if (this.showInput) {
          console.log('[NoteEditor] 内部关闭编辑器');
          setTimeout(() => {
            this.destroyEditorAndRemovePortal();
            this.$emit('update:showInput', false);
          }, 50);
        }
      }
    },

    handleSubmit(e) { 
      if (e) { e.stopPropagation(); e.preventDefault(); }
      console.log('[NoteEditor] handleSubmit called (Portal DOM Move Mode).');
      const editorInstanceRef = this.$refs.richEditorInstance;
      if (!editorInstanceRef || typeof editorInstanceRef.getText !== 'function') {
        console.error('[NoteEditor] handleSubmit: RichTextEditorCore instance or getText method not found.');
        return;
      }
      const rawText = editorInstanceRef.getText();
      console.log('[NoteEditor] handleSubmit: Got plain text:', rawText);
      const finalText = rawText.trim();
      if (!finalText || this.isSubmitting) {
        console.log('[NoteEditor] handleSubmit: Plain text empty or submitting. finalText:', finalText, 'isSubmitting:', this.isSubmitting);
        return;
      }
      this.$emit('submit-note', finalText);
      
      // 添加自动关闭逻辑 - 除非明确指示保持打开，否则提交后关闭编辑器
      console.log('[NoteEditor] handleSubmit: 提交后准备关闭编辑器');
      // 短暂延迟以确保事件处理完毕
      setTimeout(() => {
        // 在提交后，如果父组件没有自行处理关闭，我们在这里处理
        if (this.showInput) {
          console.log('[NoteEditor] handleSubmit: 提交后编辑器仍然打开，尝试关闭');
          this.destroyEditorAndRemovePortal();
          this.$emit('update:showInput', false);
        }
      }, 200); // 稍长一点的延迟，让父组件有机会先处理
    },
    
    createPortal() {
      console.log('[NoteEditor] createPortal (DOM Move Strategy)');
      if (this.portalTarget) {
        console.warn('[NoteEditor] Portal target already exists. Destroying before recreating.');
        this.destroyEditorAndRemovePortal();
      }
      
      this.portalTarget = document.createElement('div');
      this.portalTarget.id = 'note-editor-portal-target-' + Date.now();
      document.body.appendChild(this.portalTarget);

        this.portalWrapper = document.createElement('div');
      this.portalWrapper.className = 'note-editor-portal-wrapper';
      if (this.isDarkMode) this.portalWrapper.classList.add('dark-mode');
      
      this.portalBackdrop = document.createElement('div');
      this.portalBackdrop.className = 'note-editor-portal-backdrop';
      this._portalBackdropClickHandler = (event) => {
        if (event.target === this.portalBackdrop) {
          // 检查 prop 但不输出警告
          const hasCancelProp = this.onCancelRequest && typeof this.onCancelRequest === 'function';
          
          if (hasCancelProp) {
            this.onCancelRequest();
          } else {
            // 直接使用备用机制，不输出警告
            console.log('[NoteEditor] Backdrop: 使用备用关闭机制');
            this.$emit('cancel-edit');
            
            if (this.showInput) {
              console.log('[NoteEditor] Backdrop: 内部关闭编辑器');
              setTimeout(() => {
                this.destroyEditorAndRemovePortal();
                this.$emit('update:showInput', false);
              }, 50);
            }
          }
        }
      };
      this.portalBackdrop.addEventListener('click', this._portalBackdropClickHandler);

      // Create the content host in the portal wrapper, but DON'T clone.
      this.portalContent = document.createElement('div');
      // Apply a class or style to portalContent if it needs to match .modal-content visual structure directly
      // For simplicity, we are moving the whole .modal-content div structure contained in movableContent.
      // So portalContent itself might not need all .modal-content styles, but it acts as a container.
      this.portalContent.className = 'portal-content-host'; // A simple class for the host
      this.portalContent.style.display = 'flex'; // To match original modal-content display if necessary
      this.portalContent.style.position = 'relative'; // For z-index stacking if needed
      this.portalContent.style.zIndex = '2';

      // MOVE the actual DOM from the template into the portalContent.
      const movableElement = this.$refs.movableContent;
      if (movableElement) {
        this.portalContent.appendChild(movableElement); // This moves the element
        // After moving, the .modal-content div inside movableElement should become visible.
        // Ensure its style is not display:none (v-show="false" on parent might affect children if not careful)
        // The parent originalEditorContainer is v-show="false", but movableContent itself is not, once moved.
        // We might need to explicitly set movableContent or its child .modal-content to display:flex/block.
        const modalContentInsideMovable = movableElement.querySelector('.modal-content');
        if (modalContentInsideMovable) {
            modalContentInsideMovable.style.display = 'flex'; // Ensure it's visible
        }

      } else {
        console.error('[NoteEditor] createPortal: this.$refs.movableContent not found!');
        this.destroyEditorAndRemovePortal();
        return;
      }

      this.portalWrapper.appendChild(this.portalBackdrop);
      this.portalWrapper.appendChild(this.portalContent);
      this.portalTarget.appendChild(this.portalWrapper);
      
      // Stop propagation for clicks within the actual modal content (which is now inside portalContent)
      // The event listener should be on the part that IS the modal content.
      const actualModalDialog = this.portalContent.querySelector('.modal-content');
      if (actualModalDialog) {
          this._portalContentClickHandler = (event) => { event.stopPropagation(); };
          actualModalDialog.addEventListener('click', this._portalContentClickHandler);
          } else {
          console.warn("[NoteEditor] Could not find .modal-content within portalContent to attach click listener");
      }

      console.log('[NoteEditor] createPortal: DOM structure created, content MOVED.');
    },

    initializeEditorInPortal() {
      console.log('[NoteEditor] initializeEditorInPortal (DOM Move). Movable content in portal:', this.portalContent && this.portalContent.contains(this.$refs.movableContent));
      console.log('[NoteEditor initializeEditorInPortal] this.onCancelRequest type:', typeof this.onCancelRequest, 'Is function:', this.onCancelRequest instanceof Function);
      if (!this.$refs.movableContent || !this.portalContent || !this.portalContent.contains(this.$refs.movableContent)) {
        console.error('[NoteEditor] Cannot initialize: movableContent not correctly placed in portalContent.');
            return;
        }

      console.log('[NoteEditor] Waiting for richEditorInstance (DOM Move) to emit \'editor-ready\'...');

      // Buttons are now part of $refs.movableContent, which is inside portalContent.
      // We need to query them from their current location.
      const submitBtn = this.$refs.movableContent.querySelector('[data-testid="note-editor-submit-button"]');
      if (submitBtn) {
        if (this._portalSubmitHandler) submitBtn.removeEventListener('click', this._portalSubmitHandler);
        this._portalSubmitHandler = this.handleSubmit.bind(this);
        submitBtn.addEventListener('click', this._portalSubmitHandler);
                } else {
        console.warn('[NoteEditor] Submit button not found in movableContent.');
      }

      const cancelBtn = this.$refs.movableContent.querySelector('[data-testid="note-editor-cancel-button"]');
      if (cancelBtn) {
        console.log('[NoteEditor initEP] Current _portalCancelHandler:', this._portalCancelHandler);
        if (this._portalCancelHandler) {
          console.log('[NoteEditor initEP] Removing existing _portalCancelHandler from cancel button.');
          cancelBtn.removeEventListener('click', this._portalCancelHandler);
        }
        this._portalCancelHandler = this.handleCancel.bind(this); 
        console.log('[NoteEditor initEP] Adding new _portalCancelHandler to cancel button. Prop onCancelRequest type:', typeof this.onCancelRequest);
        cancelBtn.addEventListener('click', this._portalCancelHandler);
            } else {
        console.warn('[NoteEditor initEP] Cancel button not found in movableContent during init.');
      }
      console.log('[NoteEditor] Event listeners for MOVED buttons attached.');
    },

    onRichEditorReadyInPortal() {
      console.log('[NoteEditor] \'editor-ready\' event received (DOM Move).');
      this.isRichEditorReadyInPortal = true;
      const richEditor = this.$refs.richEditorInstance; // This ref should still be valid
      if (!richEditor || typeof richEditor.focus !== 'function') {
        console.error('[NoteEditor] RichTextEditorCore instance or focus method not found after ready (DOM Move).');
        return;
      }
      console.log('[NoteEditor] Attempting focus after ready (DOM Move).');
            this.$nextTick(() => {
        richEditor.focus();
        setTimeout(() => {
          const activeEl = document.activeElement;
          console.log('[NoteEditor] Active element AFTER focus (DOM Move):', activeEl ? activeEl.outerHTML.substring(0, 200) : 'null');
          if (richEditor.editor) {
            console.log('[NoteEditor] DOM Move: richEditor.editor.isFocused is:', richEditor.editor.isFocused);
          } else {
            console.log('[NoteEditor] DOM Move: richEditor.editor instance not available.');
          }
        }, 150);
      });
    },

    destroyEditorAndRemovePortal() {
      console.log('[NoteEditor] destroyEditorAndRemovePortal (DOM Move)');
      this.isRichEditorReadyInPortal = false;

      // 移除所有事件监听器
      if (this.$refs.movableContent) {
        const submitBtn = this.$refs.movableContent.querySelector('[data-testid="note-editor-submit-button"]');
        if (submitBtn && this._portalSubmitHandler) {
            submitBtn.removeEventListener('click', this._portalSubmitHandler);
            this._portalSubmitHandler = null;
        }
        const cancelBtn = this.$refs.movableContent.querySelector('[data-testid="note-editor-cancel-button"]');
        if (cancelBtn) {
            console.log('[NoteEditor] Destroy: Found cancel button. Current _portalCancelHandler to remove:', this._portalCancelHandler);
            if (this._portalCancelHandler) {
                cancelBtn.removeEventListener('click', this._portalCancelHandler);
                console.log('[NoteEditor] Destroy: Removed _portalCancelHandler from cancel button.');
            }
          } else {
            console.warn('[NoteEditor] Destroy: Cancel button not found in movableContent.');
        }
      }
      
      // 移除背景点击监听器
      if (this.portalBackdrop && this._portalBackdropClickHandler) {
        this.portalBackdrop.removeEventListener('click', this._portalBackdropClickHandler);
        this._portalBackdropClickHandler = null;
      }
      
      // 移除内容点击监听器
      if (this.portalContent) {
          const actualModalDialog = this.portalContent.querySelector('.modal-content'); 
          if (actualModalDialog && this._portalContentClickHandler) {
              actualModalDialog.removeEventListener('click', this._portalContentClickHandler);
          }
      }
      this._portalContentClickHandler = null;
      
      // 检查 DOM 结构完整性，尝试将内容移回原来位置
      try {
        if (this.$refs.originalEditorContainer && this.$refs.movableContent && 
            this.portalContent && this.portalContent.contains(this.$refs.movableContent)) {
          console.log('[NoteEditor] Moving movableContent back to originalEditorContainer.');
          this.$refs.originalEditorContainer.appendChild(this.$refs.movableContent);
        } else {
          console.warn('[NoteEditor] Could not move movableContent back - not in expected location.');
          
          // 关键修复：如果 movableContent 不在预期位置，但确实还存在于 DOM 中的某处
          const movableContent = this.$refs.movableContent;
          if (movableContent && movableContent.parentNode) {
            console.log('[NoteEditor] Found movableContent in DOM, attempting to move it back.');
            if (this.$refs.originalEditorContainer) {
              this.$refs.originalEditorContainer.appendChild(movableContent);
              console.log('[NoteEditor] Successfully moved movableContent back to original container.');
            } else {
              console.warn('[NoteEditor] Original container not found, removing movableContent from DOM.');
              movableContent.parentNode.removeChild(movableContent);
            }
          }
        }
      } catch (err) {
        console.error('[NoteEditor] Error moving content back:', err);
      }

      // 完全移除 Portal 
      try {
        if (this.portalTarget && document.body.contains(this.portalTarget)) {
          document.body.removeChild(this.portalTarget);
          console.log('[NoteEditor] Portal DOM element removed from document.body');
        }
      } catch (err) {
        console.error('[NoteEditor] Error removing portal target:', err);
      }

      // 清理所有 portal 相关引用
      this.portalTarget = null;
      this.portalWrapper = null;
      this.portalBackdrop = null;
      this.portalContent = null;
      this._portalCancelHandler = null;
      
      console.log('[NoteEditor] Portal cleanup completed.');
    }
  }
}
</script>

<style>
/* Styles remain largely the same */
/* Add a style for the new portal-content-host if needed for layout */
.portal-content-host {
    display: flex; /* or block, depending on how .modal-content inside it should behave */
    justify-content: center; /* Example for centering if it directly holds .modal-content */
    align-items: flex-end; /* 修改：从 center 改为 flex-end，确保内容靠底部对齐 */
    width: 100%; /* Or specific dimensions if it's not just a pass-through container */
    height: 100%;
}

/* Portal Wrapper - covers the whole screen and contains backdrop + modal */
.note-editor-portal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999990; /* High z-index, but allow for other system modals if needed */
  display: flex; /* For centering the modal content */
  justify-content: center;
  align-items: flex-end; /* 确保使用 flex-end 让内容对齐到底部 */
  /* background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent backdrop effect */
}
.note-editor-portal-wrapper.dark-mode {
  /* background-color: rgba(0, 0, 0, 0.7); */
}

/* Portal Backdrop - sits behind the modal content within the wrapper */
.note-editor-portal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent backdrop */
  z-index: 1; /* Behind modal content */
}
.note-editor-portal-backdrop.dark-mode {
  background-color: rgba(20, 20, 20, 0.75);
}


/* modal-content is the actual dialog box, cloned from template */
.modal-content {
   position: relative; /* Changed from fixed, as wrapper handles positioning */
   z-index: 2; /* Above backdrop */
   background-color: #fefefe;
   color: #121212;
   width: 100%; /* 100%宽度，占满屏幕宽度 */
   max-width: 100%; /* 不限制最大宽度 */
   min-height: 200px; /* 减小最小高度 */
   max-height: 40vh; /* 限制最大高度为视口的40% */
   border-radius: 12px 12px 0 0; /* 只保留顶部圆角 */
   box-shadow: 0 -4px 15px rgba(0,0,0,0.2); /* 阴影方向向上 */
   padding: 20px 25px; /* 调整填充 */
   display: flex;
   flex-direction: column;
   border-bottom: none; /* 去掉底部边框 */
   border-left: none; /* 去掉左侧边框 */
   border-right: none; /* 去掉右侧边框 */
   border-top: 1px solid #ccc; /* 只保留顶部边框 */
   box-sizing: border-box;
   margin: 0; /* 确保没有外边距 */
   transform: translateY(0); /* 确保没有任何变换影响位置 */
}

.modal-content.dark-mode {
  background-color: #2d2d2d; /* Darker modal background */
  color: #e0e0e0; /* Lighter text for dark mode */
  border-top: 1px solid #444; /* 暗模式下顶部边框 */
}

.editor-wrapper {
  flex: 1;
  position: relative;
  margin-bottom: 20px; /* Increased spacing */
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px; /* Increased padding */
  min-height: 150px; /* Adjusted min-height */
  max-height: 50vh; /* Adjusted max-height */
  overflow-y: auto;
  display: flex; /* To make RichTextEditorCore fill this wrapper if needed */
  flex-direction: column;
   box-sizing: border-box;
}

.editor-wrapper.dark-mode {
  background-color: #222; /* Darker editor background */
  border: 1px solid #555;
}

/* Styles for RichTextEditorCore's .tiptap element */
.tiptap-editor { /* This class is typically on the RichTextEditorCore's root or Tiptap's main div */
  flex-grow: 1; /* Allow it to take available space in editor-wrapper */
  outline: none;
  font-size: 1rem; /* Base font size */
  line-height: 1.6;
  color: #121212; /* Default text color for light mode */
  caret-color: #6200ee;
}

.tiptap-editor.dark-mode, /* If RichTextEditorCore itself gets a dark-mode class */
.editor-wrapper.dark-mode .tiptap-editor { /* Or if parent sets context */
  color: #e0e0e0; /* Text color for dark mode */
  caret-color: #bb86fc;
}

.tiptap-editor p {
    margin-bottom: 0.5em; /* Spacing between paragraphs */
}
.tiptap-editor [contenteditable="true"] {
  min-height: 100px; /* Ensure a minimum clickable/typeable area */
}
.tiptap-editor:focus-within,
.tiptap-editor [contenteditable="true"]:focus {
   outline: none; /* Handled by Tiptap's focus classes if needed, or custom styling */
}


.modal-actions {
  display: flex;
  justify-content: flex-end; /* Align buttons to the right */
  align-items: center;
  margin-top: 10px; /* Reduced top margin */
  padding-top: 10px;
  border-top: 1px solid #eee;
}
.modal-content.dark-mode .modal-actions {
    border-top: 1px solid #444;
}

.modal-actions button {
  margin-left: 12px; /* Space between buttons */
}

.submit-btn {
  padding: 10px 22px; /* Slightly larger padding */
  border-radius: 6px;
  border: none;
  background-color: #6200ee; /* Primary action color */
  color: white;
  cursor: pointer;
  font-weight: 500; /* Medium weight */
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.submit-btn:hover {
  background-color: #5e00d6; /* Darker shade on hover */
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.submit-btn.dark-mode {
  background-color: #7f39fb; /* Adjusted dark mode primary */
}
.submit-btn.dark-mode:hover {
  background-color: #7028f0;
}


.cancel-btn {
  padding: 10px 22px;
  border-radius: 6px;
  border: 1px solid #ccc; /* Light border for secondary button */
  background-color: transparent; /* Transparent background */
  color: #555; /* Text color for secondary button */
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
.cancel-btn:hover {
  background-color: #f0f0f0; /* Slight background on hover */
  border-color: #bbb;
}
.cancel-btn.dark-mode {
  color: #bbb;
  border: 1px solid #555;
}
.cancel-btn.dark-mode:hover {
  background-color: #3a3a3a;
  border-color: #666;
}

/* Loading spinner for submit button (if needed) */
.loading-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.7);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}


/* Tag related styles (can be kept as they were if functional) */
.tag-highlight, 
[data-tag="true"],
.tiptap-editor [data-tag="true"],
.tiptap-editor span[data-tag="true"] {
  color: #6200ee !important; /* Match primary color */
  font-weight: bold !important;
  cursor: pointer !important;
  border-radius: 3px;
  transition: background-color 0.2s;
  padding: 1px 3px;
  background-color: rgba(98, 0, 238, 0.08);
}
.modal-content.dark-mode .tag-highlight,
.modal-content.dark-mode [data-tag="true"] {
  color: #bb86fc !important; /* Adjusted for dark mode */
  background-color: rgba(187, 134, 252, 0.12);
}

.tag-highlight:hover, 
[data-tag="true"]:hover {
  background-color: rgba(98, 0, 238, 0.15) !important;
}
.modal-content.dark-mode .tag-highlight:hover,
.modal-content.dark-mode [data-tag="true"]:hover {
  background-color: rgba(187, 134, 252, 0.2) !important;
}

</style>