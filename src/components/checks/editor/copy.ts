const en = {
  line: "line",
  lines: "lines",
  format: "Format",
  formatting: "Formatting...",
  edit: "Edit",
  preview: "Preview",
  noCode: "No code content...",
  noCodeToFormat: "No code to format",
  placeholder: "-- Enter your SQL query here\n-- Example: SELECT * FROM users WHERE active = true;",
  // Theme settings dialog
  themeSettings: "Theme settings",
  editorThemeSettings: "Editor theme settings",
  appliesImmediately: "Settings apply immediately",
  lightMode: "Light mode",
  darkMode: "Dark mode",
  editorTheme: "Editor theme",
  lightTheme: "Light theme",
  darkTheme: "Dark theme",
  themeHelpLight: "Light themes are available in light mode, switch to dark mode to view dark themes",
  themeHelpDark: "Dark themes are available in dark mode, switch to light mode to view light themes",
  fontFamily: "Font family",
  fontSize: "Font size",
  currentSettings: "Current settings",
  font: "Font",
  resetDefaults: "Reset defaults",
  cancel: "Cancel",
  apply: "Apply settings",
};

type Copy = typeof en;

const zh: Copy = {
  line: "行",
  lines: "行",
  format: "格式化",
  formatting: "格式化中...",
  edit: "编辑",
  preview: "预览",
  noCode: "暂无代码内容...",
  noCodeToFormat: "没有代码需要格式化",
  placeholder: "-- 在此输入您的 SQL 查询语句\n-- 例如：SELECT * FROM users WHERE active = true;",
  themeSettings: "主题设置",
  editorThemeSettings: "编辑器主题设置",
  appliesImmediately: "设置立即应用",
  lightMode: "浅色模式",
  darkMode: "暗色模式",
  editorTheme: "编辑器主题",
  lightTheme: "浅色主题",
  darkTheme: "暗色主题",
  themeHelpLight: "浅色模式下可选择浅色主题，切换到暗色模式可查看暗色主题",
  themeHelpDark: "暗色模式下可选择暗色主题，切换到浅色模式可查看浅色主题",
  fontFamily: "字体",
  fontSize: "字体大小",
  currentSettings: "当前设置",
  font: "字体",
  resetDefaults: "重置默认值",
  cancel: "取消",
  apply: "应用设置",
};

export function editorCopy(language: string): Copy {
  return language === "zh" ? zh : en;
}
