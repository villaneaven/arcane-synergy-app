import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import { SessionExpiredAlert } from "@/components/session-expired-alert";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background dark:bg-black">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-auto">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
        <Toaster />
        <SessionExpiredAlert />
      </div>
    </SidebarProvider>
  );
}
