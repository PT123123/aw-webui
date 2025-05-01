<template>
  <div v-if="showInput" class="note-editor-container">
    <div v-show="false" ref="originalEditorContainer">
        <div class="modal-content" :class="{ 'dark-mode': isDarkMode }">
            <div class="editor-wrapper" :class="{ 'dark-mode': isDarkMode }">
                <div class="tiptap-editor" tabindex="0">
                    <div contenteditable="true"></div>
                 </div>
            </div>
            <div class="modal-actions" :class="{ 'dark-mode': isDarkMode }">
                <button class="submit-btn">发送</button>
                <button class="cancel-btn">取消</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'

// 自定义 #tag 高亮扩展 (代码同上)
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
        find: /#([^\s#]+)/g,
        handler: ({ state, range, match }) => {
          const { tr } = state
          tr.addMark(range.from + match.index, range.from + match.index + match[0].length, this.type.create())
        }
      }
    ]
  }
})

// 自定义光标行高亮扩展 (代码同上)
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
  // 移除 EditorContent 组件，因为我们将在 script 中手动创建 Editor 实例并绑定到 DOM
  // components: { EditorContent }, // 已移除
  created() {
    console.log('NoteEditor组件 created');
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
      editor: null, // Tiptap Editor 实例
      portalTarget: null, // Portal Wrapper 元素
      portalWrapper: null,
      portalBackdrop: null, // Portal 背景元素
      portalContent: null, // Portal 内容容器 (包含编辑器和按钮)
      portalEditorElement: null, // Portal 中用于绑定 Editor 的 DOM 元素
      // 保存 Portal 中事件监听器的引用，以便移除
      _portalCancelHandler: null,
      _portalSubmitHandler: null,
      _portalEditorClickHandler: null,
      _portalContentClickHandler: null,
    }
  },
  mounted() {
    console.log('NoteEditor组件 mounted. showInput:', this.showInput);
    // mounted 时如果 showInput 已经是 true，则创建 Portal 并初始化 Editor
    if (this.showInput) {
      this.createPortal();
      // Portal 创建后，在 nextTick 中初始化 Editor
      this.$nextTick(() => {
         this.initializeEditorInPortal();
      });
    }
  },
  beforeDestroy() {
    console.log('NoteEditor组件 beforeDestroy: 组件即将销毁');
    // 确保在组件销毁前销毁 Editor 实例并移除 Portal
    this.destroyEditorAndRemovePortal();
  },
  watch: {
    showInput(newVal) {
      console.log('watch: showInput changed to', newVal);
      if (newVal) {
        // showInput 变为 true，创建 Portal 并初始化 Editor
        this.createPortal();
        this.$nextTick(() => {
           this.initializeEditorInPortal();
        });
      } else {
        // showInput 变为 false，销毁 Editor 并移除 Portal
        this.destroyEditorAndRemovePortal();
      }
    },
    value(newVal) {
      console.log('watch: value changed. New value:', newVal, 'Editor exists:', !!this.editor);
      // 如果 editor 存在，并且新的 value 和当前编辑器内容不同，则更新编辑器内容
      // 这个 watcher 用于处理从父组件外部更新编辑器内容的情况
      if (this.editor && newVal !== this.editor.getHTML()) {
        console.log('watch: value changed. Setting editor content with newVal.');
        this.editor.commands.setContent(newVal || '', false);
         // 更新内容后尝试重新聚焦，保持用户体验
         setTimeout(() => this.editor.commands.focus('end'), 50);
      } else if (this.editor) {
         console.log('watch: value changed, but editor content is already the same or newVal is empty.');
      } else {
         console.log('watch: value changed, but editor instance does not exist yet (Portal not open?).');
      }
    }
  },
  methods: {
    // 创建 Portal 的 DOM 结构并添加到 body
    createPortal() {
      console.log('createPortal: 开始创建 Portal DOM结构. portalTarget exists:', !!this.portalTarget);
      if (this.portalTarget) return; // 防止重复创建

      // 1. 创建 Portal Wrapper (包含背景和内容)
      this.portalWrapper = document.createElement('div');
      this.portalWrapper.id = 'note-editor-portal-' + Date.now(); // 确保 ID 唯一
      Object.assign(this.portalWrapper.style, {
         position: 'fixed', // 使用 fixed 覆盖整个屏幕
         top: '0', left: '0', width: '100vw', height: '100vh',
         zIndex: '9999999', // 确保在最上层
         display: 'flex', // flex 布局让内容居中
         justifyContent: 'center',
         alignItems: 'flex-end', // 让内容靠底部对齐
         paddingBottom: '5vh', // 底部留出空间
         boxSizing: 'border-box',
         backgroundColor: 'rgba(0, 0, 0, 0.8)', // 背景遮罩
         backdropFilter: 'blur(5px)', // 磨砂效果 (可选)
      });

      // 2. 创建 Portal 内容容器 (模态框本身)
      this.portalContent = document.createElement('div');
       // 使用 modal-content 类来应用样式
      this.portalContent.className = 'modal-content';
      if (this.isDarkMode) {
          this.portalContent.classList.add('dark-mode');
      }
      Object.assign(this.portalContent.style, {
          // position, top, left, transform 等不再需要 fixed 布局里的属性
          // width, maxWidth 等属性通过 class 或直接设置
          //backgroundColor: '#333', // 背景色由 class 控制
          //color: 'white', // 文字颜色由 class 控制
          width: '90%',
          maxWidth: '600px',
          minHeight: '250px',
          maxHeight: '45vh',
          borderRadius: '10px',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          //border: '3px solid white' // 边框由 class 控制
      });

      // 3. 创建编辑器 Wrapper 和 编辑器 DOM 元素本身
      const editorWrapper = document.createElement('div');
      editorWrapper.className = 'editor-wrapper'; // 使用 editor-wrapper 类应用样式
      if (this.isDarkMode) {
          editorWrapper.classList.add('dark-mode');
      }
      Object.assign(editorWrapper.style, {
         flex: '1', // 填充剩余空间
         position: 'relative', // 保持相对定位，如果内部有绝对定位元素
         // background, border-radius, padding, min/max-height, overflow 由 class 控制
      });

      // 这是实际用于绑定 Tiptap Editor 的 DOM 元素
      this.portalEditorElement = document.createElement('div');
      this.portalEditorElement.className = 'tiptap-editor'; // 使用 tiptap-editor 类应用样式
      this.portalEditorElement.setAttribute('tabindex', '0'); // 确保可聚焦
      Object.assign(this.portalEditorElement.style, {
          // height, width, outline, padding, font-size, color, background, line-height, caret-color 由 class 控制
          // overflow-y: 'auto' 由 class 控制
      });


      // 将编辑器元素添加到其包装器中
      editorWrapper.appendChild(this.portalEditorElement);
      // 将编辑器包装器添加到内容容器中
      this.portalContent.appendChild(editorWrapper);


      // 4. 创建按钮容器和按钮
      const modalActions = document.createElement('div');
      modalActions.className = 'modal-actions'; // 使用 modal-actions 类应用样式
       if (this.isDarkMode) {
          modalActions.classList.add('dark-mode');
      }
       // 样式 (同上略)，由 class 和 style Object.assign 共同控制
       Object.assign(modalActions.style, {
          // display, justifyContent, alignItems, margin-top, padding, width 由 class 控制
       });


      const submitBtn = document.createElement('button');
      submitBtn.className = 'submit-btn'; // 使用 submit-btn 类应用样式
       if (this.isDarkMode) {
           submitBtn.classList.add('dark-mode');
       }
      submitBtn.textContent = '发送'; // 按钮文本
       // 样式 (同上略)，由 class 和 style Object.assign 共同控制
       Object.assign(submitBtn.style, {
          // padding, border-radius, border, background, color, cursor, font-weight, min-width, transition 由 class 控制
          order: '1', flex: '0 0 40%', // flex 布局属性
       });


      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'cancel-btn'; // 使用 cancel-btn 类应用样式
       if (this.isDarkMode) {
           cancelBtn.classList.add('dark-mode');
       }
      cancelBtn.textContent = '取消'; // 按钮文本
       // 样式 (同上略)，由 class 和 style Object.assign 共同控制
        Object.assign(cancelBtn.style, {
          // padding, border-radius, border, background, color, cursor, transition 由 class 控制
           order: '2', flex: '0 0 40%', // flex 布局属性
        });


      // 将按钮添加到按钮容器
      modalActions.appendChild(submitBtn);
      modalActions.appendChild(cancelBtn);
      // 将按钮容器添加到内容容器
      this.portalContent.appendChild(modalActions);


      // 5. 将 Portal 内容添加到 Portal Wrapper
      this.portalWrapper.appendChild(this.portalContent);

      // 6. 将 Portal Wrapper 添加到 body
      document.body.appendChild(this.portalWrapper);
      document.body.style.overflow = 'hidden'; // 阻止 body 滚动

      // 保存 Portal Wrapper 的引用
      this.portalTarget = this.portalWrapper;

      console.log('createPortal: Portal DOM 结构创建并添加到 body.');

      // 注意：Editor 实例的创建将在 initializeEditorInPortal 中进行
    },

    // 初始化 Tiptap Editor 实例并绑定到 Portal DOM
    initializeEditorInPortal() {
        console.log('initializeEditorInPortal: 开始初始化 Tiptap Editor.');
        // 确保 Portal DOM 结构和用于绑定的元素已存在
        if (!this.portalEditorElement) {
            console.error('initializeEditorInPortal: Portal 编辑器 DOM 元素不存在，无法初始化 Editor.');
            return;
        }

        // 如果已经有 Editor 实例存在，先销毁（理论上在 destroyEditorAndRemovePortal 中处理了）
        if (this.editor) {
            console.log('initializeEditorInPortal: 发现旧的 Editor 实例，先销毁.');
            this.editor.destroy();
            this.editor = null;
        }

        // 创建新的 Tiptap Editor 实例，并将其绑定到 Portal 的 DOM 元素上
        this.editor = new Editor({
          // *** 将新的 Editor 实例绑定到 Portal 中创建的 DOM 元素 ***
          element: this.portalEditorElement,
          extensions: [
            StarterKit,
            TagMark,
            CursorHighlight
          ],
          // 使用传入的 value 或默认值作为初始内容
          content: this.value || '',
          onUpdate: ({ editor }) => {
            // --- LOG 1: 在 Portal Editor 内容更新时获取 HTML 并 Log ---
            const currentHTML = editor.getHTML();
            console.log('Portal Editor onUpdate: Content updated. Current HTML:', currentHTML);
            this.$emit('input', currentHTML);
          },
          autofocus: 'end', // 自动聚焦到末尾
          editorProps: {
            attributes: {
              class: 'focus-visible',
              autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false'
            },
          },
          onFocus: () => {
            console.log('Portal Editor onFocus: 编辑器已获得焦点');
          },
          onCreate: ({ editor }) => {
            // --- LOG 2: Portal Editor 创建成功时 Log ---
            console.log('Portal Editor onCreate: 编辑器实例已创建并绑定到 Portal DOM.', this.editor);
            // 创建完成后，设置 Portal 中的事件监听
            this.setupPortalEvents();
            // 尝试聚焦
            setTimeout(() => {
              if (editor && editor.commands) {
                 editor.commands.focus('end');
                 console.log('Portal Editor onCreate: 延迟聚焦尝试 (50ms)');
              } else {
                 console.log('Portal Editor onCreate: Editor或commands未准备好，无法聚焦');
              }
            }, 50);
          }
        });

        console.log('initializeEditorInPortal: Tiptap Editor 实例初始化完成并绑定到 Portal.');

        // 触发多次聚焦尝试，确保在不同环境下都能聚焦
        this.activateEditor();
    },

    // 销毁 Editor 实例并移除 Portal DOM
    destroyEditorAndRemovePortal() {
        console.log('destroyEditorAndRemovePortal: 开始销毁 Editor 并移除 Portal...');
        // 1. 销毁 Editor 实例
        if (this.editor) {
            console.log('destroyEditorAndRemovePortal: 销毁 Editor 实例.');
            this.editor.destroy();
            this.editor = null; // 清空引用
        }

        // 2. 移除 Portal DOM
        this.removePortal();
         console.log('destroyEditorAndRemovePortal: Editor 已销毁，Portal 已移除.');
    },

    // 移除 Portal 的 DOM 结构
    removePortal() {
       console.log('removePortal: 移除 Portal DOM...');
      // 移除 Portal 中的事件监听，防止内存泄漏
       this.removePortalEvents();
       console.log('removePortal: 移除 Portal 事件监听');

      // 从 body 移除 Portal Wrapper
      if (this.portalTarget && document.body.contains(this.portalTarget)) {
        document.body.removeChild(this.portalTarget);
        console.log('removePortal: Portal Wrapper 从 body 移除');
      }

      // 恢复 body 滚动
      document.body.style.overflow = '';
      console.log('removePortal: 恢复 body 滚动');

      // 重置 Portal 相关的引用
      this.portalTarget = null;
      this.portalWrapper = null;
      this.portalBackdrop = null;
      this.portalContent = null;
      this.portalEditorElement = null;
      console.log('removePortal: 重置 Portal 引用');
    },

     // 移除 Portal 内容上的事件监听 (现在我们有引用了，可以精确移除)
     removePortalEvents() {
        if (!this.portalContent) return;

        const cancelBtn = this.portalContent.querySelector('.cancel-btn');
        const submitBtn = this.portalContent.querySelector('.submit-btn');
        const editorContent = this.portalContent.querySelector('.tiptap-editor');

        if (cancelBtn && this._portalCancelHandler) {
            cancelBtn.removeEventListener('click', this._portalCancelHandler);
            this._portalCancelHandler = null;
             console.log('removePortalEvents: 移除 取消 按钮监听');
        }
        if (submitBtn && this._portalSubmitHandler) {
            submitBtn.removeEventListener('click', this._portalSubmitHandler);
            this._portalSubmitHandler = null;
             console.log('removePortalEvents: 移除 发送 按钮监听');
        }
        if (editorContent && this._portalEditorClickHandler) {
            editorContent.removeEventListener('click', this._portalEditorClickHandler);
            this._portalEditorClickHandler = null;
             console.log('removePortalEvents: 移除 编辑器区域点击 监听');
        }
        if (this.portalContent && this._portalContentClickHandler) {
             this.portalContent.removeEventListener('click', this._portalContentClickHandler);
             this._portalContentClickHandler = null;
              console.log('removePortalEvents: 移除 Portal 内容点击 监听');
        }
         console.log('removePortalEvents: Portal 事件监听移除完成');
     },


    // 为 Portal 中的 DOM 元素设置事件监听 (绑定到 Portal 中的按钮和编辑器)
    setupPortalEvents() {
      console.log('setupPortalEvents: 设置 Portal 事件监听 (绑定到动态创建的DOM)...');
      if (!this.portalContent) {
         console.log('setupPortalEvents: portalContent 不存在，无法设置事件。');
         return;
      }

       // 找到 Portal 中的按钮和编辑器容器
      const cancelBtn = this.portalContent.querySelector('.cancel-btn');
      const submitBtn = this.portalContent.querySelector('.submit-btn');
      const editorContent = this.portalContent.querySelector('.tiptap-editor');

      // 添加取消事件
      if (cancelBtn) {
        // 使用方法引用并保存，以便移除
        this._portalCancelHandler = (e) => {
           e.stopPropagation();
           console.log('Portal取消按钮点击，调用 handleCancel');
           this.handleCancel();
        };
        cancelBtn.addEventListener('click', this._portalCancelHandler);
         console.log('setupPortalEvents: 添加 取消 按钮监听');
      }

      // 添加提交事件
      if (submitBtn) {
         this._portalSubmitHandler = (e) => {
           e.stopPropagation();
           console.log('Portal发送按钮点击，调用 handleSubmit');
           this.handleSubmit(); // 调用组件的 handleSubmit 方法
         };
         submitBtn.addEventListener('click', this._portalSubmitHandler);
         console.log('setupPortalEvents: 添加 发送 按钮监听');
      }

       // 阻止编辑器内容冒泡并尝试聚焦
       if (editorContent) {
           this._portalEditorClickHandler = (e) => {
               e.stopPropagation();
               console.log('Portal编辑器内容区域点击...');
               // 现在 this.editor 应该绑定到这个 DOM 了，可以直接调用 Tiptap focus
               if (this.editor && this.editor.commands) {
                   this.editor.commands.focus();
                    console.log('Portal编辑器点击: Tiptap focus command called.');
               } else {
                   console.log('Portal编辑器点击: Editor实例未准备好，无法 Tiptap 聚焦');
               }
               this.focusEditorDOM(); // 同时尝试 DOM API 聚焦作为后备
           };
          editorContent.addEventListener('click', this._portalEditorClickHandler);
           console.log('setupPortalEvents: 添加 Portal 编辑器区域点击 监听');
       }

       // 阻止整个模态框的点击冒泡并尝试聚焦
       if (this.portalContent) {
            this._portalContentClickHandler = (e) => {
              e.stopPropagation();
              console.log('Portal模态框内容区点击 (非按钮/编辑器区域)');
               if (this.editor && this.editor.commands) {
                  this.editor.commands.focus('end'); // 尝试聚焦到末尾
                  console.log('Portal模态框点击: Tiptap focus end command called.');
               } else {
                  console.log('Portal模态框点击: Editor实例未准备好，无法 Tiptap 聚焦');
               }
               this.focusEditorDOM(); // DOM API 强制聚焦到 Portal 中的 DOM
           };
           this.portalContent.addEventListener('click', this._portalContentClickHandler);
            console.log('setupPortalEvents: 添加 Portal 模态框内容点击 监听');
       }

      console.log('setupPortalEvents: Portal 事件监听设置完成.');

      // 多次聚焦尝试，确保成功 (现在它们作用于绑定到 Portal DOM 的 editor 实例)
       this.activateEditor();
    },

     // 使用 DOM API 直接聚焦到 Portal 中的编辑器内容
    focusEditorDOM() {
       console.log('focusEditorDOM: 尝试直接DOM聚焦 Portal 中的编辑器元素...');
       // 现在 portalContent 是动态创建的 Portal DOM 容器
       if (!this.portalContent) {
         console.log('focusEditorDOM: portalContent (Portal DOM) 不存在。');
         return;
       }

       try {
          // 在 Portal 的 DOM 结构中查找编辑器相关的元素
           // 我们知道用于绑定 editor 的元素就是 this.portalEditorElement
           const editorElement = this.portalEditorElement; // 直接使用引用
           if (!editorElement) {
              console.log('focusEditorDOM: portalEditorElement 不存在。');
              return;
           }

            console.log('focusEditorDOM: 找到 portalEditorElement');
            editorElement.tabIndex = 0; // 确保可聚焦
            editorElement.focus(); // DOM 原生聚焦
            console.log('focusEditorDOM: 使用 tabIndex 和 focus 尝试');

            const editableDiv = editorElement.querySelector('[contenteditable="true"]');
            if (editableDiv) {
              console.log('focusEditorDOM: 找到 [contenteditable="true"] 元素在 Portal 内容中');
              editableDiv.focus(); // 直接对可编辑区域聚焦
              console.log('focusEditorDOM: 直接对 [contenteditable="true"] 元素 focus 尝试');

              // 尝试设置光标到末尾
              if (document.createRange && window.getSelection) {
                const range = document.createRange();
                const selection = window.getSelection();
                 // 确保 editableDiv 有内容节点或至少是空的 P 标签等，以便设置 Range
                 if (editableDiv.firstChild) { // 检查是否有子节点
                     range.selectNodeContents(editableDiv); // 选中所有内容
                     range.collapse(false); // 将选区折叠到末尾 (光标就在末尾了)
                     selection.removeAllRanges(); // 移除所有旧的选区
                     selection.addRange(range); // 添加新的选区 (光标)
                     console.log('focusEditorDOM: 设置光标位置到内容末尾成功');
                 } else {
                     // 如果 editableDiv 是完全空的，直接 focus 就可以
                     editableDiv.focus();
                     console.log('focusEditorDOM: [contenteditable="true"] 为空，直接 focus');
                 }

              } else {
                 console.log('focusEditorDOM: 浏览器不支持 createRange 或 getSelection，无法设置光标位置。');
              }
            } else {
              console.log('focusEditorDOM: 未找到 [contenteditable="true"] 元素在 Portal 内容中。');
            }
       } catch (e) {
         console.error('focusEditorDOM: DOM聚焦失败:', e);
       }
    },

    // 多次尝试聚焦编辑器，现在作用于绑定到 Portal DOM 的实例
    activateEditor() {
      console.log('activateEditor: 开始激活编辑器 (多次尝试聚焦)...');
      const focusTimes = [50, 150, 300, 600, 1000]; // 更多尝试时间点

      focusTimes.forEach(time => {
        setTimeout(() => {
           console.log(`activateEditor: ${time}ms 后尝试聚焦... editor exists:`, !!this.editor);
          if (this.editor && this.editor.commands) {
            // 调用 Tiptap focus command
            this.editor.commands.focus('end');
            console.log(`activateEditor: ${time}ms 后 Tiptap focus command called.`);
          } else {
             console.log(`activateEditor: ${time}ms 后 Editor实例未准备好，无法 Tiptap 聚焦`);
          }
           // 同时尝试 DOM API 聚焦作为后备
          this.focusEditorDOM();
        }, time);
      });
    },

    // handleEditorClick 方法现在可能用不到了，因为 Portal 中的点击会由 handleEditorClickInternal 处理
    // 但保留以防万一或非 Portal 场景
    handleEditorClick(e) {
      e.stopPropagation();
      console.log('handleEditorClick: 编辑器区域被点击 (可能是原始隐藏的区域或未移除的监听器)');
      // 这个监听器最初绑定在原始的 <editor-content> 上
      if (this.editor && this.editor.commands) {
        this.editor.commands.focus();
        console.log('handleEditorClick: Tiptap focus command called.');
      } else {
         console.log('handleEditorClick: Editor或commands未准备好，无法聚焦');
      }
    },

    handleTagClick(e) {
       console.log('handleTagClick: Tag clicked');
      if (e.target.classList.contains('tag-highlight')) {
        const tag = e.target.textContent;
         console.log('handleTagClick: Tag textContent:', tag);
        this.$emit('filter-by-tag', tag);
      }
    },

    // handleCancel 方法保持不变，它只发出事件
    handleCancel(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      console.log('handleCancel: 关闭编辑器');
      this.$emit('cancel-edit');
    },

    // handleSubmit 方法保持不变，它从 this.editor 获取内容并发事件
    handleSubmit(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      console.log('handleSubmit: 尝试提交...');

      // 现在 this.editor 应该指向 Portal 中创建的实例
      if (!this.editor) {
        console.log('handleSubmit: Editor实例不存在，无法提交。');
        return;
      }

      // --- 检查 Tiptap Editor 实例当前关联的 DOM 元素 ---
      // 现在这个 Log 应该指向 Portal 中可见的 DOM 元素了
      if (this.editor.view && this.editor.view.dom) {
          console.log('handleSubmit: Editor实例当前关联的 DOM 元素是:', this.editor.view.dom);
      } else {
          console.log('handleSubmit: Editor实例存在，但无法访问 view.dom (可能尚未完全初始化或已损坏)。');
      }
      // -----------------------------------------


      // --- 获取并 Log HTML 和 Text ---
      let html = this.editor.getHTML();
      const text = this.editor.getText();
      console.log('handleSubmit: 获取到 HTML:', html); // 现在应该有内容了
      console.log('handleSubmit: 获取到 Text:', text);   // 现在应该有内容了
      console.log('handleSubmit: Trimmed Text 是否为空:', !text.trim());

      if (!text.trim() || this.isSubmitting) {
        console.log('handleSubmit: Text 为空或正在提交中，阻止提交。');
        return;
      }

      // 清理HTML (如果需要)
       console.log('handleSubmit: 清理前 HTML:', html);
      html = html.replace(/<span style="color: #bb86fc; font-weight: bold;" data-tag="true">(.*?)<\/span>/g,
                          '<span class="tag-highlight" data-tag="true">$1</span>');
       console.log('handleSubmit: 清理后 HTML:', html);

      // 延迟触发提交事件
      this.$nextTick(() => {
        console.log('handleSubmit: $nextTick 中，即将发出 submit-note 事件，携带 HTML:', html);
        this.$emit('submit-note', html);
      });
    },
  }
}
</script>

<style>
/* ... Style 部分保持不变，因为我们将动态创建的 DOM 元素赋予相同的类名 ... */

/* 基本样式重置 */
* {
  box-sizing: border-box;
}

/* 整个组件容器，控制 Portal 场景下包裹 showInput 的最外层 div */
.note-editor-container {
    /* 如果你需要给最外层容器加 Portal 的 fixed 定位，可以在这里加 */
    /* position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999998; */
    /* 但我们的 Portal Wrapper 已经有这些样式了，所以这个容器可能只需要 v-if 来控制存在 */
}


/* modal-content 类现在应用于 Portal 中动态创建的容器 */
.modal-content {
   position: fixed; /* 使用 fixed 定位在视口中 */
   bottom: 5%; /* 底部留出空间 */
   left: 50%; /* 居中 */
   transform: translateX(-50%); /* 水平居中 */
   z-index: 999999; /* 在背景之上 */
   background-color: #333;
   color: white;
   width: 90%;
   max-width: 600px;
   min-height: 250px;
   max-height: 45vh;
   border-radius: 10px;
   box-shadow: 0 0 30px rgba(0,0,0,0.5);
   padding: 20px;
   display: flex;
   flex-direction: column;
   border: 3px solid white; /* 边框 */
   box-sizing: border-box; /* 确保 padding 和 border 不增加总尺寸 */
}

.modal-content.dark-mode {
  background-color: #333; /* 深色模式背景 */
  color: white; /* 深色模式文字 */
  border: 3px solid white;
}


/* editor-wrapper 类应用于 Portal 中动态创建的编辑器容器 */
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
  display: flex;
  flex-direction: column;
   box-sizing: border-box;
}

.editor-wrapper.dark-mode {
  background-color: #222;
}

/* tiptap-editor 类应用于 Portal 中动态创建的实际 Tiptap 绑定元素 */
.tiptap-editor {
  /* flex: 1; */
  height: 100%;
  width: 100%;
  outline: none;
  padding: 10px;
  font-size: 16px;
  color: white;
  background-color: transparent;
  line-height: 1.5;
  caret-color: #bb86fc !important;
  overflow-y: auto;
  box-sizing: border-box; /* 确保 padding 不影响尺寸 */
}

/* 确保可编辑区域显示光标 */
.tiptap-editor [contenteditable="true"] {
  caret-color: #bb86fc !important;
  cursor: text !important;
  min-height: 100%; /* 确保可编辑区域撑满父容器 */
  outline: none;
   box-sizing: border-box;
}

.tiptap-editor:focus-within,
.tiptap-editor [contenteditable="true"]:focus {
   caret-color: #bb86fc !important;
   outline: none;
}

.tiptap-editor.focus-visible,
.tiptap-editor [contenteditable="true"].focus-visible {
  outline: 2px solid #bb86fc;
  outline-offset: -2px;
}


/* 光标行高亮 */
/* 这些样式会由 CursorHighlight 扩展应用到内部的段落等块级元素上 */
.cursor-line-highlight {
  background-color: rgba(98, 0, 238, 0.15);
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(98, 0, 238, 0.3);
  padding: 2px 0;
  margin: 0; /* important for lists etc. */
  display: block; /* important */
}

/* modal-actions 类应用于 Portal 中动态创建的按钮容器 */
.modal-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 5px;
  padding: 0 10%;
  width: 100%;
   box-sizing: border-box;
}

/* 按钮样式应用于 Portal 中动态创建的按钮 */
.modal-actions button {
  margin: 0 5%;
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
  order: 1;
  flex: 0 0 40%;
   box-sizing: border-box;
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
   box-sizing: border-box;
}

.cancel-btn:hover {
  background-color: #555;
  transform: translateY(-2px);
}

/* Tag 样式 */
.tag-highlight {
  color: #bb86fc !important;
  font-weight: bold !important;
}
</style>