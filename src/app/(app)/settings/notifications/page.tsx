import { Suspense } from "react";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  // useSearchParams reads the OAuth outcome; it needs a Suspense boundary.
  return (
    <Suspense>
      <NotificationSettings />
    </Suspense>
  );
}
