import { apiErrorCode } from "./send-json";

type Language = "en" | "zh";

/**
 * What the UI shows for an API error, by its stable `code`. Servers answer
 * in English; codes listed here are shown in the reader's language, others
 * fall back to the server's message.
 */
const TEXT: Record<string, Record<Language, string>> & { internal: Record<Language, string> } = {
  unauthorized: { en: "Sign in to continue.", zh: "请先登录。" },
  email_not_allowed: { en: "Only invited users may use this workspace.", zh: "只允许受邀用户使用。" },
  forbidden: { en: "You do not have permission to do this.", zh: "没有权限执行此操作。" },
  internal: { en: "Something went wrong. Try again.", zh: "出错了，请重试。" },
  invalid_input: { en: "Some fields are missing or invalid.", zh: "有字段缺失或无效。" },
  invalid_json: { en: "The request was not valid JSON.", zh: "请求格式无效。" },
  rate_limited: { en: "Too many requests; try again in a minute.", zh: "请求过于频繁，请稍后再试。" },

  already_running: { en: "This check is already running. Its result will appear in the run history.", zh: "这个检查正在执行，结果会出现在执行记录中。" },
  demo_samples_only: { en: "In the demo, viewers can run the sample checks only.", zh: "演示模式下只能执行示例检查。" },
  demo_busy: { en: "The demo is busy; try again shortly.", zh: "演示环境繁忙，请稍后再试。" },
  demo_limit_reached: { en: "Demo limit reached for this hour.", zh: "本小时的演示执行次数已用完。" },
  no_checks: { en: "There are no checks to run.", zh: "没有可执行的检查。" },

  ai_disabled: { en: "AI features are turned off on this server.", zh: "此服务器未开启 AI 功能。" },
  input_too_long: { en: "The input is too long for AI.", zh: "输入过长，无法交给 AI。" },
  ai_rate_limited: { en: "Too many AI requests this hour; try again later.", zh: "AI 请求过于频繁，请稍后再试。" },
  ai_busy: { en: "The AI service is busy; try again shortly.", zh: "AI 服务繁忙，请稍后重试。" },
  ai_not_configured: { en: "The AI service is not set up. Ask an admin.", zh: "AI 服务未配置或无权访问，请联系管理员。" },
  ai_quota: { en: "The AI service is out of credits. Ask an admin.", zh: "AI 服务额度不足，请联系管理员。" },
  ai_unavailable: { en: "The AI service is unavailable; try again shortly.", zh: "AI 服务暂时不可用，请稍后重试。" },
  sign_up_required: { en: "Sign up to run AI triage.", zh: "注册后才能使用 AI 分诊。" },
  nothing_to_triage: { en: "This run passed; there is nothing to triage.", zh: "这次执行通过了，没有需要分诊的问题。" },

  conflict: { en: "Someone else changed this check. Reload to see their changes.", zh: "这个检查已被其他人修改，请刷新后查看。" },
  version_required: { en: "Reload the check and save again.", zh: "请刷新检查后重新保存。" },
  id_taken: { en: "A check with this ID already exists.", zh: "这个 ID 已被使用。" },
  unsafe_sql: { en: "Only read-only queries can be saved.", zh: "只能保存只读查询。" },
  role_unknown: { en: "Your role could not be read. Try again.", zh: "无法读取你的角色，请重试。" },

  request_not_found: { en: "This request no longer exists.", zh: "这条申请不存在。" },
  already_decided: { en: "Someone else already handled this request.", zh: "这条申请已被其他人处理。" },
  own_request: { en: "You cannot approve your own request.", zh: "不能审批自己提交的申请。" },
  comment_required: { en: "Give a reason for rejecting.", zh: "拒绝时必须填写理由。" },
  apply_failed: { en: "Approved, but the change could not be applied. See the approval history.", zh: "审批已通过，但应用变更失败，请查看审批记录。" },

  user_not_found: { en: "That person has not signed in yet. Ask them to sign in once.", zh: "目标用户不存在：请先让对方登录一次。" },
  role_not_allowed: { en: "Your role cannot assign or change this role.", zh: "你的角色无法分配或修改这个角色。" },
  own_role: { en: "You cannot change or remove your own role.", zh: "不能修改或删除自己的角色。" },
  last_admin: { en: "Keep at least one admin.", zh: "至少需要保留一名管理员。" },

  url_wrong_service: { en: "This is not a webhook URL for the chosen service.", zh: "这不是所选服务的 Webhook 地址。" },
  url_not_https: { en: "Webhook URLs must use https.", zh: "Webhook 地址必须使用 https。" },
  url_has_credentials: { en: "Put credentials in a header on your side, not in the URL.", zh: "不要把凭据放在 URL 里，请放在接收方的请求头中。" },
  url_missing_key: { en: "The WeCom webhook URL needs its key.", zh: "企业微信 Webhook 地址缺少 key 参数。" },
  url_not_public: { en: "The webhook host must be a public address.", zh: "Webhook 主机必须是公网地址。" },
  url_not_a_webhook: { en: "This service is connected through its app, not a URL.", zh: "这个服务通过应用连接，不使用 URL。" },
  not_configured: { en: "This is not set up on the server.", zh: "服务器尚未配置此功能。" },
  nothing_to_acknowledge: { en: "This check has no open problem.", zh: "这个检查没有待处理的问题。" },
  stale: { en: "The check changed; reload and try again.", zh: "检查已变化，请刷新后重试。" },

  unknown_data_source: { en: "That data source no longer exists. Pick another one.", zh: "这个数据源已不存在，请选择其他数据源。" },
  invalid_connection_string: { en: "Use the URL form: postgres://user:password@host:5432/database", zh: "请使用 URL 格式：postgres://user:password@host:5432/database" },
  unsupported_parameter: { en: "The connection string has a parameter Assay does not accept.", zh: "连接串中含有不支持的参数。" },
  host_not_public: { en: "The host is on a private network. Self-hosted deployments can allow it with ALLOW_PRIVATE_DATA_SOURCES=true.", zh: "该主机位于内网。自托管部署可设置 ALLOW_PRIVATE_DATA_SOURCES=true 允许。" },
  host_not_found: { en: "The host could not be found. Check the connection string.", zh: "找不到该主机，请检查连接串。" },
  tls_required: { en: "Use TLS for a public host: sslmode=require or verify-full.", zh: "公网主机必须使用 TLS：sslmode=require 或 verify-full。" },
  source_id_taken: { en: "A data source with this ID already exists.", zh: "这个数据源 ID 已被使用。" },
  source_id_reserved: { en: "This ID is reserved; pick another.", zh: "这个 ID 已被保留，请换一个。" },
  source_in_use: { en: "Checks still use this data source. Move them to another source first.", zh: "仍有检查在使用这个数据源，请先把它们改到其他数据源。" },
  built_in_source: { en: "The built-in source comes from DATABASE_URL; change it in the environment.", zh: "内置数据源来自 DATABASE_URL，请在环境变量中修改。" },
};

/** The localized text for an error code, or undefined when the code has none. */
export function apiErrorCodeText(code: string | null | undefined, language: Language): string | undefined {
  return code ? TEXT[code]?.[language] : undefined;
}

/**
 * What to show for a failed call: the localized text for the error's code,
 * else the error's own message, else `fallback`.
 */
export function apiErrorText(error: unknown, language: Language, fallback?: string): string {
  const known = apiErrorCodeText(apiErrorCode(error), language);
  if (known) return known;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message || fallback || TEXT.internal[language];
}
