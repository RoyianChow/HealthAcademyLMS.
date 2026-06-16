/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Menubar } from "./Menubar";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import { parseEditorContent } from "@/lib/tiptap-content";
import type { UploadScope } from "@/lib/upload-scope";

export function RichTextEditor({
  field,
  uploadScope,
}: {
  field: any;
  uploadScope?: UploadScope;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],

    editorProps: {
      attributes: {
        class:
          "min-h-[300px] p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert !w-full !max-w-none prose-table:border-collapse prose-td:border prose-th:border prose-th:bg-muted prose-img:rounded-md prose-img:mx-auto",
      },
    },

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      field.onChange(JSON.stringify(editor.getJSON()));
    },

    content: parseEditorContent(field.value),
  });

  return (
    <div className="w-full border border-input rounded-lg overflow-hidden dark:bg-input/30">
      <Menubar editor={editor} uploadScope={uploadScope} />
      <EditorContent editor={editor} />
    </div>
  );
}
