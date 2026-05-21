import { ReactNode } from "react";
import { Navbar } from "@/app/(public)/_components/Navbar";
import { Footer } from "@/app/(public)/_components/Footer";

export default function LayoutPublic({ children }: { children: ReactNode }) {
  return (
    <div>
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 mb-32">
        {children}
      </main>
      <Footer />
    </div>
  );
}
