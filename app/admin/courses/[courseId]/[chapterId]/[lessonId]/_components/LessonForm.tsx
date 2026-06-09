"use client";

import type { AdminLessonType } from "@/app/data/admin/admin-get-lesson";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  lessonSchema,
  type LessonSchemaType,
  type LessonDocumentSchemaType,
} from "@/lib/zodSchemas";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Uploader } from "@/components/file-uploader/Uploader";
import { useTransition, useState } from "react";
import { tryCatch } from "@/hooks/try-catch";
import { updateLesson } from "../actions";
import { toast } from "sonner";
import { LessonDocumentsUploader } from "./LessonDocumentsUploader";
import { Switch } from "@/components/ui/switch";

type LessonFormProps = {
  data: AdminLessonType;
  chapterId: string;
  courseId: string;
};

function VideoItem({
  index,
  form,
  remove,
}: {
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  remove: (index: number) => void;
}) {

  const [isYoutube, setIsYoutube] = useState(() => {
    const initialYoutubeUrl = form.getValues(`videos.${index}.youtubeUrl`);
    return !!initialYoutubeUrl;
  });

  return (
    <div className="relative space-y-4 rounded-md border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-foreground">Video #{index + 1}</span>
          
          {/* Toggle Switch Component */}
          <div className="flex items-center space-x-2 bg-background px-3 py-1.5 rounded-full border shadow-sm select-none">
            <span className={`text-xs font-semibold ${!isYoutube ? "text-primary" : "text-muted-foreground"}`}>
              Native Upload
            </span>
            <Switch
              checked={isYoutube}
              onCheckedChange={(checked) => {
                setIsYoutube(checked);
                // Clear out the opposite field completely to preserve database data integrity
                if (checked) {
                  form.setValue(`videos.${index}.videoKey`, "");
                } else {
                  form.setValue(`videos.${index}.youtubeUrl`, "");
                }
              }}
            />
            <span className={`text-xs font-semibold ${isYoutube ? "text-primary" : "text-muted-foreground"}`}>
              YouTube Link
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => remove(index)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <FormField
        control={form.control}
        name={`videos.${index}.title`}
        render={({ field: inputField }) => (
          <FormItem>
            <FormLabel>Video Title (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Introduction" {...inputField} value={inputField.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Conditional Content Rendering */}
      {!isYoutube ? (
        <FormField
          control={form.control}
          name={`videos.${index}.videoKey`}
          render={({ field: inputField }) => (
            <FormItem>
              <FormLabel>Video File Upload</FormLabel>
              <FormControl>
                <Uploader
                  fileTypeAccepted="video"
                  value={inputField.value ?? ""}
                  onChange={inputField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name={`videos.${index}.youtubeUrl`}
          render={({ field: inputField }) => (
            <FormItem>
              <FormLabel>YouTube URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  {...inputField}
                  value={inputField.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

export function LessonForm({ data, chapterId, courseId }: LessonFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<LessonSchemaType>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: data.title ?? "",
      courseId,
      chapterId,
      description: data.description ?? "",
      content: data.content ?? "",
      thumbnailKey: data.thumbnailKey ?? "",
      isPublished: data.isPublished ?? false,
      isFreePreview: data.isFreePreview ?? false,
      interactiveScript: data.interactiveScript ?? "",
      documents: data.documents ?? [],
      videos: data.videos?.map((video) => ({
        id: video.id,
        title: video.title ?? "",
        videoKey: video.videoKey ?? "",
        youtubeUrl: video.youtubeUrl ?? "",
      })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  const isPublished = form.watch("isPublished");

  function onSubmit(values: LessonSchemaType) {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        updateLesson(values, data.id)
      );

      if (error) {
        toast.error("An unexpected error occurred. Please try again.");
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div>
      <Link
        className={buttonVariants({ variant: "outline", className: "mb-6" })}
        href={`/admin/courses/${courseId}/edit`}
      >
        <ArrowLeft className="size-4" />
        <span>Go Back</span>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Configuration</CardTitle>
          <CardDescription>
            Configure this lesson&apos;s content, media, documents, and
            publishing settings.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Lesson title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <RichTextEditor field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Content</FormLabel>
                    <FormControl>
                      <RichTextEditor field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thumbnailKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail Image</FormLabel>
                    <FormControl>
                      <Uploader
                        fileTypeAccepted="image"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base font-semibold">Lesson Videos</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ title: "", videoKey: "", youtubeUrl: "" })}
                  >
                    <Plus className="mr-2 size-4" /> Add Video
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No videos added yet.</p>
                )}

                {fields.map((field, index) => (
                  <VideoItem 
                    key={field.id} 
                    index={index} 
                    form={form} 
                    remove={remove} 
                  />
                ))}
              </div>

              <FormField
                control={form.control}
                name="documents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Documents</FormLabel>
                    <FormControl>
                      <LessonDocumentsUploader
                        value={(field.value ?? []) as LessonDocumentSchemaType[]}
                        onChange={(value: LessonDocumentSchemaType[]) =>
                          field.onChange(value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interactive Activity Section */}
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <FormLabel className="text-base font-semibold">Interactive Activity</FormLabel>
                    <p className="text-xs text-muted-foreground">Paste custom embed code or scripts for interactive elements.</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="interactiveScript"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="<script>...</script> or <iframe>...</iframe> or any embeddable code"
                          className="min-h-[200px] font-mono text-xs bg-background"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel>Published</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow enrolled students to access this lesson.
                        </p>
                      </div>

                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              form.setValue("isFreePreview", false);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFreePreview"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel>Free Preview</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Let users preview this lesson before enrolling.
                        </p>
                      </div>

                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          disabled={!isPublished}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Lesson"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
