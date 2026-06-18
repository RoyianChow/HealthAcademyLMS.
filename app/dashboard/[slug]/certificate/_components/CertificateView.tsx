"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CertificatePageData } from "@/app/data/course/get-certificate-page-data";

type CertificateViewProps = {
  data: CertificatePageData;
};

export function CertificateView({ data }: CertificateViewProps) {
  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(data.completionDate));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline">
          <Link href={`/dashboard/${data.slug}`}>Back to course</Link>
        </Button>
        <Button type="button" onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>

      <div
        id="certificate"
        className="rounded-3xl border-4 border-[#7a9442] bg-[#fbfbf8] p-10 text-center shadow-sm print:border-4 print:shadow-none"
      >
        <div className="mx-auto mb-8 flex max-w-md flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Health Academy logo"
            width={96}
            height={96}
            className="rounded-full"
          />
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#7a9442]">
            Health Academy
          </p>
        </div>

        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Certificate of Completion
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#232742] md:text-4xl">
          {data.courseTitle}
        </h1>

        <p className="mt-8 text-base text-muted-foreground">
          This certifies that
        </p>

        <p className="mt-3 text-4xl font-semibold text-[#232742]">
          {data.studentName}
        </p>

        <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-muted-foreground">
          has successfully completed all required lessons in this course and
          demonstrated commitment to evidence-based holistic health education.
        </p>

        <div className="mt-10 grid gap-6 border-t border-[#e5e7df] pt-8 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Instructor
            </p>
            <p className="mt-2 text-lg font-medium text-[#232742]">
              {data.instructorName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Date completed
            </p>
            <p className="mt-2 text-lg font-medium text-[#232742]">
              {formattedDate}
            </p>
          </div>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Natural Health Academy by Happy Nutrition LTD
        </p>
      </div>
    </div>
  );
}
