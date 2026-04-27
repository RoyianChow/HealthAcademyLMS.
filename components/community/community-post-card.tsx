"use client";

import {
  ReactNode,
  useMemo,
  useTransition,
  type CSSProperties,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Pin, UserCircle } from "lucide-react";
import { toggleLike } from "@/app/actions/community/toggle-like";
import { formatDistanceToNow } from "date-fns";
import { CommentForm } from "@/components/community/comment-form";
import { cn } from "@/lib/utils";

type TiptapMark = {
  type: string;
  attrs?: {
    href?: string;
    target?: string;
    rel?: string;
    color?: string;
    backgroundColor?: string;
  };
};

type TiptapNode = {
  type: string;
  text?: string;
  attrs?: {
    textAlign?: CSSProperties["textAlign"] | null;
    level?: number;
    href?: string;
    target?: string;
    src?: string;
    alt?: string;
    title?: string;
    language?: string | null;
    checked?: boolean;
    colspan?: number;
    rowspan?: number;
    colwidth?: number[] | null;
    label?: string;
    id?: string;
    color?: string;
    backgroundColor?: string;
  };
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

type CommentType = {
  id: string;
  content: string;
  createdAt?: Date | string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type PostType = {
  id: string;
  content: string;
  createdAt: Date | string;
  isPinned: boolean;
  user: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
  };
  likes: {
    userId: string;
  }[];
  comments: CommentType[];
};

function getInitials(name?: string | null) {
  if (!name) return "U";

  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isValidTextAlign(
  value: CSSProperties["textAlign"] | string | null | undefined
): value is CSSProperties["textAlign"] {
  return (
    value === "left" ||
    value === "right" ||
    value === "center" ||
    value === "justify" ||
    value === "start" ||
    value === "end"
  );
}

function isSafeUrl(url?: string) {
  if (!url) return false;

  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeColor(value?: string) {
  if (!value) return false;

  return (
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) ||
    /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(value) ||
    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/.test(
      value
    )
  );
}

function getNodeText(node: TiptapNode): string {
  if (node.text) return node.text;

  if (!node.content || node.content.length === 0) {
    return "";
  }

  return node.content.map(getNodeText).join("");
}

function applyMarks(children: ReactNode, marks?: TiptapMark[]) {
  if (!marks || marks.length === 0) {
    return children;
  }

  return marks.reduce<ReactNode>((currentChildren, mark, index) => {
    if (mark.type === "bold") {
      return <strong key={index}>{currentChildren}</strong>;
    }

    if (mark.type === "italic") {
      return <em key={index}>{currentChildren}</em>;
    }

    if (mark.type === "underline") {
      return <u key={index}>{currentChildren}</u>;
    }

    if (mark.type === "strike") {
      return <s key={index}>{currentChildren}</s>;
    }

    if (mark.type === "code") {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {currentChildren}
        </code>
      );
    }

    if (mark.type === "link") {
      const href = mark.attrs?.href;

      if (!isSafeUrl(href)) {
        return currentChildren;
      }

      return (
        <a
          key={index}
          href={href}
          target={mark.attrs?.target ?? "_blank"}
          rel="noopener noreferrer nofollow"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {currentChildren}
        </a>
      );
    }

    if (mark.type === "textStyle") {
      const color = mark.attrs?.color;

      if (!isSafeColor(color)) {
        return currentChildren;
      }

      return (
        <span key={index} style={{ color }}>
          {currentChildren}
        </span>
      );
    }

    if (mark.type === "highlight") {
      const backgroundColor = mark.attrs?.backgroundColor ?? mark.attrs?.color;

      if (!isSafeColor(backgroundColor)) {
        return (
          <mark key={index} className="rounded bg-yellow-200 px-1 text-black">
            {currentChildren}
          </mark>
        );
      }

      return (
        <mark key={index} className="rounded px-1" style={{ backgroundColor }}>
          {currentChildren}
        </mark>
      );
    }

    if (mark.type === "subscript") {
      return <sub key={index}>{currentChildren}</sub>;
    }

    if (mark.type === "superscript") {
      return <sup key={index}>{currentChildren}</sup>;
    }

    return currentChildren;
  }, children);
}

function renderChildren(node: TiptapNode, path: string) {
  return node.content?.map((child, index) =>
    renderTiptapNode(child, `${path}-${index}`)
  );
}

function renderTiptapNode(node: TiptapNode, path = "node"): ReactNode {
  const textAlign = isValidTextAlign(node.attrs?.textAlign)
    ? node.attrs?.textAlign
    : undefined;

  const children = renderChildren(node, path);

  switch (node.type) {
    case "doc":
      return <div key={path}>{children}</div>;

    case "paragraph":
      return (
        <p
          key={path}
          className="mb-3 text-sm leading-7 text-foreground last:mb-0"
          style={{ textAlign }}
        >
          {children}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level ?? 2;

      if (level === 1) {
        return (
          <h1
            key={path}
            className="mb-4 text-3xl font-bold tracking-tight text-foreground"
            style={{ textAlign }}
          >
            {children}
          </h1>
        );
      }

      if (level === 2) {
        return (
          <h2
            key={path}
            className="mb-3 text-2xl font-bold tracking-tight text-foreground"
            style={{ textAlign }}
          >
            {children}
          </h2>
        );
      }

      if (level === 3) {
        return (
          <h3
            key={path}
            className="mb-3 text-xl font-semibold tracking-tight text-foreground"
            style={{ textAlign }}
          >
            {children}
          </h3>
        );
      }

      if (level === 4) {
        return (
          <h4
            key={path}
            className="mb-2 text-lg font-semibold text-foreground"
            style={{ textAlign }}
          >
            {children}
          </h4>
        );
      }

      if (level === 5) {
        return (
          <h5
            key={path}
            className="mb-2 text-base font-semibold text-foreground"
            style={{ textAlign }}
          >
            {children}
          </h5>
        );
      }

      return (
        <h6
          key={path}
          className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground"
          style={{ textAlign }}
        >
          {children}
        </h6>
      );
    }

    case "text":
      return (
        <span key={path}>
          {applyMarks(node.text ?? "", node.marks)}
        </span>
      );

    case "hardBreak":
      return <br key={path} />;

    case "bulletList":
      return (
        <ul
          key={path}
          className="mb-3 list-disc space-y-1.5 pl-6 text-sm leading-7"
        >
          {children}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          key={path}
          className="mb-3 list-decimal space-y-1.5 pl-6 text-sm leading-7"
        >
          {children}
        </ol>
      );

    case "listItem":
      return (
        <li key={path} className="[&>p]:mb-1 [&>p]:leading-7">
          {children}
        </li>
      );

    case "taskList":
      return (
        <ul key={path} className="mb-3 space-y-2 text-sm leading-7">
          {children}
        </ul>
      );

    case "taskItem":
      return (
        <li key={path} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={Boolean(node.attrs?.checked)}
            disabled
            className="mt-1"
            readOnly
          />
          <div className="min-w-0 flex-1 [&>p]:mb-1">{children}</div>
        </li>
      );

    case "blockquote":
      return (
        <blockquote
          key={path}
          className="mb-3 border-l-4 border-primary/40 bg-muted/40 py-2 pl-4 pr-3 text-sm text-muted-foreground"
        >
          {children}
        </blockquote>
      );

    case "codeBlock": {
      const language = node.attrs?.language;
      const codeText = getNodeText(node);

      return (
        <pre
          key={path}
          className="mb-3 overflow-x-auto rounded-lg border bg-muted p-4 text-sm"
        >
          {language && (
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              {language}
            </div>
          )}
          <code className="font-mono">{codeText}</code>
        </pre>
      );
    }

    case "horizontalRule":
      return <hr key={path} className="my-5 border-border" />;

    case "image": {
      const src = node.attrs?.src;

      if (!isSafeUrl(src)) {
        return null;
      }

      return (
        <figure key={path} className="mb-4 overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={node.attrs?.alt ?? "Community post image"}
            title={node.attrs?.title}
            loading="lazy"
            className="max-h-[500px] w-full object-cover"
          />

          {node.attrs?.title && (
            <figcaption className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {node.attrs.title}
            </figcaption>
          )}
        </figure>
      );
    }

    case "table":
      return (
        <div key={path} className="mb-4 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      );

    case "tableRow":
      return <tr key={path} className="border-b last:border-b-0">{children}</tr>;

    case "tableHeader":
      return (
        <th
          key={path}
          colSpan={node.attrs?.colspan}
          rowSpan={node.attrs?.rowspan}
          className="border-r bg-muted px-3 py-2 text-left font-semibold last:border-r-0"
        >
          {children}
        </th>
      );

    case "tableCell":
      return (
        <td
          key={path}
          colSpan={node.attrs?.colspan}
          rowSpan={node.attrs?.rowspan}
          className="border-r px-3 py-2 align-top last:border-r-0"
        >
          {children}
        </td>
      );

    case "mention":
      return (
        <span
          key={path}
          className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary"
        >
          @{node.attrs?.label ?? node.attrs?.id ?? "user"}
        </span>
      );

    default:
      return <div key={path}>{children}</div>;
  }
}

function parsePostContent(content: string): TiptapNode | null {
  if (!content.trim()) return null;

  try {
    const parsed = JSON.parse(content) as TiptapNode;

    if (!parsed || typeof parsed !== "object" || !parsed.type) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function RichPostContent({ content }: { content: string }) {
  const parsedContent = useMemo(() => parsePostContent(content), [content]);

  if (parsedContent) {
    return (
      <div className="max-w-none break-words">
        {renderTiptapNode(parsedContent)}
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
      {content}
    </p>
  );
}

function UserAvatar({
  name,
  image,
}: {
  name: string | null;
  image: string | null;
}) {
  if (image && isSafeUrl(image)) {
    return (
      <div className="size-10 overflow-hidden rounded-full border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name ?? "User avatar"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex size-10 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
      {name ? getInitials(name) : <UserCircle className="size-5" />}
    </div>
  );
}

function CommentItem({ comment }: { comment: CommentType }) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
      <UserAvatar name={comment.user.name} image={comment.user.image} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{comment.user.name ?? "User"}</p>

          {comment.createdAt && (
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>

        <div className="mt-1">
          <RichPostContent content={comment.content} />
        </div>
      </div>
    </div>
  );
}

export function CommunityPostCard({
  post,
  userId,
}: {
  post: PostType;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const hasLiked = post.likes.some((like) => like.userId === userId);

  const handleLike = () => {
    startTransition(async () => {
      await toggleLike(post.id);
    });
  };

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={post.user.name} image={post.user.image} />

            <div className="min-w-0">
              <p className="truncate font-medium">{post.user.name ?? "User"}</p>

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {post.isPinned && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Pin className="size-3" />
              Pinned
            </span>
          )}
        </div>

        <div className="rounded-xl border bg-background p-4">
          <RichPostContent content={post.content} />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isPending}
            aria-pressed={hasLiked}
            className={cn(
              "flex items-center gap-2",
              hasLiked && "text-red-500 hover:text-red-600"
            )}
          >
            <Heart
              className={cn(
                "size-4",
                hasLiked && "fill-red-500 text-red-500"
              )}
            />
            <span>{post.likes.length}</span>
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="size-4" />
            <span>
              {post.comments.length}{" "}
              {post.comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          {post.comments.length > 0 && (
            <div className="space-y-3">
              {post.comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}

          <CommentForm postId={post.id} />
        </div>
      </CardContent>
    </Card>
  );
}