import UserHeader from "@/components/layout/UserHeader";
import { Toaster } from "@/components/ui/sonner";

/** Signed-in pages share one header, so it stays mounted while navigating. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <UserHeader />
      {children}
      <Toaster />
    </div>
  );
}
