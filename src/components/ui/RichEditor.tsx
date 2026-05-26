import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const RichEditor: React.FC<RichEditorProps> = ({ content, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    immediatelyRender: false,
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-8 font-serif text-lg leading-relaxed',
      },
    },
  });

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="border-b border-slate-100 dark:border-slate-800 p-2 flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600'}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold italic ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600'}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600'}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600'}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600'}`}
        >
          List
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-600"
        >
          Undo
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-600"
        >
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
