"use client";

import { useMemo } from "react";
import { generateHTML } from "@tiptap/html";
import { type JSONContent } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import parse from "html-react-parser";

export function RenderDescription({ json }: { json: JSONContent }) {
  const output = useMemo(() => {
    return generateHTML(json, [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ]);
  }, [json]);

  return (
  <div className="prose max-w-none w-full dark:prose-invert prose-li:marker:text-primary">
    <div className="overflow-x-auto w-full">
      {parse(output)}
    </div>
  </div>
);
}
