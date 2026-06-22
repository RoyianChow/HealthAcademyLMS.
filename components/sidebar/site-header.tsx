import { Leaf, Sparkles } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "../ui/themeToggle";
import { AiAdvisorTrigger } from "@/components/chat/ai-advisor";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] shrink-0 items-center border-b border-border/70 bg-background/80 backdrop-blur-xl transition-[width,height] ease-linear supports-[backdrop-filter]:bg-background/70 group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 rounded-xl border border-border/70 bg-card shadow-sm transition hover:bg-muted hover:shadow-md" />

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-5 bg-border/80 sm:block"
        />

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden size-9 items-center justify-center rounded-2xl bg-[#5f7f2e]/10 text-[#5f7f2e] ring-1 ring-[#5f7f2e]/15 sm:flex">
            <Leaf className="size-4" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Health Academy
            </h1>
            <p className="hidden text-xs text-muted-foreground md:block">
              Learn nutrition, wellness, and natural health with confidence
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[#5f7f2e]/20 bg-[#5f7f2e]/10 px-3 py-1.5 text-xs font-medium text-[#5f7f2e] lg:flex">
            <Sparkles className="size-3.5" />
            AI Wellness Support
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-card/80 p-1 shadow-sm">
            <ThemeToggle />
            <AiAdvisorTrigger />
          </div>
        </div>
      </div>
    </header>
  );
}