<template>
  <div v-if="showInput" class="note-editor-container">
    <div v-show="false" ref="originalEditorContainer">
        <div class="modal-content" :class="{ 'dark-mode': isDarkMode }">
            <div class="editor-wrapper" :class="{ 'dark-mode': isDarkMode }">
                <div class="tiptap-editor" tabindex="0">
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
import { Plugin, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

const TagMark = Mark.create({
  name: 'tagmark',
  parseHTML() {
    return [
      { tag: 'span[data-tag]' },
      { tag: 'span.tag-highlight' }
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 
      class: 'tag-highlight', 
      'data-tag': 'true',
      style: 'color: #bb86fc; font-weight: bold;'
    }, 0]
  },
  addInputRules() {
    // 更严格的标签检测规则，确保准确匹配
    return [
      {
        find: /(^|\s)(#[\w\u4e00-\u9fa5]+)(?=\s|$)/g,  // 严格匹配，要求标签后为空格或行尾
        handler: ({ state, range, match }) => {
          console.log('[tag] 输入规则触发，原始匹配:', match, '范围:', range);
          
          // 检查是否处于输入法状态，如果是则跳过处理
          if (window.isComposing) {
            console.log('[tag] 输入法输入中，暂不处理标签');
            return null;
          }
          
          try {
            // 获取当前文档和事务
            const { tr } = state;
            const currentDoc = state.doc;
            
            // 解析匹配结果
            const prefix = match[1]; // 前缀（空格或行首）
            const tagWithHash = match[2]; // 完整标签（带#）
            console.log('[tag] 识别到的标签:', tagWithHash);
            
            // 检查当前整个文本内容
            console.log('[tag] 当前文档完整文本:', currentDoc.textContent);
            
            // 验证标签有效性
            if (tagWithHash.length <= 1) {
              console.log('[tag] 标签过短，跳过处理');
              return null;
            }
            
            // 计算标签在文档中的位置 - 这个位置是包含#号的
            const startPosInDoc = range.from + prefix.length;
            const endPosInDoc = startPosInDoc + tagWithHash.length;
            
            // 记录位置和文本内容，用于调试
            console.log('[tag] 计算出的标记范围:', startPosInDoc, endPosInDoc);
            const textInRange = currentDoc.textBetween(startPosInDoc, endPosInDoc);
            console.log('[tag] 文档中对应的文本:', textInRange);
            
            // 验证文本匹配
            if (textInRange !== tagWithHash) {
              console.log('[tag] 错误：计算范围内的文本与匹配到的标签不符，放弃处理');
              return null;
            }
            
            // 检查是否已有标记
            let hasExistingMark = false;
            state.doc.nodesBetween(startPosInDoc, endPosInDoc, (node, pos) => {
              if (node.marks.find(mark => mark.type.name === 'tagmark')) {
                hasExistingMark = true;
                return false; // 停止遍历
              }
              return true;
            });
            
            if (hasExistingMark) {
              console.log('[tag] 此范围已有标记，跳过处理');
              return null;
            }
            
            // 记录当前选择状态
            const { selection } = state;
            
            // 添加标记
            console.log('[tag] 添加标记，范围:', startPosInDoc, '-', endPosInDoc);
            tr.addMark(startPosInDoc, endPosInDoc, this.type.create());
            
            // 保持原有选择位置，不修改选择状态
            console.log('[tag] 保持原有选择位置');
            return tr;
          } catch (e) {
            console.error('[tag] 处理标签出错:', e);
            return null;
          }
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
    // 初始化全局输入法状态
    window.isComposing = false;
    this._lastProcessedHTML = null; // Initialize to null or a unique string
    this._processingTag = false;
    this._editorViewMounted = false;
    this._skipNextTagProcessing = false; // 新增变量，用于控制是否跳过下一次标签处理
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
      _setupTagsTimeout: null,
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
    // 清理定时器
    if (this._setupTagsTimeout) {
      clearTimeout(this._setupTagsTimeout);
      this._setupTagsTimeout = null;
    }
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
        // 只在初始化空编辑器内容时聚焦，避免在用户编辑过程中重新聚焦导致光标位置丢失
        if (!newVal || newVal === '') {
         setTimeout(() => this.editor.commands.focus('end'), 50);
        }
      } else if (this.editor) {
         console.log('watch: value changed, but editor content is already the same or newVal is empty.');
      } else {
         console.log('watch: value changed, but editor instance does not exist yet (Portal not open?).');
      }
    }
  },
  methods: {
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
      console.log('[tag] handleTagClick: 标签被点击');
      
      // 确定点击的元素是标签元素
      const target = e.target.closest('[data-tag="true"]') || e.target;
      
      if (target && target.hasAttribute('data-tag')) {
        const tagText = target.textContent || '';
        
        // 确保文本内容是一个有效的标签，必须以#开头
        if (tagText.startsWith('#')) {
          const tagMatch = tagText.match(/^(#[\w\u4e00-\u9fa5!@#$%^&*()_\-+=[\]{}|\\:;<>,.?/]+)/);
          if (tagMatch && tagMatch[1]) {
            const validTag = tagMatch[1];
            console.log('[tag] handleTagClick: 点击标签:', validTag);
            this.$emit('filter-by-tag', validTag);
          } else {
            console.log('[tag] handleTagClick: 标签内容不匹配标准格式:', tagText);
          }
        } else {
          console.log('[tag] handleTagClick: 标签内容不以#开头:', tagText);
        }
      } else {
        console.log('[tag] handleTagClick: 未找到标签元素');
      }
    },
    handleCancel(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      console.log('handleCancel: 关闭编辑器');
      this.$emit('cancel-edit');
    },
    handleSubmit(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      console.log('handleSubmit: 尝试提交...');

      // 确保编辑器实例存在
      if (!this.editor) {
        console.log('handleSubmit: Editor实例不存在，无法提交。');
        return;
      }

      // 获取纯文本内容
      const rawText = this.editor.getText();
      console.log('handleSubmit: 获取到纯文本:', rawText);

      // 检查内容是否为空或正在提交
      if (!rawText.trim() || this.isSubmitting) {
        console.log('handleSubmit: 文本为空或正在提交中，阻止提交。');
        return;
      }
      
      // 使用更安全的方式构建内容 - 不使用HTML，只用纯文本
      let finalText = rawText.trim();
      console.log('handleSubmit: 准备提交纯文本:', finalText);
      
      // 延迟触发提交事件
      this.$nextTick(() => {
        console.log('handleSubmit: $nextTick 中，即将发出 submit-note 事件，携带纯文本:', finalText);
        this.$emit('submit-note', finalText);
      });
    },
    
    // 创建传送门
    // 创建 Portal 的 DOM 结构并添加到 body
    createPortal() {
      console.log('createPortal: 开始创建 Portal DOM...');
      
      if (this.portalTarget) {
        console.log('createPortal: Portal 已存在，直接返回');
        return;
      }
      
      // 创建 Portal DOM 结构
      this.$nextTick(() => {
        // 从 template 原始结构中获取内容
        const originalContent = this.$refs.originalEditorContainer;
        
        if (!originalContent) {
          console.error('createPortal: 无法获取原始模板内容 (originalEditorContainer ref 不存在)');
          return;
        }
        
        // 创建背景层和内容容器
        this.portalWrapper = document.createElement('div');
        this.portalBackdrop = document.createElement('div');
        this.portalContent = originalContent.innerHTML ? originalContent.cloneNode(true).firstElementChild : document.createElement('div');
        
        // 确保获取到 DOM 内容
        if (!this.portalContent) {
          console.error('createPortal: 无法克隆原始内容');
          return;
        }
        
        // 设置样式
        Object.assign(this.portalWrapper.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          zIndex: '999998'
        });
        
        Object.assign(this.portalBackdrop.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: '-1'
        });
        
        // 将背景层添加到 wrapper
        this.portalWrapper.appendChild(this.portalBackdrop);
        
        // 为Portal内容设置样式
        Object.assign(this.portalContent.style, {
          position: 'absolute',
          bottom: '30px',
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
        
        // 先查找并保存编辑器元素引用
        this.portalEditorElement = this.portalContent.querySelector('.tiptap-editor');
        if (!this.portalEditorElement) {
          console.error('createPortal: 无法在Portal内容中找到编辑器DOM元素 (.tiptap-editor)');
          
          // 尝试创建一个编辑器元素
          this.portalEditorElement = document.createElement('div');
          this.portalEditorElement.className = 'tiptap-editor';
          this.portalEditorElement.setAttribute('tabindex', '0');
          
          // 将创建的编辑器元素添加到合适的位置
          const editorWrapper = this.portalContent.querySelector('.editor-wrapper');
          if (editorWrapper) {
            // 如果编辑器包装器存在，将新创建的编辑器元素添加到其中
            editorWrapper.prepend(this.portalEditorElement);
            console.log('createPortal: 创建了新的编辑器DOM元素并添加到编辑器包装器中');
          } else {
            // 如果找不到编辑器包装器，尝试直接添加到内容元素
            console.warn('createPortal: 找不到编辑器包装器，尝试直接添加到内容元素');
            this.portalContent.prepend(this.portalEditorElement);
          }
        } else {
          console.log('createPortal: 成功找到编辑器DOM元素');
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
        
        console.log('createPortal: Portal DOM 创建完成，DOM 元素:', this.portalEditorElement);
        
        // 不在此处聚焦，而是依靠activateEditor统一处理
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
            // 自定义配置StarterKit，禁用部分Markdown格式，保留列表和加粗
            StarterKit.configure({
              heading: false,        // 禁用标题
              italic: false,         // 禁用斜体
              blockquote: false,     // 禁用引用块
              code: false,           // 禁用代码
              codeBlock: false,      // 禁用代码块
              horizontalRule: false, // 禁用水平线
              strike: false,         // 禁用删除线
              hardBreak: true,       // 保留硬换行
              // 保留以下功能
              paragraph: true,
              text: true,
              bold: true,            // 启用加粗
              bulletList: true,      // 启用无序列表
              orderedList: true,     // 启用有序列表
            }),
            TagMark,
            CursorHighlight
          ],
          // 使用传入的 value 或默认值作为初始内容
          content: this.value || '',
          onUpdate: ({ editor }) => {
            if (!this._editorViewMounted) return;

            const currentHTMLSnapshot = editor.getHTML(); // Snapshot at the very start of onUpdate
            console.log(`[tag] onUpdate: Fired. HTML Snapshot Length: ${currentHTMLSnapshot.length}`);

            // 如果正在处理中，跳过这次触发
            if (this._processingTag) {
              console.log("[tag] onUpdate: Already processing (_processingTag=true), skipping this update trigger.");
              return;
            }

            // 如果内容没变，跳过处理
            if (this._lastProcessedHTML === currentHTMLSnapshot) {
              console.log("[tag] onUpdate: HTML content identical to _lastProcessedHTML, skipping.");
              return;
            }
            
            console.log(`[tag] onUpdate: HTML changed or first run. LastProcessedHTML Length: ${this._lastProcessedHTML ? this._lastProcessedHTML.length : 'null'}, CurrentSnapshot Length: ${currentHTMLSnapshot.length}`);

            if (this._setupTagsTimeout) {
              clearTimeout(this._setupTagsTimeout);
              this._setupTagsTimeout = null;
              console.log("[tag] onUpdate: Cleared previous _setupTagsTimeout");
            }

            // 检查是否可能包含标签
            const hasPotentialTag = currentHTMLSnapshot.includes('#') || 
                                    currentHTMLSnapshot.includes('data-tag="true"') || 
                                    currentHTMLSnapshot.includes('class="tag-highlight"') ||
                                    currentHTMLSnapshot.includes('<strong');

            // 如果正在输入法输入中或需要跳过处理，记录但不处理
            if (window.isComposing || this._skipNextTagProcessing) {
              console.log(`[tag] onUpdate: 跳过处理 (输入法=${window.isComposing}, 跳过标记=${this._skipNextTagProcessing})`);
              
              // 即使跳过，仍更新_lastProcessedHTML以避免重复处理相同内容
              this._lastProcessedHTML = currentHTMLSnapshot;
              
              // 仍然触发input事件以更新外部绑定值
              if (this.value !== currentHTMLSnapshot) {
                this.$emit('input', currentHTMLSnapshot || '');
              }
              return;
            }

            if (hasPotentialTag) {
              console.log("[tag] onUpdate: Potential tag/strong found. Scheduling processing for HTML snapshot.");
              
              // 使用较长的延迟，确保中文输入完成，特别是在中文输入法和Tiptap交互时
              this._setupTagsTimeout = setTimeout(() => {
                if (!this.editor || this._isDestroyed) {
                  if (this._processingTag) {
                    this._processingTag = false; // 确保销毁时释放锁
                    console.warn("[tag] onUpdate (in timeout): Editor destroyed, LOCK RELEASED.");
                  }
                  return;
                }

                if (this._processingTag) {
                  console.log("[tag] onUpdate (in timeout): Still processing (_processingTag=true before acquiring), aborting this scheduled run.");
                  return;
                }
                
                // 获取锁
                this._processingTag = true;
                console.log("[tag] onUpdate (in timeout): LOCK ACQUIRED.");

                // 获取当前最新HTML
                const htmlAtProcessingStart = editor.getHTML();
                if (htmlAtProcessingStart !== currentHTMLSnapshot) {
                  console.warn(`[tag] onUpdate (in timeout): HTML changed between onUpdate fire and processing timeout!
                    Snapshot length: ${currentHTMLSnapshot.length}
                    ProcessingStart length: ${htmlAtProcessingStart.length}`);
                }

                // 只有在当前不是输入法输入状态时才处理标签
                if (!window.isComposing && !this._skipNextTagProcessing) {
                  console.log(`[tag] onUpdate (in timeout): Passing HTML to setupTagClickHandlers (length: ${htmlAtProcessingStart.length})`);
                  this.setupTagClickHandlers(htmlAtProcessingStart);
                } else {
                  console.log(`[tag] onUpdate (in timeout): Skipping setupTagClickHandlers due to input method state`);
                }
                
                // 处理完成后释放锁
                setTimeout(() => {
                  if (this.editor && !this._isDestroyed) {
                    const finalHTML = editor.getHTML();
                    this._lastProcessedHTML = finalHTML; 
                    console.log(`[tag] onUpdate (final quiet period timeout): _lastProcessedHTML updated. Length: ${finalHTML.length}`);
                  }
                  this._processingTag = false;
                  console.log("[tag] onUpdate (final quiet period timeout): LOCK RELEASED.");
                }, 300);
              }, 300); // 延长延迟时间，给中文输入更多时间完成
            } else {
              // 没有标签相关内容，直接更新
              this._lastProcessedHTML = currentHTMLSnapshot;
              console.log(`[tag] onUpdate: No potential tags/strong. _lastProcessedHTML updated to current clean state. Length: ${currentHTMLSnapshot.length}`);
            }

            // 触发input事件以更新外部绑定值
            if (this.value !== currentHTMLSnapshot) {
              this.$emit('input', currentHTMLSnapshot || '');
            }
          },
          autofocus: 'end', // 自动聚焦到末尾
          editorProps: {
            attributes: {
              class: 'focus-visible',
              autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false'
            },
            // 添加对输入处理的控制，避免特殊字符被解析为格式标记
            handleKeyDown: (view, event) => {
              // 让所有特殊字符如#、*等都直接显示为文本
              return false; // 返回false允许默认处理继续
            },
            // 防止粘贴时的格式化
            transformPastedText: (text) => {
              return text; // 直接返回原始文本，不做格式处理
            }
          },
          onFocus: () => {
            console.log('Portal Editor onFocus: 编辑器已获得焦点');
          },
          onCreate: ({ editor }) => {
            // --- LOG 2: Portal Editor 创建成功时 Log ---
            console.log('Portal Editor onCreate: 编辑器实例已创建并绑定到 Portal DOM.', this.editor);
            
            // 设置输入法事件监听
            if (this.portalEditorElement) {
              // 注册输入法事件
              this.portalEditorElement.addEventListener('compositionstart', this.handleCompositionStart);
              this.portalEditorElement.addEventListener('compositionupdate', this.handleCompositionUpdate);
              this.portalEditorElement.addEventListener('compositionend', this.handleCompositionEnd);
              console.log('[tag] 添加了输入法事件监听');
            }
            
            // 创建后设置标签点击处理
            // this.setupTagClickHandlers(); // Initial call removed, onUpdate will handle it
            this._editorViewMounted = true; // Editor view is now mounted and ready
            console.log('[tag] Portal Editor onCreate: _editorViewMounted = true');
             // Manually trigger an update to process initial content if any
            this.$nextTick(() => {
              if (this.editor && !this._isDestroyed) {
                console.log('[tag] Portal Editor onCreate: Forcing initial onUpdate via no-op transaction.');
                const { tr } = this.editor.state;
                this.editor.view.dispatch(tr);
              }
            });
          }
        });

        console.log('initializeEditorInPortal: Tiptap Editor 实例初始化完成并绑定到 Portal.');

        // 不再重复调用，因为setupPortalEvents中已经调用了activateEditor
    },

    // setupTagClickHandlers不再直接依赖this.editor.getHTML()，而是接收HTML作为参数
    setupTagClickHandlers(htmlFromOnUpdate) {
      if (!this.editor || !this.editor.view || !this.editor.view.dom) {
        console.warn('[tag] setupTagClickHandlers: Editor or view not available, exiting.');
        return false; // DOM not modified
      }
      
      // 如果当前正在进行输入法输入或者标记为跳过，则不处理
      if (window.isComposing || this._skipNextTagProcessing) {
        console.log(`[tag] setupTagClickHandlers: 跳过处理 (输入法=${window.isComposing}, 跳过标记=${this._skipNextTagProcessing})`);
        return false;
      }
      
      console.log(`[tag] setupTagClickHandlers: START. Passed HTML length: ${htmlFromOnUpdate.length}`);
      const initialDomSnapshot = this.editor.view.dom.innerHTML;
      
      let selectionAnchor = null;
      let selectionHead = null;
      let currentDocSize = 0;
      if (this.editor.state && this.editor.state.selection) {
        selectionAnchor = this.editor.state.selection.anchor;
        selectionHead = this.editor.state.selection.head;
        currentDocSize = this.editor.state.doc.content.size;
        console.log(`[tag] setupTagClickHandlers: Saved光标 anchor: ${selectionAnchor}, head: ${selectionHead}, Doc size: ${currentDocSize}`);
      }
      
      const tagSpans = this.editor.view.dom.querySelectorAll('span[data-tag="true"], .tag-highlight');
      const strongElements = this.editor.view.dom.querySelectorAll('strong');
      console.log(`[tag] setupTagClickHandlers: Found ${tagSpans.length} tag spans, ${strongElements.length} strong elements.`);
      
      let didModifyDOM = false;
      const domChanges = [];

      // 1. 处理 strong 元素，检查是否有包裹 tag 的 strong 元素
      strongElements.forEach(strong => {
        const strongOuterHTML = strong.outerHTML.substring(0, 100); // 只记录前100个字符以避免日志过长
        const parentNode = strong.parentNode;
        const parentOuterHTML = parentNode ? parentNode.outerHTML.substring(0, 100) : 'N/A (no parent)';
        
        console.log(`[tag] Analyzing <strong>: ${strongOuterHTML}, Parent HTML (approx): ${parentOuterHTML}`);
        
        // 检查strong是否直接包裹了一个tag span
        if (strong.childNodes.length === 1) {
          const childNode = strong.childNodes[0];
          if (childNode.nodeType === Node.ELEMENT_NODE && 
              (childNode.hasAttribute('data-tag') || childNode.classList.contains('tag-highlight'))) {
            console.log(`[tag] Strong unwrap candidate (direct wrap): ${strongOuterHTML}`);
            
            // 获取父元素，以便能插入到正确的位置
            if (parentNode) {
              domChanges.push({ 
                type: 'unwrapStrong', 
                strong: strong, 
                tagSpan: childNode, 
                parent: parentNode,
                originalHTML: strongOuterHTML 
              });
            }
          }
        }
      });

      // 2. 处理 tag span 元素
      tagSpans.forEach(span => {
        // 添加点击处理器
        if (!span.hasAttribute('data-click-handler')) {
          span.addEventListener('click', this.handleTagClick);
          span.setAttribute('data-click-handler', 'true');
        }
        
        const spanOuterHTML = span.outerHTML;
        const spanTextContent = span.textContent || '';
        console.log(`[tag] Analyzing tag span: textContent='${spanTextContent}', HTML=${spanOuterHTML}`);
        
        // 检查标签内容是否正确格式（以#开头）
        if (!spanTextContent.startsWith('#')) {
          // 如果不是以#开头，尝试从前一个节点中获取#
          const prevNode = span.previousSibling;
          if (prevNode && prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent.endsWith('#')) {
            const prevText = prevNode.textContent;
            console.log(`[tag] Found # in previous text node: '${prevText}'. Will prepend #.`);
            domChanges.push({
              type: 'prependHashToSpan',
              span: span,
              prevNode: prevNode,
              originalSpanText: spanTextContent,
              originalPrevText: prevText
            });
          } else {
            console.warn(`[tag] Tag span lacks # and no adjacent # found: '${spanTextContent}'`);
          }
        } else {
          // 如果是以#开头，检查内容是否需要分割（如果包含了不属于标签的内容）
          const tagPattern = /^(#[\w\u4e00-\u9fa5]+)(.*)/;
          const match = spanTextContent.match(tagPattern);
          
          if (match) {
            const tagPart = match[1]; // #加标签名
            const restPart = match[2]; // 剩余内容
            
            // 如果有剩余内容并且以空格开头，需要分割
            if (restPart && restPart.length > 0 && (restPart.startsWith(' ') || restPart.startsWith('\n'))) {
              console.log(`[tag] Splitting tag: '${spanTextContent}' into tag='${tagPart}' and rest='${restPart}'`);
              domChanges.push({
                type: 'splitTagContent',
                span: span,
                tagPart: tagPart,
                restPart: restPart,
                originalHTML: spanOuterHTML
              });
            }
          }
        }
      });

      // 3. 应用所有DOM变更
      if (domChanges.length > 0) {
        console.log(`[tag] Applying ${domChanges.length} DOM changes...`);
        didModifyDOM = true;
        
        // 保存当前选择范围
        const selection = window.getSelection();
        const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        
        if (savedRange) {
          console.log(`[tag] Saved selection range: startOffset=${savedRange.startOffset}, endOffset=${savedRange.endOffset}`);
        }
        
        // 执行所有DOM变更
        domChanges.forEach((change, index) => {
          console.log(`[tag] Applying change #${index+1}: ${change.type}`);
          
          try {
            switch (change.type) {
              case 'unwrapStrong':
                const parent = change.parent;
                const tagSpan = change.tagSpan;
                const strong = change.strong;
                
                // 克隆标签节点，然后在strong前插入，然后移除strong
                const clonedTagSpan = tagSpan.cloneNode(true);
                parent.insertBefore(clonedTagSpan, strong);
                parent.removeChild(strong);
                
                console.log(`[tag] Unwrapped strong element, moved tag span outside`);
                break;
                
              case 'prependHashToSpan':
                // 将#从前一个文本节点移到span内容前
                change.span.textContent = '#' + change.originalSpanText;
                if (change.prevNode.textContent.endsWith('#')) {
                  change.prevNode.textContent = change.originalPrevText.slice(0, -1);
                }
                console.log(`[tag] Prepended # to span, now: '${change.span.textContent}'`);
                break;
                
              case 'splitTagContent':
                // 将span内容限制为只包含标签部分，剩余内容作为文本节点
                change.span.textContent = change.tagPart;
                
                // 创建新文本节点包含剩余内容
                const textNode = document.createTextNode(change.restPart);
                
                // 插入到span后面
                if (change.span.nextSibling) {
                  change.span.parentNode.insertBefore(textNode, change.span.nextSibling);
                } else {
                  change.span.parentNode.appendChild(textNode);
                }
                
                console.log(`[tag] Split tag content: span now='${change.span.textContent}', added text node='${change.restPart}'`);
                break;
            }
          } catch (error) {
            console.error(`[tag] Error applying change #${index+1}:`, error);
          }
        });
        
        // 恢复选择范围
        if (savedRange) {
          try {
            selection.removeAllRanges();
            selection.addRange(savedRange);
            console.log('[tag] Restored native selection range');
          } catch (e) {
            console.error('[tag] Failed to restore selection:', e);
          }
        }
        
        // 记录DOM变更后的状态
        const finalDomSnapshot = this.editor.view.dom.innerHTML;
        console.log(`[tag] DOM after changes (preview): ${finalDomSnapshot.substring(0, 200)}...`);
        
        // 使用setTimeout确保DOM变更已完全应用
        setTimeout(() => {
          if (!this.editor || this._isDestroyed) return;
          
          try {
            // 恢复Tiptap选择状态
            if (selectionAnchor !== null && selectionHead !== null) {
              const { state, view } = this.editor;
              const newDocSize = state.doc.content.size;
              
              console.log(`[tag] Restoring cursor: anchor=${selectionAnchor}, head=${selectionHead}, newDocSize=${newDocSize}`);
              
              if (selectionAnchor <= newDocSize && selectionHead <= newDocSize) {
                view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, selectionAnchor, selectionHead)));
                console.log('[tag] Cursor restored successfully');
              } else {
                console.warn(`[tag] Cursor position out of bounds, using document end instead`);
                view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, newDocSize, newDocSize)));
              }
            }
          } catch (e) {
            console.error('[tag] Failed to restore Tiptap cursor:', e);
          }
        }, 50);
      } else {
        console.log('[tag] No DOM changes were queued.');
      }
      
      console.log(`[tag] setupTagClickHandlers: END. DOM modified: ${didModifyDOM}`);
      return didModifyDOM;
    },

    // 销毁 Editor 实例并移除 Portal DOM
    destroyEditorAndRemovePortal() {
        console.log('destroyEditorAndRemovePortal: 开始销毁 Editor 并移除 Portal...');
        
        // 清除输入法事件监听
        if (this.portalEditorElement) {
          this.portalEditorElement.removeEventListener('compositionstart', this.handleCompositionStart);
          this.portalEditorElement.removeEventListener('compositionupdate', this.handleCompositionUpdate);
          this.portalEditorElement.removeEventListener('compositionend', this.handleCompositionEnd);
          console.log('[tag] 移除了输入法事件监听');
        }
        
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
      
      // 简化编辑器点击逻辑，只保留一个事件处理
       if (editorContent) {
           this._portalEditorClickHandler = (e) => {
               e.stopPropagation();
               console.log('Portal编辑器内容区域点击...');
               if (this.editor && this.editor.commands) {
                   this.editor.commands.focus();
                    console.log('Portal编辑器点击: Tiptap focus command called.');
               }
           };
          editorContent.addEventListener('click', this._portalEditorClickHandler);
           console.log('setupPortalEvents: 添加 Portal 编辑器区域点击 监听');
       }

      // 简化模态框点击逻辑，减少重复聚焦
       if (this.portalContent) {
            this._portalContentClickHandler = (e) => {
              e.stopPropagation();
          console.log('Portal模态框内容区点击');
               if (this.editor && this.editor.commands) {
            this.editor.commands.focus('end');
                  console.log('Portal模态框点击: Tiptap focus end command called.');
               }
           };
           this.portalContent.addEventListener('click', this._portalContentClickHandler);
            console.log('setupPortalEvents: 添加 Portal 模态框内容点击 监听');
       }

      console.log('setupPortalEvents: Portal 事件监听设置完成.');

      // 调用一次聚焦尝试，通过activateEditor处理
       this.activateEditor();
    },

    // 多次尝试聚焦编辑器，现在作用于绑定到 Portal DOM 的实例
    activateEditor() {
      console.log('activateEditor: 开始激活编辑器 (精简聚焦过程)...');
      // 减少聚焦次数，只尝试一次，避免多次聚焦导致光标跳动
      const focusTime = 150; 

        setTimeout(() => {
        console.log(`activateEditor: ${focusTime}ms 后尝试聚焦... editor exists:`, !!this.editor);
          if (this.editor && this.editor.commands) {
            // 调用 Tiptap focus command
          const focusResult = this.editor.commands.focus('end');
          console.log(`activateEditor: Tiptap focus command called. 结果:`, focusResult);
          
          // 如果 Tiptap 聚焦失败，才尝试 DOM API 聚焦作为后备
          if (!focusResult) {
            this.focusEditorDOM();
          }
        } else {
          console.log(`activateEditor: Editor实例未准备好，尝试DOM API聚焦`);
          this.focusEditorDOM();
        }
      }, focusTime);
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

    handleCompositionStart(e) {
      console.log('[tag] 输入法开始输入');
      window.isComposing = true;
      this._skipNextTagProcessing = true; // 输入法开始时，跳过下一次标签处理
    },
    
    handleCompositionUpdate(e) {
      // 输入法更新（持续输入中）
      // console.log('[tag] 输入法更新中...'); // Can be too noisy
      window.isComposing = true;
    },
    
    handleCompositionEnd(e) {
      console.log('[tag] handleCompositionEnd: 输入法结束输入. Event target value:', e.target.value);
      window.isComposing = false;
      
      // Invalidate _lastProcessedHTML to ensure onUpdate re-evaluates the content
      const uniqueInvalidationString = `composition_ended_${Date.now()}`;
      console.log('[tag] handleCompositionEnd: Invalidating _lastProcessedHTML with:', uniqueInvalidationString);
      this._lastProcessedHTML = uniqueInvalidationString;
      
      // 设置延迟，使得输入法结束后完整文本已经插入DOM
      setTimeout(() => {
        this._skipNextTagProcessing = false; // 延迟一定时间后，允许标签处理
        // 触发一个空事务，确保onUpdate被调用以处理标签
        if (this.editor && !this._isDestroyed) {
          const { tr } = this.editor.state;
          this.editor.view.dispatch(tr);
        }
      }, 200);
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
   border: 3px solid white;
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
.tag-highlight, 
[data-tag="true"],
.tiptap-editor [data-tag="true"],
.tiptap-editor span[data-tag="true"] {
  color: #bb86fc !important;
  font-weight: bold !important;
  cursor: pointer !important;
  border-radius: 3px;
  transition: background-color 0.2s;
  padding: 1px 2px;
  margin: 0 -2px;
  background-color: transparent;
}

/* 鼠标悬停效果 */
.tag-highlight:hover, 
[data-tag="true"]:hover {
  background-color: rgba(187, 134, 252, 0.2) !important;
}

/* 确保tiptap内部标签被正确识别 */
.tiptap-editor span[style*="color: #bb86fc"] {
  color: #bb86fc !important;
  font-weight: bold !important;
  cursor: pointer !important;
}

/* 标签部分样式 - 只应用于实际标签文本 */
.tag-part,
.tag-part-only,
span.tag-part-only {
  color: #bb86fc !important;
  font-weight: bold !important;
  cursor: pointer !important;
  display: inline !important;
  padding: 0px 1px !important;
  border-radius: 3px !important;
  position: relative !important;
  transition: all 0.2s ease !important;
}

/* 鼠标悬停样式 */
.tag-part:hover,
.tag-part-only:hover,
span.tag-highlight.tag-part-only:hover {
  background-color: rgba(187, 134, 252, 0.2) !important;
}
</style>