"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";

interface ThoughtEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Notion-style WYSIWYG markdown editor.
 *
 * Live input rules: `# ` → heading, `- ` → bullet, `**bold**` → bold, etc.
 * The underlying value is always markdown — what we serialize on save.
 */
export function ThoughtEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
}: ThoughtEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
    ],
    content: value,
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    // Required for Next.js — avoid SSR hydration mismatches.
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // tiptap-markdown attaches a `markdown` storage key with getMarkdown()
      const md = (editor.storage as { markdown?: { getMarkdown: () => string } })
        .markdown?.getMarkdown();
      if (md != null) {
        onChange(md);
      }
    },
  });

  // Toggle editability when `disabled` prop changes.
  useEffect(() => {
    if (editor && editor.isEditable === !!disabled) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return <EditorContent editor={editor} className="thought-editor" />;
}
