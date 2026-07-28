"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Form,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { NavUser } from "./nav-user";

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
  const { data: session } = useSession();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
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
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key={"DarkMode"}>
                <div className="flex items-center gap-2 p-2">
                  <Switch
                    id="dark-mode"
                    checked={mounted && resolvedTheme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                  <Label
                    htmlFor="dark-mode"
                    className="group-data-[collapsible=icon]:hidden"
                  >
                    Dark Mode
                  </Label>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: session?.user?.name || "User",
            email: session?.user?.email || "user@example.com",
            avatar: session?.user?.image || "/default-avatar.svg",
          }}
          onSignOut={handleLogOutClick}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
