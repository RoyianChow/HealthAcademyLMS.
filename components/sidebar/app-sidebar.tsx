"use client";

import * as React from "react";
import {
  IconChecklist,
  IconDashboard,
  IconGlobe,
  IconListDetails,
  IconRobot,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

import Logo from "@/public/logo.png";
import { authClient } from "@/lib/auth-client";
import { NavMain } from "@/components/sidebar/nav-main";
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
      isChild: true,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: IconUser,
      isChild: true,
    },
    {
      title: "Community",
      url: "/dashboard/community",
      icon: IconGlobe,
      isChild: true,
    },
    {
      title: "AI Advisor",
      url: "/chatbot",
      icon: IconRobot,
      isChild: true,
    },
    ...(session?.user?.role === "admin"
      ? [
          {
            title: "Admin Dashboard",
            url: "/admin",
            icon: IconDashboard,
          },
          {
            title: "Admin Courses",
            url: "/admin/courses",
            icon: IconListDetails,
            isChild: true,
          },
          {
            title: "Admin Quizzes",
            url: "/admin/quizzes",
            icon: IconChecklist,
            isChild: true,
          },
          {
            title: "Admin Community",
            url: "/admin/community",
            icon: IconGlobe,
            isChild: true,
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
                <Image
                  src={Logo}
                  alt="Health Academy logo"
                  className="size-5"
                  priority
                />
                <span className="text-base font-semibold">
                  Health Academy
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
