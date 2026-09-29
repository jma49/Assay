import Link from "next/link";
import { APP_CONTAINER } from "@/components/layout/app-container";

/** The one quiet "nothing here" page for a check or run id that does not exist. */
export function NotFoundState({ title, backHref, backLabel }: { title: string; backHref: string; backLabel: string }) {
  return (
    <div className={`${APP_CONTAINER} py-16 text-center`}>
      <p className="text-body-md font-medium">{title}</p>
      <Link href={backHref} className="mt-3 inline-block text-body-sm font-medium text-primary hover:underline">
        {backLabel}
      </Link>
    </div>
  );
}
