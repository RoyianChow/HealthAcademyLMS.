import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      accounts: true,
      courses: true,
      enrollment: {
        include: {
          Course: true,
        },
      },
      lessonProgress: {
        include: {
          Lesson: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const coursesCreatedCount = user.courses.length;
  const totalEnrollmentsCount = user.enrollment.length;
  const activeEnrollmentsCount = user.enrollment.filter(
    (enrollment) => enrollment.status === "Active"
  ).length;
  const pendingEnrollmentsCount = user.enrollment.filter(
    (enrollment) => enrollment.status === "Pending"
  ).length;
  const cancelledEnrollmentsCount = user.enrollment.filter(
    (enrollment) => enrollment.status === "Cancelled"
  ).length;

  const totalLessonProgressCount = user.lessonProgress.length;
  const completedLessonsCount = user.lessonProgress.filter(
    (progress) => progress.completed
  ).length;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
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
                    {user.emailVerified ? "Email Verified" : "Email Not Verified"}
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-muted-foreground text-sm">Full Name</p>
                <p className="font-medium">{user.name}</p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-muted-foreground text-sm">Email Address</p>
                <p className="font-medium break-all">{user.email}</p>
              </div>    

              <div className="rounded-xl border p-4">
                <p className="text-muted-foreground text-sm">Role</p>
                <p className="font-medium capitalize">
                  {user.role ?? "student"}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-muted-foreground text-sm">Stripe Customer ID</p>
                <p className="font-medium break-all">
                  {user.stripeCustomerId ?? "Not connected"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Learning Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Total Enrollments
                  </p>
                  <p className="text-2xl font-semibold">
                    {totalEnrollmentsCount}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Active Enrollments
                  </p>
                  <p className="text-2xl font-semibold">
                    {activeEnrollmentsCount}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Pending Enrollments
                  </p>
                  <p className="text-2xl font-semibold">
                    {pendingEnrollmentsCount}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Cancelled Enrollments
                  </p>
                  <p className="text-2xl font-semibold">
                    {cancelledEnrollmentsCount}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Lesson Progress Records
                  </p>
                  <p className="text-2xl font-semibold">
                    {totalLessonProgressCount}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Completed Lessons
                  </p>
                  <p className="text-2xl font-semibold">
                    {completedLessonsCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Creator Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Courses Created
                  </p>
                  <p className="text-2xl font-semibold">
                    {coursesCreatedCount}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground text-sm">
                    Connected Providers
                  </p>
                  {user.accounts.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.accounts.map((account) => (
                        <Badge key={account.id} variant="outline">
                          {account.providerId}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium">No connected providers</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Enrolled Courses</CardTitle>
            </CardHeader>
            <CardContent>
              {user.enrollment.length > 0 ? (
                <div className="space-y-3">
                  {user.enrollment.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {enrollment.Course.title}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Enrolled on{" "}
                          {format(new Date(enrollment.createdAt), "PPP")}
                        </p>
                      </div>

                      <Badge variant="secondary">{enrollment.status}</Badge>
                    </div>
                  ))}
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
              <CardTitle>My Created Courses</CardTitle>
            </CardHeader>
            <CardContent>
              {user.courses.length > 0 ? (
                <div className="space-y-3">
                  {user.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{course.title}</p>
                        <p className="text-muted-foreground text-sm">
                          Created on {format(new Date(course.createdAt), "PPP")}
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
        </div>
      </div>
    </div>
  );
}