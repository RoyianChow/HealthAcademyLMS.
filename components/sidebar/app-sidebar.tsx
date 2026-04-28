"use client";

import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconGlobe,
  IconListDetails,
  IconMessage,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

import Logo from "@/public/logo.png";
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

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Admin Dashboard",
    url: "/admin",
    icon: IconDashboard,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: IconUser,
  },
  
  {
    title: "Courses",
    url: "/admin/courses",
    icon: IconListDetails,
  },
  {
    title: "Admin Quizzes",
    url: "/admin/quizzes",
    icon: IconChartBar,
  },
  {
    title: "Quizzes",
    url: "/quizzes",
    icon: IconChartBar,
  },
  {
    title: "Community",
    url: "/dashboard/community",
    icon: IconGlobe,
  },
  {
    title: "Admin Community",
    url: "/admin/community",
    icon: IconGlobe,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                  alt="Healthy Academy LMS logo"
                  className="size-5"
                  priority
                />
                <span className="text-base font-semibold">
                  Healthy Academy LMS
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