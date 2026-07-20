// Grants a user the admin role and an active enrollment in every course.
//
// The user must have signed in at least once (their account is created on
// first sign-in). Safe to re-run: existing enrollments are re-activated,
// not duplicated, and paid amounts are left untouched.
//
// Usage: npm run grant:admin -- user@example.com
import { prisma } from "../lib/db";

async function main() {
  const email = process.argv[2]?.trim();

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run grant:admin -- user@example.com");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    console.error(
      `No user found for ${email}. They need to sign in once (Google or email) so their account exists, then re-run this script.`
    );
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`${user.email} already has the admin role.`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin" },
    });
    console.log(`Granted admin role to ${user.email}.`);
  }

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
  });

  let created = 0;
  let activated = 0;

  for (const course of courses) {
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          amount: 0,
          status: "Active",
        },
      });
      created += 1;
    } else if (existing.status !== "Active") {
      await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: "Active" },
      });
      activated += 1;
    }
  }

  console.log(
    `Courses: ${courses.length} total — ${created} new enrollments created, ${activated} re-activated, ${
      courses.length - created - activated
    } already active.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
