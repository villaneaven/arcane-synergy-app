"use client";

import { LayoutDashboard, Form, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"


export function AppSidebar() {
  const { collapsibleOpen, setCollapsibleOpen } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key={"Dashboard"}>
                <SidebarMenuButton asChild>
                  <a href={"/"}>
                    <LayoutDashboard />
                    <span>{"Dashboard"}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible 
                defaultOpen
                className="group/collapsible"
                open={collapsibleOpen}
                onOpenChange={setCollapsibleOpen}
              >
                <SidebarMenuItem key={"Forms"}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="cursor-pointer">
                      <Form />
                      <span>{"Forms"}</span>
                      {collapsibleOpen ? <ChevronUp /> : <ChevronDown />}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {[1, 2, 3].map((formNumber) => (
                        <SidebarMenuSubItem
                          key={`Form ${formNumber}`}
                        >
                          <a href={`/forms/${formNumber}`} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50">
                            <span>{`Form ${formNumber}`}</span>
                          </a>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <SidebarMenuItem key={"Reports"}>
                  <SidebarMenuButton asChild>
                    <a href={"/reports"}>
                      <ClipboardCheck />
                      <span>{"Reports"}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}