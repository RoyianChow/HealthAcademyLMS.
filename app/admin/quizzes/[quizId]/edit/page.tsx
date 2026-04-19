import { notFound } from "next/navigation";
import { QuizForm } from "../../_components/QuizForm";
import { adminGetQuiz } from "@/app/data/admin/admin-get-quiz";

type PageProps = {
  params: Promise<{
    quizId: string;
  }>;
};

export default async function EditQuizPage({ params }: PageProps) {
  const { quizId } = await params;
  const quiz = await adminGetQuiz(quizId);

  if (!quiz) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Quiz</h1>
        <p className="text-muted-foreground">
          Update your quiz details and course connection.
        </p>
      </div>

      <QuizForm
        mode="edit"
        initialData={quiz}
      />
    </div>
  );
}