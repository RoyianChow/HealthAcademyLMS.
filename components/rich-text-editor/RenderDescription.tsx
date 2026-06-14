import { type JSONContent } from "@tiptap/react";
import { renderDescriptionHtml } from "@/lib/render-tiptap-html";

export function RenderDescription({ json }: { json: JSONContent }) {
  const html = renderDescriptionHtml(json);

  return (
    <div className="prose max-w-none w-full dark:prose-invert prose-li:marker:text-primary prose-img:rounded-md prose-img:mx-auto">
      <div
        className="overflow-x-auto w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
