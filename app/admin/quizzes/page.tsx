import Link from "next/link";
import { prisma } from "@/lib/db";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default async function AdminQuizzesPage() {
  const quizzes = await prisma.quiz.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
      attempts: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Your Quizzes</h1>
          <p className="text-xl text-muted-foreground">
            Manage all your quizzes and review student quiz results
          </p>
        </div>

        <Button asChild>
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
            <Card key={quiz.id} className="transition hover:bg-muted/30">
              <CardContent className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">{quiz.title}</h2>

                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {quiz.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
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

                  <Button asChild variant="outline">
                    <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                      Edit Quiz
                    </Link>
                  </Button>
                </div>

                <div className="rounded-xl border">
                  <div className="border-b bg-muted/40 px-4 py-3">
                    <h3 className="font-medium">Student Results</h3>
                  </div>

                  {quiz.attempts.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No students have attempted this quiz yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/20 text-left">
                          <tr className="border-b">
                            <th className="px-4 py-3 font-medium">Student</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Attempt</th>
                            <th className="px-4 py-3 font-medium">Score</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Submitted</th>
                            <th className="px-4 py-3 font-medium">Graded</th>
                          </tr>
                        </thead>

                        <tbody>
                          {quiz.attempts.map((attempt) => (
                            <tr
                              key={attempt.id}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-4 py-3">
                                {attempt.user?.name || "Unknown User"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {attempt.user?.email || "No email"}
                              </td>
                              <td className="px-4 py-3">
                                #{attempt.attemptNumber}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {attempt.score ?? "Not graded"}
                              </td>
                              <td className="px-4 py-3">
                                {attempt.isComplete
                                  ? "Completed"
                                  : "In Progress"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {attempt.submittedAt
                                  ? new Date(
                                      attempt.submittedAt
                                    ).toLocaleDateString()
                                  : "Not submitted"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {attempt.isGraded ? "Graded" : "Pending"}
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
    </div>
  );
}