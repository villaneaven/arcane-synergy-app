"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebarTrigger() {
  const { isMobile, open, openMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  if (isOpen) {
    return null;
  }

  return (
    <SidebarTrigger
      className={cn(
        "absolute top-5.5 z-20 bg-black/20",
        isMobile ? "left-2" : "left-0 -translate-x-1/2",
      )}
    />
  );
}
