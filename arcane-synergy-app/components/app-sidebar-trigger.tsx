"use client";

import { Kbd } from "@/components/ui/kbd";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppSidebarTrigger() {
  const { isMobile, open, openMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  if (isOpen) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarTrigger
          className={cn(
            "absolute top-5.5 z-20 bg-black/20",
            isMobile ? "left-2" : "left-0 -translate-x-1/2",
          )}
        />
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="bg-foreground/70"
        showArrow={false}
      >
        <div className="flex flex-col items-center gap-1">
          <span>Toggle sidebar</span>
          <span className="flex items-center gap-2">
            <Kbd>Ctrl</Kbd> + <Kbd>B</Kbd>
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
