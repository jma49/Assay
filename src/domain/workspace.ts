/**
 * Every team's data lives in a workspace. There is one workspace until
 * multi-tenancy ships; documents written before workspaces existed have no
 * workspaceId and belong to it.
 */
export const DEFAULT_WORKSPACE_ID = "default";
