import UserHeader from "@/components/layout/UserHeader";
import { AppWindow } from "@/components/layout/AppWindow";
import { Dock } from "@/components/layout/Dock";
import { AppWindowStateProvider } from "@/components/layout/app-window-state";
import { Toaster } from "@/components/ui/sonner";

/** Signed-in pages share one menu bar, window and Dock, so they stay mounted while navigating. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppWindowStateProvider>
      <div className="min-h-screen">
        <UserHeader />
        <AppWindow>{children}</AppWindow>
        <Dock />
        <Toaster />
      </div>
    </AppWindowStateProvider>
  );
}
