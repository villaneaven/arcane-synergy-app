import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Footer from "@/components/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background dark:bg-black">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <SidebarTrigger />
          {children}
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
