import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";

export const tiptapExtensions = [
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
];

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** Parse stored course/lesson description — Tiptap JSON string or legacy HTML. */
export function parseDescriptionJson(value: string | null | undefined): JSONContent {
  if (!value?.trim()) return EMPTY_DOC;

  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as JSONContent;
    } catch {
      // fall through — treat as HTML
    }
  }

  try {
    return generateJSON(trimmed, tiptapExtensions);
  } catch {
    return EMPTY_DOC;
  }
}

/** Initial content for RichTextEditor — accepts JSON string or HTML. */
export function parseEditorContent(
  value: string | null | undefined
): JSONContent | string {
  if (!value?.trim()) return "<p></p>";

  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as JSONContent;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/** Convert HTML (or pass-through JSON) to the string format stored in the DB. */
export function htmlToTiptapJsonString(html: string | null | undefined): string {
  if (!html?.trim()) return JSON.stringify(EMPTY_DOC);

  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // not valid JSON — convert as HTML
    }
  }

  return JSON.stringify(generateJSON(trimmed, tiptapExtensions));
}
