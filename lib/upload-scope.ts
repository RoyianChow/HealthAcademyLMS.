export type AssetKind =
  | "course-thumbnail"
  | "course-image"
  | "lesson-thumbnail"
  | "lesson-video"
  | "lesson-document"
  | "lesson-image"
  | "community-image"
  | "draft-thumbnail";

export type UploadScope = {
  assetKind: AssetKind;
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
};
