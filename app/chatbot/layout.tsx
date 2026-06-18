import { ReactNode } from "react";

export default function ChatbotLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden">{children}</div>;
}
