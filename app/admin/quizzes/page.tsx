import Link from "next/link";
import { adminGetQuizList } from "@/app/data/admin/admin-get-quiz-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DeleteQuizAttemptButton } from "./_components/DeleteQuizAttemptButton";
import { DeleteQuizButton } from "./_components/DeleteQuizButton";
import { SidebarStateWrapper } from "@/components/chat/sidebar-state-wrapper";

export default async function AdminQuizzesPage() {
  const quizzes = await adminGetQuizList();

  return (
    <SidebarStateWrapper className="min-h-[calc(100vh-8rem)] space-y-6">
      {/* Restored to original layout structure so size and position remain unchanged */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Administrate Quizzes</h1>
          <p className="text-xl text-muted-foreground">
            Manage all your quizzes and review student quiz results
          </p>
        </div>

        <Button asChild className="shrink-0">
          <Link href="/admin/quizzes/create">
            Create Quiz
            <Plus className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No quizzes found. Create your first quiz 🚀
            </CardContent>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <Card key={quiz.id} className="transition hover:bg-muted/30 overflow-hidden">
              <CardContent className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold truncate">{quiz.title}</h2>

                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground shrink-0">
                        {quiz.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {quiz.description || "No description"}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Course: {quiz.course?.title ?? "Not linked"}</span>
                      <span>
                        Chapter:{" "}
                        {quiz.chapter
                          ? `${quiz.chapter.position}. ${quiz.chapter.title}`
                          : "Not linked"}
                      </span>
                      <span>Questions: {quiz._count.questions}</span>
                      <span>Total Attempts: {quiz._count.attempts}</span>
                      <span>
                        Created: {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                        Edit Quiz
                      </Link>
                    </Button>

                    <DeleteQuizButton quizId={quiz.id} />
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <div className="border-b bg-muted/40 px-4 py-3">
                    <h3 className="font-medium">Student Results</h3>
                  </div>

                  {quiz.attempts.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No students have attempted this quiz yet.
                    </div>
                  ) : (
                    /* Removed overflow-x-auto and min-w constraints to prevent scroll bars */
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
                          {quiz.attempts.map((attempt) => (
                            <tr
                              key={attempt.id}
                              className="border-b last:border-b-0 hover:bg-muted/10 transition-colors"
                            >
                              {/* Strict max-widths with clean truncation to adapt smoothly */}
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
                                {attempt.score !== null
                                  ? `${attempt.score}%`
                                  : "Not graded"}
                              </td>

                              <td className="px-2 py-3 whitespace-nowrap">
                                {attempt.isComplete
                                  ? "Completed"
                                  : "In Progress"}
                              </td>

                              <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                                {attempt.submittedAt
                                  ? new Date(
                                      attempt.submittedAt
                                    ).toLocaleDateString()
                                  : "Not submitted"}
                              </td>

                              <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                                {attempt.isGraded ? "Graded" : "Pending"}
                              </td>

                              <td className="px-2 py-3 text-right pr-4">
                                <DeleteQuizAttemptButton
                                  attemptId={attempt.id}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </SidebarStateWrapper>
  );
}
