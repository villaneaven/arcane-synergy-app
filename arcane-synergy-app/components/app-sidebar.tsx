"use client";

import * as React from "react"
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
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"


export function AppSidebar() {
  const [isOpen, setIsOpen] = React.useState(false)

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
                className="group/collapsible"
                open={isOpen}
                onOpenChange={setIsOpen}
              >
                <SidebarMenuItem key={"Forms"}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="cursor-pointer">
                      <Form />
                      <span>{"Forms"}</span>
                      {isOpen ? <ChevronUp /> : <ChevronDown />}
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