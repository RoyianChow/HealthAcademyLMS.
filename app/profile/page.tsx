import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { EnrollmentStatus } from "@/src/generated/prisma";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      courses: {
        include: {
          _count: {
            select: {
              chapters: true,
              quizzes: true,
              enrollments: true,
            },
          },
        },
      },

      enrollments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          course: {
            include: {
              chapters: {
                orderBy: {
                  position: "asc",
                },
                include: {
                  lessons: {
                    orderBy: {
                      position: "asc",
                    },
                    select: {
                      id: true,
                      lessonProgress: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      quizAttempts: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          quiz: {
            include: {
              course: {
                select: {
                  title: true,
                  slug: true,
                },
              },
              chapter: {
                select: {
                  title: true,
                  position: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const activeEnrollments = user.enrollments.filter(
    (enrollment) => enrollment.status === EnrollmentStatus.Active
  );

  const enrolledCoursesWithProgress = user.enrollments.map((enrollment) => {
    const progress = getCourseProgress(enrollment.course);

    return {
      enrollment,
      ...progress,
    };
  });

  const completedCoursesCount = enrolledCoursesWithProgress.filter(
    (item) => item.progressPercentage === 100 && item.totalLessons > 0
  ).length;

  const completedQuizAttempts = user.quizAttempts.filter(
    (attempt) => attempt.isComplete
  );

  const gradedAttempts = completedQuizAttempts.filter(
    (attempt) => attempt.score !== null
  );

  const averageQuizScore =
    gradedAttempts.length > 0
      ? Math.round(
          gradedAttempts.reduce(
            (total, attempt) => total + (attempt.score ?? 0),
            0
          ) / gradedAttempts.length
        )
      : null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">My Profile</CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image ?? ""} alt={user.name ?? "User"} />
                <AvatarFallback className="text-lg">
                  {user.name?.[0]?.toUpperCase() ??
                    user.email?.[0]?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div>
                  <h2 className="text-xl font-semibold">
                    {user.name || user.email.split("@")[0] || "User"}
                  </h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified
                      ? "Email Verified"
                      : "Email Not Verified"}
                  </Badge>

                  <Badge variant="outline">{user.role ?? "student"}</Badge>

                  {user.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="secondary">Active Account</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Active Courses" value={activeEnrollments.length} />
              <Stat label="Completed Courses" value={completedCoursesCount} />
              <Stat label="Quiz Attempts" value={completedQuizAttempts.length} />
              <Stat
                label="Average Quiz Score"
                value={
                  averageQuizScore !== null ? `${averageQuizScore}%` : "N/A"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Enrolled Courses</CardTitle>
          </CardHeader>

          <CardContent>
            {enrolledCoursesWithProgress.length > 0 ? (
              <div className="space-y-3">
                {enrolledCoursesWithProgress.map(
                  ({
                    enrollment,
                    totalLessons,
                    completedLessons,
                    progressPercentage,
                  }) => (
                    <div
                      key={enrollment.id}
                      className="space-y-3 rounded-xl border p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {enrollment.course.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Enrolled on{" "}
                            {format(new Date(enrollment.createdAt), "PPP")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {enrollment.status}
                          </Badge>

                          {enrollment.status === EnrollmentStatus.Active ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/${enrollment.course.slug}`}>
                                Continue
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Course Progress
                          </span>
                          <span className="font-medium">
                            {progressPercentage}%
                          </span>
                        </div>

                        <Progress value={progressPercentage} className="h-2" />

                        <p className="text-sm text-muted-foreground">
                          {completedLessons} of {totalLessons} lessons completed
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                You are not enrolled in any courses yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiz History</CardTitle>
          </CardHeader>

          <CardContent>
            {user.quizAttempts.length > 0 ? (
              <div className="space-y-3">
                {user.quizAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {attempt.quiz.title}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {attempt.quiz.course.title}
                        {attempt.quiz.chapter
                          ? ` • Chapter ${attempt.quiz.chapter.position}: ${attempt.quiz.chapter.title}`
                          : ""}
                      </p>

                      {attempt.feedback ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Feedback: {attempt.feedback}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Badge variant="outline">
                        Attempt #{attempt.attemptNumber}
                      </Badge>

                      <Badge
                        variant={attempt.isComplete ? "default" : "secondary"}
                      >
                        {attempt.isComplete ? "Completed" : "In Progress"}
                      </Badge>

                      <Badge
                        variant={attempt.isGraded ? "default" : "secondary"}
                      >
                        {attempt.isGraded ? "Graded" : "Pending"}
                      </Badge>

                      <Badge variant="outline">
                        Score:{" "}
                        {attempt.score !== null ? `${attempt.score}%` : "N/A"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                You have not attempted any quizzes yet.
              </p>
            )}
          </CardContent>
        </Card>

        {user.role === "admin" ? (
          <Card>
            <CardHeader>
              <CardTitle>Instructor Overview</CardTitle>
            </CardHeader>

            <CardContent>
              {user.courses.length > 0 ? (
                <div className="space-y-3">
                  {user.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-4 rounded-xl border p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {course._count.chapters} chapters •{" "}
                          {course._count.quizzes} quizzes •{" "}
                          {course._count.enrollments} enrollments
                        </p>
                      </div>

                      <Badge variant="outline">{course.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  You have not created any courses yet.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function getCourseProgress(course: {
  chapters: {
    lessons: {
      lessonProgress: boolean;
    }[];
  }[];
}) {
  let totalLessons = 0;
  let completedLessons = 0;

  course.chapters.forEach((chapter) => {
    chapter.lessons.forEach((lesson) => {
      totalLessons++;

      if (lesson.lessonProgress) {
        completedLessons++;
      }
    });
  });

  const progressPercentage =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);

  return {
    totalLessons,
    completedLessons,
    progressPercentage,
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}