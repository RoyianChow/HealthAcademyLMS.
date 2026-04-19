type LessonDocument = {
  id: string;
  name: string;
  fileKey: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

type LessonFormValues = {
  title: string;
  description?: string;
  youtubeUrl?: string;
  videoKey?: string;
  thumbnailKey?: string;
  documents: LessonDocument[];
};

const ACCEPTED_DOCUMENT_TYPES = [
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