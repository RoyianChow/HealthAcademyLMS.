export type LessonDocument = {
  id: string;
  name: string;
  fileKey: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

export type LessonFormValues = {
  title: string;
  description?: string | null;
  youtubeUrl?: string | null;
  videoKey?: string | null;
  thumbnailKey?: string | null;
  documents: LessonDocument[];
};

export const ACCEPTED_DOCUMENT_TYPES: string[] = [
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];