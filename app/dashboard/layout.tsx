import { ReactNode } from "react";
import { SidebarShellLayout } from "@/components/sidebar/sidebar-shell-layout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SidebarShellLayout>{children}</SidebarShellLayout>;
}
