import { adminGetQuizAttempts } from "@/app/data/admin/admin-get-quiz-attempts";
import { DeleteQuizAttemptButton } from "./DeleteQuizAttemptButton";

export async function QuizAttemptsTable({ quizId }: { quizId: string }) {
  const attempts = await adminGetQuizAttempts(quizId);

  if (attempts.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        No students have attempted this quiz yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-xs md:text-sm table-auto">
        <thead className="bg-muted/20 text-left">
          <tr className="border-b">
            <th className="px-2 py-3 font-medium">Student</th>
            <th className="px-2 py-3 font-medium">Email</th>
            <th className="px-2 py-3 font-medium">Attempt</th>
            <th className="px-2 py-3 font-medium">Score</th>
            <th className="px-2 py-3 font-medium">Status</th>
            <th className="px-2 py-3 font-medium">Submitted</th>
            <th className="px-2 py-3 font-medium">Graded</th>
            <th className="px-2 py-3 font-medium text-right pr-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {attempts.map((attempt) => (
            <tr
              key={attempt.id}
              className="border-b last:border-b-0 hover:bg-muted/10 transition-colors"
            >
              <td className="px-2 py-3 truncate max-w-[100px] md:max-w-[150px]">
                {attempt.user?.name || "Unknown User"}
              </td>

              <td className="px-2 py-3 text-muted-foreground truncate max-w-[120px] md:max-w-[180px]">
                {attempt.user?.email || "No email"}
              </td>

              <td className="px-2 py-3 whitespace-nowrap">
                #{attempt.attemptNumber}
              </td>

              <td className="px-2 py-3 font-medium whitespace-nowrap">
                {attempt.score !== null ? `${attempt.score}%` : "Not graded"}
              </td>

              <td className="px-2 py-3 whitespace-nowrap">
                {attempt.isComplete ? "Completed" : "In Progress"}
              </td>

              <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleDateString()
                  : "Not submitted"}
              </td>

              <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                {attempt.isGraded ? "Graded" : "Pending"}
              </td>

              <td className="px-2 py-3 text-right pr-4">
                <DeleteQuizAttemptButton attemptId={attempt.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
