<template>
  <div ref="editorElement" data-testid="note-editor-input"></div>
</template>

<script>
import { Editor } from '@tiptap/vue-2';
// import StarterKit from '@tiptap/starter-kit'; // Temporarily commented out

import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';

// Imports for TagMark and CursorHighlight (which are currently commented out in extensions)
import { Mark, mergeAttributes, Extension } from '@tiptap/core';
import { Plugin, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// TagMark (definition remains, but not used in extensions for now)
const TagMark = Mark.create({
  name: 'tagmark',
  parseHTML() {
    return [
      { tag: 'span[data-tag]' },
      { tag: 'span.tag-highlight' }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 
      class: 'tag-highlight', 
      'data-tag': 'true',
      style: 'color: #bb86fc; font-weight: bold;'
    }, 0];
  },
  addInputRules() {
    return [
      {
        find: /(^|\s)(#[\w\u4e00-\u9fa5]+)(?=\s|$)/g,
        handler: ({ state, range, match }) => {
          if (window.isComposing) return null;
          try {
            const { tr } = state;
            const currentDoc = state.doc;
            const prefix = match[1];
            const tagWithHash = match[2];
            if (tagWithHash.length <= 1) return null;
            const startPosInDoc = range.from + prefix.length;
            const endPosInDoc = startPosInDoc + tagWithHash.length;
            const textInRange = currentDoc.textBetween(startPosInDoc, endPosInDoc);
            if (textInRange !== tagWithHash) return null;
            let hasExistingMark = false;
            state.doc.nodesBetween(startPosInDoc, endPosInDoc, (node, pos) => {
              if (node.marks.find(mark => mark.type.name === 'tagmark')) {
                hasExistingMark = true;
                return false; 
              }
              return true;
            });
            if (hasExistingMark) return null;
            tr.addMark(startPosInDoc, endPosInDoc, this.type.create());
            return tr;
          } catch (e) {
            console.error('[RichTextCore][tag] 处理标签出错:', e);
            return null;
          }
        }
      }
    ];
  }
});

// CursorHighlight (definition remains, but not used in extensions for now)
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
  name: 'RichTextEditorCore',
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  emits: ['input', 'initialized', 'editor-ready'],
  data() {
    return {
      editor: null,
    };
  },
  watch: {
    value(newValue) {
      if (this.editor && this.editor.getHTML() !== newValue) {
        this.editor.commands.setContent(newValue, false);
      }
    },
  },
  created() {
    if (typeof window !== 'undefined') {
        window.isComposing = false;
    }
  },
  mounted() {
    this.editor = new Editor({
      element: this.$refs.editorElement, // Tiptap 挂载点
      extensions: [
        Document,
        Paragraph,
        Text,
        // StarterKit, // 保持注释
        // TagMark, // 保持注释
        // CursorHighlight, // 保持注释
      ],
      content: this.value,
      onCreate: ({ editor }) => {
        console.log('[RichTextCore] onCreate triggered. Editor instance ready:', editor);
        this.$emit('initialized', editor);

        const editableElement = editor.view.dom; // This is the contenteditable div
        if (editableElement) {
          console.log('[RichTextCore] Attaching raw DOM event listeners to contenteditable element:', editableElement);
          editableElement.addEventListener('focus', (event) => {
            console.log(`[RichTextCore-DOMEvent] 'focus' event on contenteditable. Target:`, event.target);
          });
          editableElement.addEventListener('blur', (event) => {
            console.log(`[RichTextCore-DOMEvent] 'blur' event on contenteditable.`);
          });
          editableElement.addEventListener('input', (event) => {
            console.log(`[RichTextCore-DOMEvent] 'input' event on contenteditable. InnerHTML:`, event.target.innerHTML);
          });
          editableElement.addEventListener('keydown', (event) => {
            console.log(`[RichTextCore-DOMEvent] 'keydown' event on contenteditable. Key: ${event.key}`);
          });
        } else {
          console.warn('[RichTextCore] onCreate: editor.view.dom (contenteditable element) not found.');
        }
        this.$emit('editor-ready');
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        console.log('[RichTextCore] onUpdate triggered. Emitting HTML (length:', html.length, '):', html.substring(0, 50) + '...');
        this.$emit('input', html);
      },
    });
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  },
  methods: {
    focus() {
      console.log('[RichTextCore] focus() method called.');
      if (this.editor) {
        console.log('[RichTextCore] Attempting Tiptap focus command.');
        this.editor.commands.focus(); // 主要尝试 Tiptap 的 focus
        // 立刻检查 Tiptap 认为的焦点状态
        if (this.editor.isFocused) {
            console.log('[RichTextCore] editor.isFocused is true IMMEDIATELY after command.');
        } else {
            console.log('[RichTextCore] editor.isFocused is false IMMEDIATELY after command. Will try direct DOM focus.');
            const editableElement = this.editor.view.dom;
            if (editableElement && typeof editableElement.focus === 'function') {
                console.log('[RichTextCore] Attempting direct DOM focus on contenteditable element as fallback.');
                editableElement.focus();
            }
        }
        // 外部调用者 (NoteEditor) 将负责检查实际的 document.activeElement
      } else {
        console.warn('[RichTextCore] focus() called, but editor not available.');
      }
    },
    getText() {
      const editorInstance = this.editor;
      if (editorInstance) {
        const text = editorInstance.getText();
        const html = editorInstance.getHTML();
        const json = editorInstance.getJSON ? JSON.stringify(editorInstance.getJSON()) : 'N/A';
        const docSize = editorInstance.state?.doc?.content?.size ?? 'N/A';
        
        console.log(`[RichTextCore] getText() called. Editor found.`);
        console.log(`[RichTextCore]   - getText() result: "${text}"`);
        console.log(`[RichTextCore]   - getHTML() length: ${html.length}`);
        console.log(`[RichTextCore]   - state.doc.content.size: ${docSize}`);
        
        return text || '';
      } else {
        console.warn('[RichTextCore] getText() called, but this.editor is null or undefined.');
        return '';
      }
    },
    clearContent() {
      this.editor?.commands.setContent('', true);
    },
  }
};
</script>

<style scoped>
:deep(.cursor-line-highlight) {
  background-color: rgba(0, 0, 0, 0.05);
}
:deep(.tag-highlight) {}
:deep(.ProseMirror) {
  min-height: 100px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
:deep(.ProseMirror:focus) {
  outline: none;
  border-color: #66afe9;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}
</style> 