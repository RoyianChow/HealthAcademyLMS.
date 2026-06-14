
import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function adminGetEnrollmentStats() {
  await requireAdmin();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT DATE("createdAt") AS day, COUNT(*)::bigint AS count
    FROM "Enrollment"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY day ASC
  `;

  const countsByDay = new Map(
    rows.map((row) => [row.day.toISOString().split("T")[0], Number(row.count)])
  );

  const last30Days: { date: string; enrollments: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];

    last30Days.push({
      date: key,
      enrollments: countsByDay.get(key) ?? 0,
    });
  }

  return last30Days;
}
