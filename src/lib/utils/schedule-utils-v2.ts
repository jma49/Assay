/**
 * 简化版定时任务工具函数
 * 避免复杂的 cron-parser 导入问题
 */

/**
 * 预设的定时选项配置 (简化版本 - 不依赖外部库)
 */
export interface ScheduleOption {
  label: string;
  labelCn: string;
  value: string;
  cronExpression: string;
  description: string;
  descriptionCn: string;
}

export const PRESET_SCHEDULES: ScheduleOption[] = [
  {
    label: "Every 5 minutes",
    labelCn: "每5分钟",
    value: "every_5min",
    cronExpression: "*/5 * * * *",
    description: "Execute every 5 minutes",
    descriptionCn: "每5分钟执行一次",
  },
  {
    label: "Every 15 minutes",
    labelCn: "每15分钟",
    value: "every_15min",
    cronExpression: "*/15 * * * *",
    description: "Execute every 15 minutes",
    descriptionCn: "每15分钟执行一次",
  },
  {
    label: "Every 30 minutes",
    labelCn: "每30分钟",
    value: "every_30min",
    cronExpression: "*/30 * * * *",
    description: "Execute every 30 minutes",
    descriptionCn: "每30分钟执行一次",
  },
  {
    label: "Every hour",
    labelCn: "每小时",
    value: "hourly",
    cronExpression: "0 * * * *",
    description: "Execute every hour",
    descriptionCn: "每小时执行一次",
  },
  {
    label: "Daily 03:00 Chicago",
    labelCn: "每天 03:00 (芝加哥)",
    value: "daily_03_chicago",
    cronExpression: "0 8 * * *",
    description: "Execute daily at 3:00 AM Chicago time",
    descriptionCn: "每天芝加哥凌晨3点执行",
  },
  {
    label: "Weekdays 03:00 Chicago",
    labelCn: "工作日 03:00 (芝加哥)",
    value: "weekdays_03_chicago",
    cronExpression: "0 8 * * 1-5",
    description: "Execute on weekdays at 3:00 AM Chicago time",
    descriptionCn: "周一到周五芝加哥凌晨3点执行",
  },
  {
    label: "Weekly Monday 03:00 Chicago",
    labelCn: "每周一 03:00 (芝加哥)",
    value: "weekly_mon_03_chicago",
    cronExpression: "0 8 * * 1",
    description: "Execute every Monday at 3:00 AM Chicago time",
    descriptionCn: "每周一芝加哥凌晨3点执行",
  },
  {
    label: "Monthly 1st 03:00 Chicago",
    labelCn: "每月1号 03:00 (芝加哥)",
    value: "monthly_01_03_chicago",
    cronExpression: "0 8 1 * *",
    description: "Execute on the 1st of every month at 3:00 AM Chicago time",
    descriptionCn: "每月1号芝加哥凌晨3点执行",
  },
  {
    label: "Custom...",
    labelCn: "自定义...",
    value: "custom",
    cronExpression: "",
    description: "Enter custom cron expression",
    descriptionCn: "输入自定义cron表达式",
  },
];

/**
 * 检查给定的cron表达式是否应该在当前时间执行
 * @param cronSchedule cron表达式
 * @param toleranceMinutes 容错时间（分钟），默认30分钟
 * @returns 是否应该执行
 */
export function shouldExecuteNow(
  cronSchedule: string,
  toleranceMinutes: number = 30
): boolean {
  if (!cronSchedule || cronSchedule.trim() === "") {
    return false;
  }

  try {
    return matchesCronExpression(cronSchedule, new Date(), toleranceMinutes);
  } catch (error) {
    console.error("Invalid cron expression:", cronSchedule, error);
    return false;
  }
}

/**
 * 简化的cron表达式匹配逻辑
 * @param cronExpression cron表达式
 * @param date 要检查的时间
 * @param toleranceMinutes 容错时间（分钟）
 * @returns 是否匹配
 */
function matchesCronExpression(
  cronExpression: string,
  date: Date,
  toleranceMinutes: number = 30
): boolean {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, day, month, dayOfWeek] = parts;
  const now = new Date(date);

  // 检查容错范围内的时间
  for (let i = -toleranceMinutes; i <= toleranceMinutes; i++) {
    const checkTime = new Date(now.getTime() + i * 60 * 1000);
    if (matchesExactTime(minute, hour, day, month, dayOfWeek, checkTime)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查具体时间是否匹配cron表达式
 */
function matchesExactTime(
  minute: string,
  hour: string,
  day: string,
  month: string,
  dayOfWeek: string,
  date: Date
): boolean {
  const currentMinute = date.getUTCMinutes();
  const currentHour = date.getUTCHours();
  const currentDay = date.getUTCDate();
  const currentMonth = date.getUTCMonth() + 1; // getMonth() returns 0-11
  const currentDayOfWeek = date.getUTCDay(); // 0 = Sunday

  return (
    matchesField(minute, currentMinute, 0, 59) &&
    matchesField(hour, currentHour, 0, 23) &&
    matchesField(day, currentDay, 1, 31) &&
    matchesField(month, currentMonth, 1, 12) &&
    matchesField(dayOfWeek, currentDayOfWeek, 0, 6)
  );
}

/**
 * 检查单个cron字段是否匹配
 */
function matchesField(
  pattern: string,
  value: number,
  _min: number,
  _max: number
): boolean {
  if (pattern === "*") {
    return true;
  }

  // 处理步长表达式 (e.g., */5)
  if (pattern.startsWith("*/")) {
    const step = parseInt(pattern.substring(2), 10);
    return value % step === 0;
  }

  // 处理范围表达式 (e.g., 1-5)
  if (pattern.includes("-")) {
    const [start, end] = pattern.split("-").map(Number);
    return value >= start && value <= end;
  }

  // 处理列表表达式 (e.g., 1,3,5)
  if (pattern.includes(",")) {
    const values = pattern.split(",").map(Number);
    return values.includes(value);
  }

  // 处理单个值
  const numValue = parseInt(pattern, 10);
  return value === numValue;
}

/**
 * 获取cron表达式的人类可读描述
 * @param cronSchedule cron表达式
 * @param language 语言
 * @returns 人类可读的描述
 */
export function getCronDescription(
  cronSchedule: string,
  language: "en" | "zh" = "en"
): string {
  if (!cronSchedule || cronSchedule.trim() === "") {
    return language === "zh" ? "未设置" : "Not set";
  }

  // 先检查是否是预设选项
  const preset = PRESET_SCHEDULES.find(
    (option) => option.cronExpression === cronSchedule
  );
  if (preset) {
    return language === "zh" ? preset.descriptionCn : preset.description;
  }

  // 简单的cron表达式解析
  const parts = cronSchedule.split(" ");
  if (parts.length !== 5) {
    return language === "zh" ? "自定义表达式" : "Custom expression";
  }

  const [minute, hour, day, month, dayOfWeek] = parts;

  // 处理常见模式
  if (minute.startsWith("*/")) {
    const interval = minute.substring(2);
    return language === "zh"
      ? `每${interval}分钟执行`
      : `Every ${interval} minutes`;
  }

  if (
    minute === "0" &&
    hour !== "*" &&
    day === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    return language === "zh" ? `每天 ${hour}:00` : `Daily at ${hour}:00`;
  }

  if (
    minute === "0" &&
    hour !== "*" &&
    day === "*" &&
    month === "*" &&
    dayOfWeek !== "*"
  ) {
    const dayNames =
      language === "zh"
        ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
        : [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];

    if (dayOfWeek.includes("-")) {
      const [start, end] = dayOfWeek.split("-").map(Number);
      return language === "zh"
        ? `${dayNames[start]}-${dayNames[end]} ${hour}:00`
        : `${dayNames[start]}-${dayNames[end]} at ${hour}:00`;
    } else {
      const dayName = dayNames[parseInt(dayOfWeek)];
      return language === "zh"
        ? `每${dayName} ${hour}:00`
        : `Every ${dayName} at ${hour}:00`;
    }
  }

  return language === "zh" ? "自定义表达式" : "Custom expression";
}

/**
 * 验证cron表达式是否有效
 * @param cronSchedule cron表达式
 * @returns 验证结果
 */
export function validateCronExpression(cronSchedule: string): {
  valid: boolean;
  error?: string;
} {
  if (!cronSchedule || cronSchedule.trim() === "") {
    return { valid: false, error: "Cron expression is required" };
  }

  // 基本格式验证
  const cronPattern =
    /^(\*|(\d+(-\d+)?)(,\d+(-\d+)?)*|\*\/\d+)\s+(\*|(\d+(-\d+)?)(,\d+(-\d+)?)*|\*\/\d+)\s+(\*|(\d+(-\d+)?)(,\d+(-\d+)?)*|\*\/\d+)\s+(\*|(\d+(-\d+)?)(,\d+(-\d+)?)*|\*\/\d+)\s+(\*|(\d+(-\d+)?)(,\d+(-\d+)?)*|\*\/\d+)$/;

  if (!cronPattern.test(cronSchedule)) {
    return {
      valid: false,
      error: "Invalid cron expression format",
    };
  }

  const parts = cronSchedule.split(" ");
  if (parts.length !== 5) {
    return {
      valid: false,
      error: "Cron expression must have exactly 5 fields",
    };
  }

  const [minute, hour, day, month, dayOfWeek] = parts;

  // 验证各个字段的范围
  if (!isValidField(minute, 0, 59)) {
    return { valid: false, error: "Invalid minute field (0-59)" };
  }
  if (!isValidField(hour, 0, 23)) {
    return { valid: false, error: "Invalid hour field (0-23)" };
  }
  if (!isValidField(day, 1, 31)) {
    return { valid: false, error: "Invalid day field (1-31)" };
  }
  if (!isValidField(month, 1, 12)) {
    return { valid: false, error: "Invalid month field (1-12)" };
  }
  if (!isValidField(dayOfWeek, 0, 6)) {
    return { valid: false, error: "Invalid day of week field (0-6)" };
  }

  return { valid: true };
}

/**
 * 验证单个cron字段是否在有效范围内
 */
function isValidField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;

  if (field.startsWith("*/")) {
    const step = parseInt(field.substring(2), 10);
    return !isNaN(step) && step > 0 && step <= max;
  }

  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return (
      !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end
    );
  }

  if (field.includes(",")) {
    const values = field.split(",").map(Number);
    return values.every((val) => !isNaN(val) && val >= min && val <= max);
  }

  const numValue = parseInt(field, 10);
  return !isNaN(numValue) && numValue >= min && numValue <= max;
}

/**
 * 根据预设选项的value获取对应的cron表达式
 * @param presetValue 预设选项的value
 * @returns cron表达式，'none'返回空字符串，找不到返回空字符串
 */
export function getPresetCronExpression(presetValue: string): string {
  if (presetValue === "none") {
    return "";
  }

  const preset = PRESET_SCHEDULES.find(
    (option) => option.value === presetValue
  );
  return preset ? preset.cronExpression : "";
}

/**
 * 根据cron表达式获取对应的预设选项value
 * @param cronExpression cron表达式
 * @returns 预设选项的value，空字符串返回'none'，不是预设选项返回'custom'
 */
export function getPresetValueFromCron(cronExpression: string): string {
  if (!cronExpression || cronExpression.trim() === "") {
    return "none";
  }

  const preset = PRESET_SCHEDULES.find(
    (option) => option.cronExpression === cronExpression
  );
  return preset ? preset.value : "custom";
}

/**
 * 获取下次执行时间的近似值（简化实现）
 * @param cronSchedule cron表达式
 * @returns 下次执行时间，如果表达式无效返回null
 */
export function getNextExecutionTime(cronSchedule: string): Date | null {
  if (!cronSchedule || cronSchedule.trim() === "") {
    return null;
  }

  const validation = validateCronExpression(cronSchedule);
  if (!validation.valid) {
    return null;
  }

  // 简化实现：在接下来的24小时内查找下次匹配时间
  const now = new Date();
  for (let i = 1; i <= 24 * 60; i++) {
    const checkTime = new Date(now.getTime() + i * 60 * 1000);
    if (matchesCronExpression(cronSchedule, checkTime, 0)) {
      return checkTime;
    }
  }

  return null;
}

/**
 * 格式化显示下次执行时间
 * @param nextExecutionTime 下次执行时间
 * @param language 语言
 * @returns 格式化的时间字符串
 */
export function formatNextExecutionTime(
  nextExecutionTime: Date | null,
  language: "en" | "zh" = "en"
): string {
  if (!nextExecutionTime) {
    return language === "zh" ? "未设置" : "Not scheduled";
  }

  const now = new Date();
  const diff = nextExecutionTime.getTime() - now.getTime();
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const timeStr = nextExecutionTime.toLocaleString(
    language === "zh" ? "zh-CN" : "en-US",
    {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );

  if (diffDays > 1) {
    return language === "zh"
      ? `${timeStr} (${diffDays}天后)`
      : `${timeStr} (in ${diffDays} days)`;
  } else if (diffHours > 1) {
    return language === "zh"
      ? `${timeStr} (${diffHours}小时后)`
      : `${timeStr} (in ${diffHours} hours)`;
  } else if (diffMinutes > 1) {
    return language === "zh"
      ? `${timeStr} (${diffMinutes}分钟后)`
      : `${timeStr} (in ${diffMinutes} minutes)`;
  } else {
    return language === "zh" ? `${timeStr} (即将执行)` : `${timeStr} (soon)`;
  }
}
