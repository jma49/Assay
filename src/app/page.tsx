import LandingPage from "@/components/landing/LandingPage";
import { RELEASE } from "@/components/landing/release";
import { isDemoMode } from "@/lib/security/demo-sandbox";

export default function Home() {
  return <LandingPage demo={isDemoMode()} release={RELEASE} />;
}
