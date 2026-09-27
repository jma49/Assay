import type { ReactNode } from "react";
import { DocsShell } from "@/components/docs/DocsShell";
import { buildDocsSearchIndex } from "@/lib/docs/content";

export const metadata = { title: { default: "Docs", template: "%s · Assay Docs" } };

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const index = await buildDocsSearchIndex();
  return <DocsShell index={index}>{children}</DocsShell>;
}
