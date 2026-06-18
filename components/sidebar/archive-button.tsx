"use client";

import { IconSwitchHorizontal } from "@tabler/icons-react";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ArchiveButton() {
  const pathname = usePathname();
  const isActive = pathname === "/admin/database";

  return (
    <SidebarMenuItem className="flex items-center gap-2">
      <SidebarMenuButton
        asChild
        tooltip="Database Controls"
        className={cn(
          "w-full bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground font-medium min-w-8 duration-200 ease-linear",
          isActive && "ring-2 ring-ring ring-offset-1"
        )}
      >
        <Link href="/admin/database">
          <IconSwitchHorizontal />
          <span>Archive Services</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
