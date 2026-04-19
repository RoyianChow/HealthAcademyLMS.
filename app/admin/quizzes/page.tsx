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
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Your Quizzes</h1>
          <p className="text-muted-foreground text-xl">
            Manage all your quizzes and connect them to courses
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/quizzes/create">
            Create Quiz
            <Plus className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      {/* Quiz List */}
      <div className="grid gap-4">
        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No quizzes found. Create your first quiz 🚀
            </CardContent>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/admin/quizzes/${quiz.id}/edit`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">
                      {quiz.title}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      {quiz.description || "No description"}
                    </p>

                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>
                        Course: {quiz.course?.title ?? "Not linked"}
                      </span>

                      <span>
                        Questions: {quiz._count.questions}
                      </span>

                      <span>
                        {quiz.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}