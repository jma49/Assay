import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";

/** Signed-in pages share one shell, so it stays mounted while navigating. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster />
    </>
  );
}
