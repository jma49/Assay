// Old page URLs, most from before the checks/runs vocabulary (#102). They stay
// reachable through permanent redirects so bookmarks and links in past alerts
// keep working. Next.js carries the query string over on its own.

/** @type {{ source: string; destination: string; permanent: true }[]} */
export const LEGACY_PAGE_REDIRECTS = [
  { source: "/dashboard", destination: "/runs", permanent: true },
  { source: "/view-execution-result/:runId", destination: "/runs/:runId", permanent: true },
  { source: "/scripts/new", destination: "/checks/new", permanent: true },
  { source: "/manage-scripts", destination: "/checks/manage", permanent: true },
  { source: "/manage-scripts/edit-history", destination: "/checks/manage/history", permanent: true },
  { source: "/manage-scripts/approvals", destination: "/approvals", permanent: true },
  { source: "/docs/menu-bar-and-dock", destination: "/docs/navigation", permanent: true },
];
