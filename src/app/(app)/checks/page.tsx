import { Suspense } from "react";
import { ChecksList } from "@/components/checks/ChecksList";

export const metadata = { title: "Checks" };

// The open check lives in the query (`?check=`), which needs a Suspense boundary.
export default function ChecksPage() {
  return (
    <Suspense>
      <ChecksList />
    </Suspense>
  );
}
