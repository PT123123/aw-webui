<template>
  <div v-if="showInput">
    <div v-show="false" ref="editorContainer">
      <!-- 这个容器仅作为引用存在，实际内容会被传送到body下 -->
      <div ref="modalContent" class="modal-content" :class="{ 'dark-mode': isDarkMode }">
      <div class="editor-wrapper" :class="{ 'dark-mode': isDarkMode }">
          <editor-content ref="tiptapContent" :editor="editor" class="tiptap-editor" tabindex="0" @click.stop="handleEditorClick" />
    </div>
    <div class="modal-actions" :class="{ 'dark-mode': isDarkMode }">
      <button
        @click.stop="handleSubmit"
        class="submit-btn"
        :class="{ 'dark-mode': isDarkMode, 'is-loading': isSubmitting }"
        :disabled="isSubmitting"
      >
        <span v-if="!isSubmitting">发送</span>
        <span v-else class="loading-spinner"></span>
      </button>
      <button @click.stop="handleCancel" class="cancel-btn" :class="{ 'dark-mode': isDarkMode }">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'

// 自定义 #tag 高亮扩展
import { Mark, mergeAttributes, Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

const TagMark = Mark.create({
  name: 'tagmark',
  parseHTML() {
    return [{ tag: 'span[data-tag]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { class: 'tag-highlight', 'data-tag': 'true' }, 0]
  },
  addInputRules() {
    return [
      {
        find: /#([^\s#]+)/g, // 匹配 # 后直到空格或下一个 # 的字符
        handler: ({ state, range, match }) => {
          const { tr } = state
          tr.addMark(range.from + match.index, range.from + match.index + match[0].length, this.type.create())
        }
      }
    ]
  }
})

// 自定义光标行高亮扩展
const CursorHighlight = Extension.create({
  name: 'cursorHighlight',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: state => {
            const { doc, selection } = state;
            const decorations = [];
            
            const pos = selection.head;
            const $pos = doc.resolve(pos);
            const line = $pos.path[1];
            
            doc.nodesBetween($pos.start(), $pos.end(), (node, position) => {
              if (node.isBlock && position <= pos && position + node.nodeSize > pos) {
                decorations.push(
                  Decoration.node(position, position + node.nodeSize, {
                    class: 'cursor-line-highlight'
                  })
                );
                return false;
              }
              return true;
            });
            
            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

export default {
  components: { EditorContent },
  created() {
    console.log('已引入NoteEditor组件，第6次修改 - 调整位置和增加行高亮');
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
    }
  },
  emits: ['cancel-edit', 'submit-note', 'input'],
  data() {
    return {
      editor: null,
      portalTarget: null,    // 传送门目标元素
      portalWrapper: null,   // 传送门包装器
      portalBackdrop: null,  // 背景层
      portalContent: null    // 内容元素
    }
  },
  mounted() {
    this.editor = new Editor({
      extensions: [
        StarterKit, 
        TagMark,
        CursorHighlight
      ],
      content: this.value || '',
      onUpdate: ({ editor }) => {
        this.$emit('input', editor.getHTML());
      },
      autofocus: 'end',
      editorProps: {
        attributes: {
          class: 'focus-visible',
          autocomplete: 'off',
          autocorrect: 'off',
          autocapitalize: 'off',
          spellcheck: 'false'
        },
      },
      onFocus: () => {
        console.log('编辑器已获得焦点');
      },
      onCreate: ({ editor }) => {
        // 编辑器创建完成后，设置一个短暂延时尝试聚焦
        setTimeout(() => {
          editor.commands.focus('end');
          console.log('编辑器创建完成后自动聚焦');
        }, 50);
      }
    });
    
    // 在组件挂载后创建portal
    this.$nextTick(() => {
      if (this.showInput) {
        this.createPortal();
        // 组件挂载后立即尝试聚焦
        setTimeout(() => {
          if (this.editor) {
            this.editor.commands.focus('end');
          }
        }, 200);
      }
    });
  },
  beforeDestroy() {
    this.editor && this.editor.destroy();
    // 移除portal
    this.removePortal();
  },
  watch: {
    showInput(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.createPortal();
          // 确保在portal创建后聚焦
          setTimeout(() => {
            if (this.editor) {
          this.editor.commands.focus('end');
            }
          }, 100);
          
          // 使用激活器
          this.activateEditor();
        });
      } else {
        this.removePortal();
      }
    },
    value(newVal) {
      if (this.editor && newVal !== this.editor.getHTML()) {
        this.editor.commands.setContent(newVal || '', false);
      }
    }
  },
  methods: {
    handleEditorClick(e) {
      e.stopPropagation();
      if (this.editor) {
        this.editor.commands.focus();
      }
    },
    handleTagClick(e) {
      if (e.target.classList.contains('tag-highlight')) {
        const tag = e.target.textContent;
        this.$emit('filter-by-tag', tag);
      }
    },
    handleCancel(e) {
      // 阻止事件冒泡并阻止默认行为
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      
      console.log('关闭编辑器');
      // 直接发出取消事件
      this.$emit('cancel-edit');
    },
    handleSubmit(e) {
      console.group('NoteEditor - handleSubmit');
      console.log('事件对象:', {
        type: e?.type,
        target: e?.target?.className,
        timestamp: Date.now()
      });
      
      // 阻止事件冒泡并阻止默认行为
      if (e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('已阻止事件冒泡和默认行为');
      }
      
      if (this.isSubmitting) {
        console.warn('提交被阻止 - 正在提交中');
        console.groupEnd();
        return;
      }
      
      if (!this.editor) {
        console.warn('提交被阻止 - 编辑器实例不存在');
        console.groupEnd();
        return;
      }
      console.log('编辑器实例检查通过');

      // 获取编辑器内容
      const domContent = this.portalContent?.querySelector('.tiptap-editor');
      if (!domContent) {
        console.warn('未找到编辑器DOM');
        console.groupEnd();
        return;
      }
      console.log('找到编辑器DOM元素');
      
      // 使用DOM内容作为实际内容检查
      const actualContent = domContent.textContent.trim();
      if (!actualContent) {
        console.warn('内容为空');
        console.groupEnd();
        return;
      }
      console.log('内容检查通过，长度:', actualContent.length);
      
      // 获取HTML内容并清理
      let html = domContent.innerHTML;
      console.log('原始HTML内容长度:', html.length);
      
      html = html.replace(/<span style="color: #bb86fc; font-weight: bold;" data-tag="true">(.*?)<\/span>/g, 
                         '<span class="tag-highlight" data-tag="true">$1</span>');
      console.log('第一次清理后HTML长度:', html.length);
      
      if (this.isSubmitting) {
        console.warn('提交终止：正在提交中');
        console.groupEnd();
        return;
      }
      
      // 更彻底地清理HTML，确保标签渲染正确
      html = html.replace(/<span style="color: #bb86fc; font-weight: bold;" data-tag="true">(.*?)<\/span>/g, 
                         '<span class="tag-highlight" data-tag="true">$1</span>');
      console.log('第二次清理后HTML长度:', html.length);
      
      console.log('准备发送submit-note事件');
      // 立即触发提交事件
      this.$emit('submit-note', html);
      console.log('submit-note事件已发送');
      console.groupEnd();
    },
    
    // 创建传送门
    createPortal() {
      // 防止重复创建
      if (this.portalTarget) return;
      
      // 创建传送门容器
      this.portalWrapper = document.createElement('div');
      this.portalWrapper.id = 'note-editor-portal-' + Date.now();
      this.portalWrapper.style.position = 'relative';
      this.portalWrapper.style.zIndex = '9999999';
      
      // 创建背景层
      this.portalBackdrop = document.createElement('div');
      Object.assign(this.portalBackdrop.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: '99999',
        cursor: 'pointer'
      });
      
      // 添加背景层点击事件
      this.portalBackdrop.addEventListener('click', this.handleCancel);
      
      // 添加背景层到传送门容器
      this.portalWrapper.appendChild(this.portalBackdrop);
      
      // 等下一帧确保DOM已经渲染
      this.$nextTick(() => {
        // 获取模态内容
        if (this.$refs.modalContent) {
          // 创建一个克隆版本
          this.portalContent = this.$refs.modalContent.cloneNode(true);
          
          // 设置内容样式 - 将编辑器放在屏幕下半部分
          Object.assign(this.portalContent.style, {
            position: 'fixed',
            bottom: '5%',
            left: '50%',
            top: 'auto',
            transform: 'translateX(-50%)',
            zIndex: '999999',
            backgroundColor: '#333',
            color: 'white',
            width: '90%',
            maxWidth: '600px',
            minHeight: '250px',
            maxHeight: '45vh',
            borderRadius: '10px',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            border: '3px solid white'
          });
          
          // 确保传送门中的按钮位置与样式一致
          const modalActions = this.portalContent.querySelector('.modal-actions');
          if (modalActions) {
            Object.assign(modalActions.style, {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              padding: '0 10%',
              marginTop: '5px'
            });
            
            const buttons = modalActions.querySelectorAll('button');
            buttons.forEach(button => {
              button.style.margin = '0 5%';
            });
            
            const submitBtn = modalActions.querySelector('.submit-btn');
            if (submitBtn) {
              submitBtn.style.order = '1';
              submitBtn.style.flex = '0 0 40%';
            }
            
            const cancelBtn = modalActions.querySelector('.cancel-btn');
            if (cancelBtn) {
              cancelBtn.style.order = '2';
              cancelBtn.style.flex = '0 0 40%';
            }
          }
          
          // 复制原始内容到传送门容器
          this.portalWrapper.appendChild(this.portalContent);
          
          // 添加传送门到body
          document.body.appendChild(this.portalWrapper);
          
          // 阻止body滚动
          document.body.style.overflow = 'hidden';
          
          // 为portal内容添加事件处理
          this.setupPortalEvents();
          
          // 保存引用
          this.portalTarget = this.portalWrapper;
          
          // 聚焦编辑器 - 添加延迟确保DOM完全渲染
          setTimeout(() => {
            if (this.editor) {
              this.editor.commands.focus('end');
              console.log('编辑器已自动聚焦');
              
              // 尝试直接用DOM API聚焦
              this.focusEditorDOM();
            }
          }, 100);
        }
      });
    },
    
    // 使用DOM API聚焦编辑器内容
    focusEditorDOM() {
      if (!this.portalContent) return;
      
      try {
        const editorElement = this.portalContent.querySelector('.tiptap-editor');
        if (editorElement) {
          editorElement.tabIndex = 0;
          
          const editableDiv = editorElement.querySelector('[contenteditable="true"]');
          if (editableDiv) {
            editableDiv.focus();
            
            if (document.createRange && window.getSelection) {
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(editableDiv);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      } catch (e) {
        console.error('编辑器聚焦失败:', e);
      }
    },
    
    // 移除传送门
    removePortal() {
      if (this.portalBackdrop) {
        this.portalBackdrop.removeEventListener('click', this.handleCancel);
      }
      
      if (this.portalTarget && document.body.contains(this.portalTarget)) {
        document.body.removeChild(this.portalTarget);
      }
      
      // 恢复body滚动
      document.body.style.overflow = '';
      
      // 重置引用
      this.portalTarget = null;
      this.portalWrapper = null;
      this.portalBackdrop = null;
      this.portalContent = null;
    },
    
    // 为传送门内容设置事件
    setupPortalEvents() {
      console.group('NoteEditor - setupPortalEvents');
      if (!this.portalContent) {
        console.warn('portalContent不存在，无法设置事件');
        console.groupEnd();
        return;
      }
      
      // 找到按钮元素
      const cancelBtn = this.portalContent.querySelector('.cancel-btn');
      const submitBtn = this.portalContent.querySelector('.submit-btn');
      const editorContent = this.portalContent.querySelector('.tiptap-editor');
      
      console.log('按钮元素查找结果:', {
        cancelBtn: !!cancelBtn,
        submitBtn: !!submitBtn,
        editorContent: !!editorContent
      });
      
      // 添加取消事件
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          console.log('取消按钮被点击');
          e.stopPropagation();
          e.preventDefault();
          this.handleCancel();
        });
      }
      
      // 添加提交事件
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          console.log('提交按钮被点击');
          e.stopPropagation();
          e.preventDefault();
          this.handleSubmit(e);
        });
        
        // 添加触摸事件
        submitBtn.addEventListener('touchend', (e) => {
          console.log('提交按钮触摸结束');
          e.stopPropagation();
          e.preventDefault();
          this.handleSubmit(e);
        });
      }
      
      // 阻止编辑器内容冒泡
      if (editorContent) {
        editorContent.addEventListener('click', (e) => {
          e.stopPropagation();
          // 点击编辑器内容区域时自动聚焦
          if (this.editor) {
            this.editor.commands.focus();
          }
          this.focusEditorDOM();
        });
      }
      
      // 阻止整个模态框的点击冒泡
      this.portalContent.addEventListener('click', (e) => {
        e.stopPropagation();
        // 点击模态框任何地方都尝试聚焦编辑器
        if (this.editor) {
          this.editor.commands.focus('end');
        }
        this.focusEditorDOM();
      });
      
      // 初始聚焦
      this.focusEditorDOM();
      
      // 延迟200ms后再次尝试聚焦，以确保编辑器完全加载
      setTimeout(() => {
        if (this.editor) {
          this.editor.commands.focus('end');
          this.focusEditorDOM();
        }
      }, 200);
    },
    
    // 添加聚焦激活器
    activateEditor() {
      // 初始聚焦
      if (this.editor) {
        this.editor.commands.focus('end');
        this.focusEditorDOM();
      }
      
      // 延迟200ms后再次尝试聚焦
      setTimeout(() => {
        if (this.editor) {
          this.editor.commands.focus('end');
          this.focusEditorDOM();
        }
      }, 200);
    }
  }
}
</script>

<style>
/* 基本样式重置 */
* {
  box-sizing: border-box;
}

/* 编辑器内容基本样式 */
.editor-wrapper {
  flex: 1;
  position: relative;
  margin-bottom: 15px;
  background-color: #222;
  border-radius: 8px;
  padding: 10px;
  min-height: 180px;
  max-height: 35vh;
  overflow-y: auto;
}

.editor-wrapper.dark-mode {
  background-color: #222;
}

.tiptap-editor {
  height: 100%;
  width: 100%;
  outline: none;
  padding: 10px;
  font-size: 16px;
  color: white;
  background-color: transparent;
  line-height: 1.5;
  caret-color: #bb86fc !important; /* 强制显示光标颜色 */
}

/* 添加闪烁光标样式 */
.tiptap-editor:focus {
  caret-color: #bb86fc !important;
}

/* 确保可编辑区域显示光标 */
.tiptap-editor [contenteditable="true"] {
  caret-color: #bb86fc !important;
  cursor: text !important;
}

.tiptap-editor.focus-visible {
  outline: 2px solid #bb86fc;
  outline-offset: -2px;
}

/* 光标行高亮 */
.cursor-line-highlight {
  background-color: rgba(98, 0, 238, 0.15);
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(98, 0, 238, 0.3);
  padding: 2px 0;
}

.submit-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background-color: #6200ee;
  color: white;
  cursor: pointer;
  font-weight: bold;
  min-width: 80px;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background-color: #7722ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.submit-btn.dark-mode {
  background-color: #6200ee;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #fff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 5px;
  padding: 0 10%;
  width: 100%;
}

.modal-actions button {
  margin: 0 5%;
}

.submit-btn {
  order: 1;
  flex: 0 0 40%;
}

.cancel-btn {
  order: 2;
  flex: 0 0 40%;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: #444;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background-color: #555;
  transform: translateY(-2px);
}

.tag-highlight {
  color: #bb86fc !important;
  font-weight: bold !important;
}

/* 确保可编辑区域没有边框和轮廓 */
[contenteditable="true"] {
  border: none;
  outline: none;
}
</style>