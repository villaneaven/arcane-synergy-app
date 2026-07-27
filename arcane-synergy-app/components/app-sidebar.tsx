"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Form,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HOME_PAGE_TYPES,
  HOME_PAGE_TYPE_LABELS,
  useHomePageType,
} from "@/components/home-page-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ACTIVE_ITEM_CLASS =
  "data-[active=true]:bg-blue-600/20! data-[active=true]:text-white! data-[active=true]:hover:bg-blue-700/40! data-[active=true]:text-blue-500!";

const handleLogOutClick = async () => {
  try {
    signOut();
  } catch (error) {
    console.error(error);
  }
};

export function AppSidebar() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const {
    collapsibleOpen,
    setCollapsibleOpen,
    state,
    isMobile,
    open,
    openMobile,
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isOpen = isMobile ? openMobile : open;
  const { homePageType, setHomePageType } = useHomePageType();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex w-full items-center justify-between p-2">
          <Link href="/" className="flex items-center">
            {isCollapsed ? (
              <Image
                src="/logo-icon.png"
                alt="Arcane Synergy logo"
                width={708}
                height={376}
                className="h-10 w-auto shrink-0 object-contain"
              />
            ) : (
              <>
                <Image
                  src="/logo.png"
                  alt="Arcane Synergy logo"
                  width={2712}
                  height={704}
                  className="h-10 w-auto shrink-0 dark:hidden"
                />
                <Image
                  src="/logo-dark.png"
                  alt="Arcane Synergy logo"
                  width={2712}
                  height={704}
                  className="hidden h-10 w-auto shrink-0 dark:block"
                />
              </>
            )}
          </Link>
          {isOpen && <SidebarTrigger className="bg-black-20" />}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key={"Dashboard"}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/"}
                  className={ACTIVE_ITEM_CLASS}
                >
                  <Link href={"/"}>
                    <LayoutDashboard />
                    <span>{"Dashboard"}</span>
                  </Link>
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
                    <SidebarMenuButton
                      isActive={pathname.startsWith("/forms")}
                      className={ACTIVE_ITEM_CLASS}
                    >
                      <Form />
                      <span>{"Forms"}</span>
                      {collapsibleOpen ? (
                        <ChevronUp className="group-data-[collapsible=icon]:hidden" />
                      ) : (
                        <ChevronDown className="group-data-[collapsible=icon]:hidden" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="py-1">
                      <SidebarMenuSubItem key={`Patients`}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/forms/patients"}
                          className={ACTIVE_ITEM_CLASS}
                        >
                          <Link href={`/forms/patients`}>
                            <span>{`Patients`}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem key={`Admissions`}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/forms/admissions"}
                          className={ACTIVE_ITEM_CLASS}
                        >
                          <Link href={`/forms/admissions`}>
                            <span>{`Admissions`}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              <SidebarMenuItem key={"Reports"}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/reports")}
                  className={ACTIVE_ITEM_CLASS}
                >
                  <Link href={"/reports"}>
                    <ClipboardCheck />
                    <span>{"Reports"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="group-data-[collapsible=icon]:order-2"
                >
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="group-data-[collapsible=icon]:order-1"
                >
                  <User />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DropdownMenuItem>Default page</DropdownMenuItem>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                      value={homePageType}
                      onValueChange={(value) =>
                        setHomePageType(value as typeof homePageType)
                      }
                    >
                      {HOME_PAGE_TYPES.map((type) => (
                        <DropdownMenuRadioItem key={type} value={type}>
                          {HOME_PAGE_TYPE_LABELS[type]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenuItem
                  onClick={handleLogOutClick}
                  className="text-destructive"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
