import { redirect } from "next/navigation";
import { FIRST_DOCS_SLUG } from "@/lib/docs/nav";

export default function DocsIndex() {
  redirect(`/docs/${FIRST_DOCS_SLUG}`);
}
