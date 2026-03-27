'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`px-2 py-1 rounded text-sm ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({
  onChange,
  placeholder,
}: {
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-sm text-gray-900',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.isEmpty ? '' : editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <s>S</s>
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          ≡
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          1.
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          "
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHardBreak().run()} title="Line break">
          ↵
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          ↩
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          ↪
        </ToolbarButton>
      </div>
      {/* Editor area */}
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <p className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none select-none">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
