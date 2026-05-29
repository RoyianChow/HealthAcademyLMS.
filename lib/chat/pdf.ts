import "server-only";

import { randomUUID } from "node:crypto";
import pdfParse from "pdf-parse/lib/pdf-parse";
import type { AttachedPdfContext } from "@/lib/chat/types";

const maxPdfBytes = 8 * 1024 * 1024;
const maxPdfTextCharacters = 12000;

export async function extractPdfContexts(files: File[]) {
  if (files.length > 3) {
    throw new Error("Please attach up to 3 PDFs per message.");
  }

  return Promise.all(files.map(extractPdfContext));
}

async function extractPdfContext(file: File): Promise<AttachedPdfContext> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported.");
  }

  if (file.size > maxPdfBytes) {
    throw new Error(`"${file.name}" is too large. Please keep each PDF under 8 MB.`);
  }

  const parsed = await pdfParse(Buffer.from(await file.arrayBuffer()));
  const normalizedText = normalizePdfText(parsed.text);

  if (!normalizedText) {
    throw new Error(`No readable text was found in "${file.name}".`);
  }

  return {
    id: randomUUID(),
    fileName: file.name,
    extractedText: normalizedText.slice(0, maxPdfTextCharacters),
    pageCount: parsed.numpages,
    truncated: normalizedText.length > maxPdfTextCharacters,
    sizeBytes: file.size,
    excerptPreview: normalizedText.slice(0, 180),
  };
}

function normalizePdfText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
