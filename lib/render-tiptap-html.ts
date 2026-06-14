import { generateHTML } from "@tiptap/html";
import { type JSONContent } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";

const descriptionExtensions = [
  StarterKit,
  Image,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

export function renderDescriptionHtml(json: JSONContent) {
  return generateHTML(json, descriptionExtensions);
}
