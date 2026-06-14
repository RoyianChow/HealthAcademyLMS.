// fix-migrated-tiptap-content.ts
// Converts WordPress HTML in course.description and lesson.content to Tiptap JSON strings.
// Run once after migration: npx tsx --env-file=.env fix-migrated-tiptap-content.ts

import { prisma } from "./lib/db";
import { htmlToTiptapJsonString } from "./lib/tiptap-content";

function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      JSON.parse(trimmed);
      return false;
    } catch {
      return true;
    }
  }
  return trimmed.startsWith("<");
}

async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, description: true },
  });

  let coursesFixed = 0;
  for (const course of courses) {
    if (!looksLikeHtml(course.description)) continue;
    await prisma.course.update({
      where: { id: course.id },
      data: { description: htmlToTiptapJsonString(course.description) },
    });
    coursesFixed++;
    console.log(`Fixed course description: ${course.title}`);
  }

  const lessons = await prisma.lesson.findMany({
    where: { content: { not: null } },
    select: { id: true, title: true, content: true },
  });

  let lessonsFixed = 0;
  for (const lesson of lessons) {
    if (!lesson.content || !looksLikeHtml(lesson.content)) continue;
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { content: htmlToTiptapJsonString(lesson.content) },
    });
    lessonsFixed++;
    console.log(`Fixed lesson content: ${lesson.title}`);
  }

  console.log(`\nDone. Fixed ${coursesFixed} courses, ${lessonsFixed} lessons.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
