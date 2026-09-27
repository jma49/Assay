import LandingPage from "@/components/landing/LandingPage";
import { isDemoMode } from "@/lib/security/demo-sandbox";

export default function Home() {
  return <LandingPage demo={isDemoMode()} />;
}
