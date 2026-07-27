import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarTrigger } from "@/components/app-sidebar-trigger";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import { SessionExpiredAlert } from "@/components/session-expired-alert";
import { HomePageTypeProvider } from "@/components/home-page-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HomePageTypeProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background dark:bg-black">
          <AppSidebar />
          <div className="relative flex flex-1 flex-col">
            <AppSidebarTrigger />
            <main className="flex flex-1 flex-col overflow-auto">
              <div className="flex-1">{children}</div>
              <Footer />
            </main>
          </div>
          <Toaster />
          <SessionExpiredAlert />
        </div>
      </SidebarProvider>
    </HomePageTypeProvider>
  );
}
