import { AppPageSkeleton } from "@/components/common/PageSkeletons";

/** Shown immediately while a signed-in page loads, instead of a blank screen. */
export default function Loading() {
  return <AppPageSkeleton />;
}
