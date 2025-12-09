"use client";

import { LayoutDashboard, Form, ClipboardCheck, ChevronDown, ChevronUp, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  const { setTheme } = useTheme()
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
      <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}