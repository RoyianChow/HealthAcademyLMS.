import { QuizForm } from "../_components/QuizForm";
import { prisma } from "../../../../lib/db";

export default async function CreateQuizPage() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
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
          Create a new quiz and connect it to one of your courses.
        </p>
      </div>

      <QuizForm
        mode="create"
        initialData={{
          id: "",
          title: "",
          description: "",
          courseId: "",
          courses, // ✅ THIS FIXES YOUR DROPDOWN
        }}
      />
    </div>
  );
}