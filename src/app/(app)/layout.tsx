import UserHeader from "@/components/layout/UserHeader";
import { AppWindow } from "@/components/layout/AppWindow";
import { Toaster } from "@/components/ui/sonner";

/** Signed-in pages share one header and one window, so both stay mounted while navigating. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <UserHeader />
      <AppWindow>{children}</AppWindow>
      <Toaster />
    </div>
  );
}
