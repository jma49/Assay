import { CheckDetailView } from "@/components/checks/CheckDetailView";

export const metadata = { title: "Check" };

export default async function CheckPage({ params }: { params: Promise<{ scriptId: string }> }) {
  const { scriptId } = await params;
  return <CheckDetailView scriptId={decodeURIComponent(scriptId)} />;
}
