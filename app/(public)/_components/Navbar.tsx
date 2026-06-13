"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

import Logo from "@/public/logo.png";
import { ThemeToggle } from "@/components/ui/themeToggle";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserDropdown } from "./UserDropdown";

const navigationItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Courses", href: "/courses" },
  { name: "Corporate Wellness", href: "/corporate-wellness" },
  { name: "Contact Us", href: "/contact" },
  { name: "Dashboard", href: "/dashboard" },
];

export function Navbar() {
  const { data: session, isPending } = authClient.useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex min-h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <Image src={Logo} alt="Health Academy logo" className="size-9" />
          <span className="font-bold">Health Academy</span>
        </Link>

        <nav className="hidden md:flex md:flex-1 md:items-center md:justify-between md:pl-8">
          <div className="flex items-center space-x-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />

            {isPending ? null : session ? (
              <UserDropdown
                email={session.user.email}
                image={
                  session?.user.image ??
                  `https://avatar.vercel.sh/${session?.user.email}`
                }
                name={
                  session?.user.name && session.user.name.length > 0
                    ? session.user.name
                    : session?.user.email.split("@")[0]
                }
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Login
                </Link>
                <Link href="/login" className={buttonVariants()}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,20rem)]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-3 border-t p-4">
                {isPending ? null : session ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.user.name || session.user.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    <UserDropdown
                      email={session.user.email}
                      image={
                        session?.user.image ??
                        `https://avatar.vercel.sh/${session?.user.email}`
                      }
                      name={
                        session?.user.name && session.user.name.length > 0
                          ? session.user.name
                          : session?.user.email.split("@")[0]
                      }
                    />
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className={buttonVariants({ variant: "secondary" })}
                    >
                      Login
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className={buttonVariants()}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
