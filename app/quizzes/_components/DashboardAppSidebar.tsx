"use client";

import * as React from "react";
import {
  IconDashboard,
  IconHelp,
  IconSearch,
  IconSettings,
  IconChecklist,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

import Logo from "@/public/logo.png";
import { authClient } from "@/lib/auth-client";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Quizzes",
      url: "/quizzes",
      icon: IconChecklist,
    },
    ...(session?.user?.role === "admin"
      ? [
          {
            title: "Admin Dashboard",
            url: "/admin",
            icon: IconDashboard,
          },
          {
            title: "Admin Quizzes",
            url: "/admin/quizzes",
            icon: IconChecklist,
          },
        ]
      : []),
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image src={Logo} alt="Logo" className="size-5" />
                <span className="text-base font-semibold">
                  Healthy Academy LMS.
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}