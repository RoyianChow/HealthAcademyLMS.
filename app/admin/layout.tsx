import { ReactNode } from "react";
import { SidebarShellLayout } from "@/components/sidebar/sidebar-shell-layout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <SidebarShellLayout>{children}</SidebarShellLayout>;
}
