import { QuizForm } from "../_components/QuizForm";
import { prisma } from "../../../../lib/db";

export default async function CreateQuizPage() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      chapters: {
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Quiz</h1>
        <p className="text-muted-foreground">
          Create a new quiz and connect it to one of your course chapters.
        </p>
      </div>

      <QuizForm
        mode="create"
        initialData={{
          id: "",
          title: "",
          description: "",
          courseId: "",
          chapterId: "",
          courses,
          isPublished: false,
          passingScore: null,
          timeLimitMinutes: null,
          allowMultipleAttempts: false,
          questions: [],
        }}
      />
    </div>
  );
}