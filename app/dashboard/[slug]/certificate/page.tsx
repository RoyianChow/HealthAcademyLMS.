import { getCertificatePageData } from "@/app/data/course/get-certificate-page-data";
import { CertificateView } from "./_components/CertificateView";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CertificatePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getCertificatePageData(slug);

  return (
    <main className="min-h-screen bg-muted/30">
      <CertificateView data={data} />
    </main>
  );
}
