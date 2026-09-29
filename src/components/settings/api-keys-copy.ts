/** A personal API key as Better Auth lists it; the key itself is never listed. */
export interface KeyRow {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  lastRequest: string | Date | null;
}

export const EXPIRY_DAYS = [30, 90, 365] as const;

/** The copy of Settings → API keys. */
export const COPY = {
  en: {
    title: "API keys",
    intro: "Personal keys let agents such as Claude Code or Cursor use Assay through its MCP server. A key can do what your role can do, and no more; if your role changes, so do your keys.",
    create: "New key",
    name: "Name",
    namePlaceholder: "Claude Code on my laptop",
    expires: "Expires after",
    days: (n: number) => (n === 365 ? "1 year" : `${n} days`),
    cancel: "Cancel",
    creating: "Creating…",
    createdTitle: "Copy your key now",
    createdBody: "It is shown only once. Assay keeps a hash, not the key.",
    connect: "Connect an agent",
    claudeCode: "Claude Code",
    other: "Other MCP clients (Cursor, Windsurf, …)",
    done: "Done",
    copy: "Copy",
    copied: "Copied",
    none: "No keys yet.",
    lastUsed: (when: string) => `Last used ${when}`,
    neverUsed: "Never used",
    expiresOn: (when: string) => `Expires ${when}`,
    expired: "Expired",
    noExpiry: "No expiry",
    revoke: "Revoke",
    revokeTitle: "Revoke this key?",
    revokeBody: (name: string) => `Agents using “${name}” lose access at once.`,
    revoked: "Key revoked",
    failed: "Something went wrong",
    count: (n: number) => (n === 1 ? "1 key" : `${n} keys`),
    endpoint: "MCP endpoint",
    guest: "Sign up to create API keys.",
  },
  zh: {
    title: "API 密钥",
    intro: "个人密钥让 Claude Code、Cursor 等 AI 代理通过 MCP 服务使用 Assay。密钥的权限与你的角色相同，不会更多；角色变化时，密钥的权限也随之变化。",
    create: "新建密钥",
    name: "名称",
    namePlaceholder: "我笔记本上的 Claude Code",
    expires: "有效期",
    days: (n: number) => (n === 365 ? "1 年" : `${n} 天`),
    cancel: "取消",
    creating: "创建中…",
    createdTitle: "现在复制你的密钥",
    createdBody: "密钥只显示这一次，Assay 只保存它的哈希值。",
    connect: "连接 AI 代理",
    claudeCode: "Claude Code",
    other: "其他 MCP 客户端（Cursor、Windsurf 等）",
    done: "完成",
    copy: "复制",
    copied: "已复制",
    none: "还没有密钥。",
    lastUsed: (when: string) => `最近使用：${when}`,
    neverUsed: "尚未使用",
    expiresOn: (when: string) => `${when}过期`,
    expired: "已过期",
    noExpiry: "永不过期",
    revoke: "吊销",
    revokeTitle: "吊销这个密钥？",
    revokeBody: (name: string) => `使用「${name}」的代理会立即失去访问权限。`,
    revoked: "密钥已吊销",
    failed: "操作失败",
    count: (n: number) => `${n} 个密钥`,
    endpoint: "MCP 地址",
    guest: "注册后可以创建 API 密钥。",
  },
};
